#!/usr/bin/env node
// Bring the app up with one command. This script installs missing dependencies,
// builds if you ask, starts the backend, waits for health, and prints the URL.
//
//   pnpm dev:up            install if needed, start dev:be, print the URL
//   pnpm dev:up --build    also run `pnpm build` first
//
// dev:be serves the editor from the `dist` build. A frontend change appears only
// after `--build` and this restart. For live frontend hot reload, use
// `pnpm dev:fe:editor` on 8080. That path needs `pnpm session tunnel 5678 8080`.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, openSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

import { codespaceName, forwardingDomain } from './codespace-env.mjs';

const build = process.argv.includes('--build');
const port = process.env.N8N_PORT ?? '5678';
// Probe the same health path the backend serves (defaults to /healthz).
const healthPath = process.env.N8N_ENDPOINT_HEALTH
	? `/${process.env.N8N_ENDPOINT_HEALTH.replace(/^\//, '')}`
	: '/healthz';
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
		const res = await fetch(`http://127.0.0.1:${port}${healthPath}`, {
			signal: AbortSignal.timeout(5000),
		});
		if (res.ok) {
			healthy = true;
			break;
		}
	} catch {}
	await sleep(3000);
}

const name = codespaceName();
const url = name ? `https://${name}-${port}.${forwardingDomain()}` : `http://localhost:${port}`;
if (!healthy) {
	console.error(`\nBackend did not answer ${healthPath} within 2 min — check ${LOG}`);
	process.exit(1);
}

// In a codespace, share the port with the org. Then any n8n member can open the
// URL. GitHub makes every port private again at each start, so set it here. If
// `gh` fails, print the reason and continue.
let orgShared = false;
let shareError;
if (name) {
	try {
		execFileSync('gh', ['codespace', 'ports', 'visibility', `${port}:org`, '-c', name], {
			stdio: ['ignore', 'ignore', 'pipe'],
		});
		orgShared = true;
	} catch (error) {
		const stderr = error.stderr?.toString().trim();
		shareError = (stderr || error.message).split('\n').pop();
	}
}

console.log(`\nUp: ${url}`);
if (name)
	console.log(
		orgShared
			? '(org-visible — any n8n member signed into GitHub can open it)'
			: `(still private: ${shareError} — retry with \`gh codespace ports visibility ${port}:org -c ${name}\`)`,
	);
else if (existsSync('/workspaces/.codespaces'))
	console.log(
		`(on a codespace but the box name did not resolve, so ${port} was not shared with the org — see .devcontainer/codespaces/README.md)`,
	);
