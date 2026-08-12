#!/usr/bin/env node
// Bring the app up for viewing in one command: ensure deps, (optionally) build,
// start the backend, wait for health, print the URL.
//
//   pnpm dev:up            deps if missing → dev:be → print URL   (backend hot-reloads)
//   pnpm dev:up --build    also `pnpm build` first (needed for frontend edits to show)
//
// dev:be serves the editor from its existing `dist` build, so frontend changes
// only appear after `--build` + this restart. For live frontend HMR use
// `pnpm dev:fe:editor` on 8080 instead (needs `pnpm session tunnel 5678 8080`).
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, openSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const build = process.argv.includes('--build');
const port = process.env.N8N_PORT ?? '5678';
const LOG = '/tmp/n8n-dev-be.log';
const BUILD_LOG = '/tmp/dev-up-build.log';

if (!existsSync('node_modules') || !existsSync('packages/cli/node_modules')) {
	console.log('Installing dependencies…');
	execFileSync('pnpm', ['install'], { stdio: 'inherit' });
}

if (build) {
	console.log(`Building (turbo cache — fast when warm; log: ${BUILD_LOG})…`);
	const fd = openSync(BUILD_LOG, 'w');
	try {
		execFileSync('pnpm', ['build'], { stdio: ['ignore', fd, fd] });
	} catch {
		console.error(`Build failed — see ${BUILD_LOG}:`);
		execFileSync('tail', ['-n', '30', BUILD_LOG], { stdio: 'inherit' });
		process.exit(1);
	}
}

console.log(`Starting backend (pnpm dev:be; log: ${LOG})…`);
const fd = openSync(LOG, 'a');
spawn('pnpm', ['dev:be'], { detached: true, stdio: ['ignore', fd, fd] }).unref();

const deadline = Date.now() + 120_000;
let healthy = false;
while (Date.now() < deadline) {
	try {
		const res = await fetch(`http://127.0.0.1:${port}/healthz`, {
			signal: AbortSignal.timeout(5000),
		});
		if (res.ok) {
			healthy = true;
			break;
		}
	} catch {}
	await sleep(3000);
}

const name = process.env.CODESPACE_NAME;
const url = name ? `https://${name}-${port}.app.github.dev` : `http://localhost:${port}`;
if (healthy) {
	console.log(`\nUp: ${url}`);
	if (name) console.log('(private forwarded port — opens for you when signed into GitHub)');
} else {
	console.error(`\nBackend did not answer /healthz within 2 min — check ${LOG}`);
	process.exit(1);
}
