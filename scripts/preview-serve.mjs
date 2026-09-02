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
import { fileURLToPath } from 'node:url';

import { serveHealthPath, servePort, waitForHealth } from './serve-ready.mjs';

const SESSION = 'n8n-preview';
const BUILD_LOG = '/tmp/preview-build.log';
const BE_LOG = '/tmp/preview-be.log';
// The preview box has 2 cores and 8gb. Cap both, for the reason spelled out in
// scripts/agent-setup.mjs: unbounded turbo concurrency is what exhausts a small box.
const CONCURRENCY = process.env.PREVIEW_BUILD_CONCURRENCY ?? '2';
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

console.log(`Starting backend in tmux session '${SESSION}' (log: ${BE_LOG})…`);
const started = tmux(
	'new',
	'-d',
	'-s',
	SESSION,
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

// The host shares the port and prints the URL: its gh holds the codespace scope.
console.log(`Ready: the backend answers ${healthPath} on port ${port}.`);
