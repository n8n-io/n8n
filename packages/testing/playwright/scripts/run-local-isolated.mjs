#!/usr/bin/env node
/**
 * Run Playwright e2e tests against a local n8n build with full isolation
 * from your dev environment.
 *
 * What this gives you over `pnpm test:local`:
 *   - **Random free OS port** for n8n's HTTP server and the task-runner
 *     broker, so multiple instances can run in parallel without colliding on
 *     `5678`/`5679`. Pin a port with `N8N_BASE_URL=http://localhost:5680 …`
 *     when you need a stable URL for browser inspection.
 *   - **Throwaway `N8N_USER_FOLDER`** under the OS temp dir (cleaned up on
 *     exit). Its `database.sqlite` is fully isolated from your local
 *     `~/.n8n` install.
 *   - **Self-managed n8n process** with a real readiness check against
 *     `/rest/e2e/reset` (Playwright's default `webServer` favicon check is
 *     racy with slower module startups). Sets `PLAYWRIGHT_SKIP_WEBSERVER=true`
 *     so Playwright doesn't race to spawn its own n8n.
 *   - **Container-only tests included.** Sets `PLAYWRIGHT_ALLOW_CONTAINER_ONLY=true`
 *     so `@capability:*`, `@licensed`, and `@db:reset` tests are picked up by
 *     the local `e2e` project. Their fixtures are responsible for detecting
 *     the missing container and skipping or falling back.
 *   - **Process-group cleanup.** Spawns n8n `detached: true` and SIGTERMs the
 *     whole tree on exit, so `node ./n8n` and the task-runner don't get
 *     orphaned to PID 1.
 *
 * Usage:
 *   pnpm test:local:isolated [<playwright args>]
 *   pnpm test:local:isolated tests/e2e/credentials/crud.spec.ts
 *   pnpm test:local:isolated --grep "preview"
 *
 * Pass extra n8n env via `N8N_TEST_ENV` (the same convention `test:local`
 * uses). For example, to enable an experimental module before n8n boots:
 *
 *   N8N_TEST_ENV='{"N8N_ENABLED_MODULES":"my-module"}' \
 *     pnpm test:local:isolated tests/e2e/my-module
 */

import { spawn, spawnSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { createServer } from 'net';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const playwrightDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(playwrightDir, '../../..');

/** Ask the OS for a free TCP port. Race-y by nature (the port can be claimed
 *  between close() and the consumer's bind), but acceptable for a dev script. */
function getFreePort() {
	return new Promise((resolve, reject) => {
		const srv = createServer();
		srv.unref();
		srv.on('error', reject);
		srv.listen(0, '127.0.0.1', () => {
			const { port } = srv.address();
			srv.close(() => resolve(port));
		});
	});
}

// Honour an explicit URL if pinned; otherwise grab two free ports — one for
// n8n's HTTP server, one for the task-runner broker (default 5679).
let backendUrl;
let port;
let brokerPort;
if (process.env.N8N_BASE_URL) {
	backendUrl = process.env.N8N_BASE_URL;
	port = new URL(backendUrl).port || '80';
	brokerPort = process.env.N8N_RUNNERS_BROKER_PORT ?? String(await getFreePort());
} else {
	port = String(await getFreePort());
	brokerPort = String(await getFreePort());
	backendUrl = `http://localhost:${port}`;
}

// Throwaway `~/.n8n`-equivalent. SQLite lives at `${userFolder}/database.sqlite`,
// so this also isolates the DB from any local n8n install.
const userFolder = mkdtempSync(path.join(os.tmpdir(), 'n8n-test-isolated-'));

// Caller-supplied n8n env (same convention as `pnpm test:local`).
const callerTestEnv = (() => {
	try {
		return process.env.N8N_TEST_ENV ? JSON.parse(process.env.N8N_TEST_ENV) : {};
	} catch {
		console.warn('[run-local-isolated] Ignoring malformed N8N_TEST_ENV.');
		return {};
	}
})();

const n8nEnv = {
	...process.env,
	E2E_TESTS: 'true',
	N8N_PORT: port,
	N8N_RUNNERS_BROKER_PORT: brokerPort,
	N8N_USER_FOLDER: userFolder,
	N8N_LOG_LEVEL: process.env.N8N_LOG_LEVEL ?? 'info',
	N8N_RESTRICT_FILE_ACCESS_TO: '',
	...callerTestEnv,
};

console.log(`[run-local-isolated] starting n8n on ${backendUrl}`);
console.log(`[run-local-isolated]   user folder: ${userFolder}`);
console.log(`[run-local-isolated]   broker port: ${brokerPort}`);

// `detached: true` puts n8n in its own process group so we can SIGTERM the
// whole tree (pnpm + sh + node ./n8n + task-runner) on shutdown — without
// this, killing pnpm orphans the actual n8n process to PID 1.
const n8n = spawn('pnpm', ['start'], {
	cwd: repoRoot,
	env: n8nEnv,
	stdio: ['ignore', 'inherit', 'inherit'],
	detached: true,
});

let shuttingDown = false;
function cleanupTempDir() {
	try {
		rmSync(userFolder, { recursive: true, force: true });
	} catch {
		// best-effort
	}
}

function shutdown(code) {
	if (shuttingDown) return;
	shuttingDown = true;
	try {
		// Negative pid → signal the whole process group.
		process.kill(-n8n.pid, 'SIGTERM');
	} catch {
		// Group may already be gone.
	}
	cleanupTempDir();
	process.exit(code);
}

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));
process.on('exit', () => {
	if (!shuttingDown && n8n.pid) {
		try {
			process.kill(-n8n.pid, 'SIGTERM');
		} catch {
			// ignore
		}
		cleanupTempDir();
	}
});
n8n.on('exit', (code, signal) => {
	if (!shuttingDown) {
		console.error(`[run-local-isolated] n8n exited unexpectedly (code=${code} signal=${signal})`);
		cleanupTempDir();
		process.exit(1);
	}
});

