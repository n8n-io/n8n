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
} from './serve-ready.mjs';

const build = process.argv.includes('--build');
const port = servePort();
const healthPath = serveHealthPath();
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

if (!(await waitForHealth(port, healthPath))) {
	console.error(`\nBackend did not answer ${healthPath} within 2 min — check ${LOG}`);
	process.exit(1);
}

reportUp(port, shareWithOrg(port));
