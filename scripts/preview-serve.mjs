#!/usr/bin/env node
// Serve the checked-out tree as a preview instance, from inside a codespace.
// Idempotent: it stops any previous preview backend first, so `preview up` and
// `preview refresh` share this one entry point.
//
//   pnpm preview:serve
//
// dev:up detaches the backend, which leaves nothing for a refresh to stop. So
// this owns the lifecycle instead: dev:be runs in a named tmux session.
import { execFileSync, spawnSync } from 'node:child_process';
import { openSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import { codespaceSecret } from './codespace-env.mjs';
import { envForSlugs } from './preview-labels.mjs';
import { serveHealthPath, servePort, waitForHealth, waitForReady } from './serve-ready.mjs';

const SESSION = 'n8n-preview';
const BUILD_LOG = '/tmp/preview-build.log';
const BE_LOG = '/tmp/preview-be.log';
// The preview box has 2 cores and 8gb. Cap both, for the reason spelled out in
// scripts/agent-setup.mjs: unbounded turbo concurrency is what exhausts a small box.
const CONCURRENCY = process.env.PREVIEW_BUILD_CONCURRENCY ?? '2';
// A fresh instance opens on the owner-setup wall, which is friction for a reviewer
// who only wants to look at the UI. Running with no auth is not an option: the
// `skipInstanceOwnerSetup` setting was removed in migration 1681134145997. So seed a
// known owner instead. These are not secrets — the security boundary is the
// org-visible forwarded port, which already requires a GitHub sign-in and n8n org
// membership. Never point this at anything publicly reachable.
// The password must satisfy passwordSchema: 8-64 chars, >=1 digit, >=1 uppercase.
const OWNER_EMAIL = process.env.PREVIEW_OWNER_EMAIL ?? 'preview@n8n.io';
const OWNER_PASSWORD = process.env.PREVIEW_OWNER_PASSWORD ?? 'PreviewInstance1';
const HEAP_MB = process.env.PREVIEW_BUILD_HEAP_MB ?? '6144';
// Resolve from this file, not cwd, so the tmux command lands in the right tree.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = servePort();
const healthPath = serveHealthPath();

const tmux = (...args) => spawnSync('tmux', args, { stdio: 'ignore' });

// Stop the old backend before rebuilding: it frees the port, and it stops the
// previous build being served alongside newly written assets.
tmux('kill-session', '-t', SESSION);

console.log(`Building (turbo cache — fast when warm; log: ${BUILD_LOG})…`);
const buildFd = openSync(BUILD_LOG, 'w');
try {
	execFileSync('pnpm', ['exec', 'turbo', 'run', 'build', `--concurrency=${CONCURRENCY}`], {
		cwd: repoRoot,
		stdio: ['ignore', buildFd, buildFd],
		// Appended last so it wins over an inherited value: node takes the final flag.
		env: {
			...process.env,
			NODE_OPTIONS: [process.env.NODE_OPTIONS, `--max-old-space-size=${HEAP_MB}`]
				.filter(Boolean)
				.join(' '),
		},
	});
} catch {
	console.error(`Build failed — see ${BUILD_LOG}:`);
	execFileSync('tail', ['-n', '30', BUILD_LOG], { stdio: 'inherit' });
	process.exit(1);
}

// One-click sign-in, so a reviewer lands in the editor rather than a login form.
// N8N_ADDITIONAL_NON_UI_ROUTES is required: `n8n.ready` runs after the SPA catch-all
// is registered, so without it historyApiHandler answers /preview-signin with
// index.html. dev:be runs turbo with --env-mode=loose, which passes these through.
//
// Set with tmux `-e` rather than interpolated into the command: tmux does not
// inherit the caller's environment for arbitrary variables (the same trap the
// codespaces README documents), and this keeps the values out of a shell string.
const SIGNIN_ROUTE = 'preview-signin';
const signinEnv = [
	`EXTERNAL_HOOK_FILES=${repoRoot}/.devcontainer/preview/preview-signin-hook.cjs`,
	`N8N_ADDITIONAL_NON_UI_ROUTES=${SIGNIN_ROUTE}`,
	'N8N_PREVIEW_SIGNIN=1',
	`PREVIEW_OWNER_EMAIL=${OWNER_EMAIL}`,
	`PREVIEW_OWNER_PASSWORD=${OWNER_PASSWORD}`,
].flatMap((pair) => ['-e', pair]);

// `preview.mjs` passes the PR's preview:* label slugs. Resolve them here, where a
// codespace secret is readable, and apply them before the sign-in variables so a
// toggle can never displace the preview's own wiring.
const slugs = (process.env.PREVIEW_LABELS ?? '').split(',').filter(Boolean);
const { env: labelEnv, warnings } = envForSlugs(slugs, codespaceSecret);
for (const warning of warnings) console.warn(warning);
if (labelEnv.length)
	// Names only: one of these values is a licence key.
	console.log(
		`Applying preview labels: ${slugs.join(', ')} → ${labelEnv.map((pair) => pair.split('=')[0]).join(', ')}`,
	);

console.log(`Starting backend in tmux session '${SESSION}' (log: ${BE_LOG})…`);
const started = tmux(
	'new',
	'-d',
	'-s',
	SESSION,
	...labelEnv.flatMap((pair) => ['-e', pair]),
	...signinEnv,
	`cd ${repoRoot} && exec pnpm dev:be > ${BE_LOG} 2>&1`,
);
if (started.status !== 0) {
	console.error(`Could not start tmux session '${SESSION}'.`);
	process.exit(1);
}

if (!(await waitForHealth(port, healthPath))) {
	console.error(`\nBackend did not answer ${healthPath} within 2 min — check ${BE_LOG}:`);
	execFileSync('tail', ['-n', '30', BE_LOG], { stdio: 'inherit' });
	process.exit(1);
}

// Promote the shell user into the owner so the instance opens on a login page with
// known credentials, not the setup wizard. Idempotent: on a refresh the sqlite file
// survives, the owner already exists, and the endpoint rejects the second attempt.

// The setup endpoint's status cannot tell success from failure: it answers 400 both
// when an owner exists and when the payload is wrong, and 404 while the REST routes
// are still mounting. `showSetupOnFirstLoad` drives the wall a reviewer actually
// hits, so check that instead. Undefined means the answer is not readable yet.
async function setupWallIsUp() {
	try {
		const res = await fetch(`http://127.0.0.1:${port}/rest/settings`, {
			signal: AbortSignal.timeout(15_000),
		});
		if (!res.ok) return undefined;
		const body = await res.json();
		return body?.data?.userManagement?.showSetupOnFirstLoad;
	} catch {
		return undefined;
	}
}

async function postOwnerSetup() {
	try {
		const res = await fetch(`http://127.0.0.1:${port}/rest/owner/setup`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				email: OWNER_EMAIL,
				firstName: 'Preview',
				lastName: 'User',
				password: OWNER_PASSWORD,
			}),
			signal: AbortSignal.timeout(15_000),
		});
		return `HTTP ${res.status} ${(await res.text()).slice(0, 300)}`;
	} catch (error) {
		return `request failed: ${error.message}`;
	}
}