// Poll an actual REST route, not just /favicon.ico, so we know controllers are
// registered. We POST `/rest/e2e/reset` with no body — a registered route
// returns 4xx/5xx, an unregistered one returns 404 with an HTML body.
async function waitForN8n(timeoutMs = 120_000) {
	const deadline = Date.now() + timeoutMs;
	let lastStatus = 'connection refused';
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`${backendUrl}/rest/e2e/reset`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{}',
			});
			lastStatus = `HTTP ${res.status}`;
			// 404 with HTML => routes not loaded yet. Anything 2xx/4xx/5xx with
			// JSON body means E2EController is registered and listening.
			if (res.status !== 404) return;
			const text = await res.text();
			if (!text.includes('Cannot POST')) return;
		} catch (err) {
			lastStatus = err.message ?? String(err);
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error(`n8n did not become ready within ${timeoutMs}ms (last: ${lastStatus})`);
}

try {
	await waitForN8n();
	console.log('[run-local-isolated] n8n ready, launching playwright ...');
} catch (err) {
	console.error(`[run-local-isolated] ${err.message}`);
	shutdown(1);
}

const playwrightEnv = {
	...process.env,
	N8N_BASE_URL: backendUrl,
	RESET_E2E_DB: 'true',
	PLAYWRIGHT_ALLOW_CONTAINER_ONLY: 'true',
	// We've already started + verified n8n; tell playwright.config.ts not to
	// race us by spawning its own.
	PLAYWRIGHT_SKIP_WEBSERVER: 'true',
};

// Default scope: full e2e suite. Any CLI args (paths, --grep, --headed, etc.)
// flow through unchanged. If the caller didn't pass an explicit test path,
// fall back to `tests/e2e`.
const userArgs = process.argv.slice(2);
const hasExplicitPath = userArgs.some((a) => a.startsWith('tests/') || a.endsWith('.spec.ts'));
const args = ['exec', 'playwright', 'test', '--project=e2e'];
if (!hasExplicitPath) args.push('tests/e2e');
args.push(...userArgs);

console.log(`[run-local-isolated] pnpm ${args.join(' ')}`);
const result = spawnSync('pnpm', args, {
	cwd: playwrightDir,
	stdio: 'inherit',
	env: playwrightEnv,
});

shutdown(result.status ?? 1);
