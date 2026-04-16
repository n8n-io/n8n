#!/usr/bin/env node
/**
 * Thin wrapper around `run-local-isolated.mjs` that pre-fills the env vars
 * the instance-ai module needs at boot. Behaves exactly like
 * `pnpm test:local:isolated tests/e2e/instance-ai [args]`, but you don't have
 * to remember (or re-type) the JSON.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... pnpm test:local:instance-ai
 *   ANTHROPIC_API_KEY=sk-ant-... pnpm test:local:instance-ai --grep "preview"
 *   ANTHROPIC_API_KEY=sk-ant-... pnpm test:local:instance-ai instance-ai-workflow-preview.spec.ts
 *
 * With proxy (enables record/replay against local server):
 *   ANTHROPIC_API_KEY=sk-ant-... pnpm test:local:instance-ai --proxy
 *   pnpm test:local:instance-ai --proxy   # replay mode (no API key)
 *
 * All extra args flow through to `playwright test`. If you don't pass an
 * explicit path, the runner defaults to the whole `tests/e2e/instance-ai`
 * directory.
 */

import { execSync, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOCKSERVER_IMAGE = 'mockserver/mockserver:5.15.0';
const MOCKSERVER_PORT = 1080;

const proxyEnabled = process.argv.includes('--proxy');

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey && !proxyEnabled) {
	console.error(
		'Error: ANTHROPIC_API_KEY is not set.\n' +
			'Export a real key before running, e.g.:\n' +
			'  export ANTHROPIC_API_KEY=sk-ant-...\n' +
			'  pnpm test:local:instance-ai\n\n' +
			'Or use --proxy to replay recorded expectations:\n' +
			'  pnpm test:local:instance-ai --proxy',
	);
	process.exit(1);
}

// --- Proxy lifecycle helpers ---

const proxyContainerName = `n8n-local-proxy-${process.pid}`;
let proxyUrl = '';

function startProxyContainer() {
	console.log('[proxy] Starting MockServer container...');
	try {
		execSync(
			`docker run -d --name ${proxyContainerName} -p 0:${MOCKSERVER_PORT} ${MOCKSERVER_IMAGE}`,
			{ stdio: 'pipe' },
		);
	} catch (error) {
		console.error(
			'[proxy] Failed to start MockServer container.\n' +
				'Ensure Docker is running and the image is available.\n' +
				`You can pull it manually: docker pull ${MOCKSERVER_IMAGE}`,
		);
		process.exit(1);
	}

	// Read the mapped host port
	const portOutput = execSync(`docker port ${proxyContainerName} ${MOCKSERVER_PORT}`, {
		encoding: 'utf8',
	}).trim();
	// Output is like "0.0.0.0:55123" or ":::55123" — extract the port
	const mappedPort = portOutput.split(':').pop();
	proxyUrl = `http://localhost:${mappedPort}`;
	console.log(`[proxy] MockServer running at ${proxyUrl}`);
}

function waitForProxy(timeoutMs = 30_000) {
	const deadline = Date.now() + timeoutMs;
	console.log('[proxy] Waiting for MockServer to be ready...');
	while (Date.now() < deadline) {
		try {
			execSync(`curl -sf -X PUT ${proxyUrl}/mockserver/status`, { stdio: 'pipe' });
			console.log('[proxy] MockServer ready');
			return;
		} catch {
			execSync('sleep 0.5', { stdio: 'pipe' });
		}
	}
	console.error(`[proxy] MockServer did not become ready within ${timeoutMs}ms`);
	stopProxyContainer();
	process.exit(1);
}

function stopProxyContainer() {
	try {
		execSync(`docker rm -f ${proxyContainerName}`, { stdio: 'pipe' });
		console.log('[proxy] MockServer container removed');
	} catch {
		// Container may already be gone
	}
}

// --- Main ---

if (proxyEnabled) {
	startProxyContainer();
	waitForProxy();

	// Ensure cleanup on exit
	process.on('SIGINT', () => {
		stopProxyContainer();
		process.exit(130);
	});
	process.on('SIGTERM', () => {
		stopProxyContainer();
		process.exit(143);
	});
	process.on('exit', () => {
		stopProxyContainer();
	});
}

// Layer instance-ai env on top of any caller-supplied N8N_TEST_ENV so power
// users can still pin a different model or override flags.
const callerTestEnv = (() => {
	try {
		return process.env.N8N_TEST_ENV ? JSON.parse(process.env.N8N_TEST_ENV) : {};
	} catch {
		console.warn('[run-local-instance-ai] Ignoring malformed N8N_TEST_ENV.');
		return {};
	}
})();

const testEnv = {
	N8N_ENABLED_MODULES: 'instance-ai',
	N8N_INSTANCE_AI_MODEL: 'anthropic/claude-sonnet-4-6',
	N8N_INSTANCE_AI_MODEL_API_KEY: apiKey ?? 'mock-anthropic-api-key',
	N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED: 'true',
	// When proxy is enabled, route n8n's outbound HTTP through MockServer
	...(proxyEnabled
		? {
				HTTP_PROXY: proxyUrl,
				HTTPS_PROXY: proxyUrl,
				NODE_TLS_REJECT_UNAUTHORIZED: '0',
			}
		: {}),
	...callerTestEnv,
};

// Strip --proxy from args passed to playwright
const userArgs = process.argv.slice(2).filter((a) => a !== '--proxy');
const hasExplicitPath = userArgs.some((a) => a.startsWith('tests/') || a.endsWith('.spec.ts'));

const isolatedScript = path.join(__dirname, 'run-local-isolated.mjs');
const args = [isolatedScript];
if (!hasExplicitPath) args.push('tests/e2e/instance-ai');
args.push(...userArgs);

const result = spawnSync('node', args, {
	stdio: 'inherit',
	env: {
		...process.env,
		N8N_TEST_ENV: JSON.stringify(testEnv),
		...(proxyEnabled ? { PROXY_SERVER_URL: proxyUrl } : {}),
	},
});

process.exit(result.status ?? 1);