// Retry anyway, as a backstop for anything readiness does not cover, and report
// every attempt: a silent seed failure hands the reviewer a URL that lands on /setup.
async function seedOwner(attempts = 5, delayMs = 3000) {
	for (let attempt = 1; attempt <= attempts; attempt++) {
		const result = await postOwnerSetup();
		console.log(`Owner setup attempt ${attempt}/${attempts} — ${result}`);

		if ((await setupWallIsUp()) === false) {
			console.log(`Owner is set up — sign in as ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
			return;
		}
		if (attempt < attempts) {
			await sleep(delayMs);
		}
	}
	console.error(
		`Owner seeding FAILED: /rest/settings still reports showSetupOnFirstLoad. A reviewer will land on /setup, and /${SIGNIN_ROUTE} will not work. See ${BE_LOG}.`,
	);
}

// /healthz says nothing about the REST API, so seeding straight after it raced the
// controllers and got `Cannot POST /rest/owner/setup`. Wait for readiness first.
if (!(await waitForReady(port, healthPath))) {
	console.error(
		`Backend did not answer ${healthPath}/readiness within 3 min. It is not fully initialized, so the owner seeding below is likely to fail — check ${BE_LOG}.`,

	);
	execFileSync('tail', ['-n', '30', BE_LOG], { stdio: 'inherit'});
	process.exit(1);
}

await seedOwner();
console.log(`One-click sign-in path: /${SIGNIN_ROUTE}`);

// The host shares the port and prints the URL: its gh holds the codespace scope.
console.log(`Ready: the backend answers ${healthPath} on port ${port}.`);
