#!/usr/bin/env node
// Bring the app up with one command. This script installs missing dependencies,
// builds if you ask, starts the backend and editor, waits for both, and prints their URLs.
//
//   pnpm dev:up            install if needed, start dev:be and dev:fe:editor
//   pnpm dev:up --build    also run `pnpm build` first
//
// Open the editor on port 8080 for frontend hot reload. In a Codespace, run
// `pnpm session tunnel 5678 8080` from your laptop before opening it.
//
// For a PR preview instead of your own session, use `pnpm preview up <pr>`.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, openSync } from 'node:fs';

import {
	reportUp,
	serveHealthPath,
	servePort,
	shareWithOrg,
	waitForHealth,
} from './codespace-preview/serve-ready.mjs';

const build = process.argv.includes('--build');
const port = servePort();
const editorPort = process.env.N8N_EDITOR_PORT || '8080';
const healthPath = serveHealthPath();
const LOG = '/tmp/n8n-dev-be.log';
const EDITOR_LOG = '/tmp/n8n-dev-fe.log';
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
console.log(`Starting editor (pnpm dev:fe:editor; log: ${EDITOR_LOG})…`);
const editorFd = openSync(EDITOR_LOG, 'a');
spawn('pnpm', ['dev:fe:editor'], {
	detached: true,
	stdio: ['ignore', editorFd, editorFd],
}).unref();

if (!(await waitForHealth(port, healthPath))) {
	console.error(`\nBackend did not answer ${healthPath} within 2 min — check ${LOG}`);
	process.exit(1);
}

if (!(await waitForHealth(editorPort, '/'))) {
	console.error(`\nEditor did not answer / within 2 min — check ${EDITOR_LOG}`);
	process.exit(1);
}

const shared = shareWithOrg(port);
reportUp(port, shared);
console.log(`Editor (hot reload): http://localhost:${editorPort}`);
if (shared.name)
	console.log(`Open it from your laptop with \`pnpm session tunnel ${port} ${editorPort}\`.`);
