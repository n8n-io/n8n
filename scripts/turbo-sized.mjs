#!/usr/bin/env node
/**
 * Runs a turbo task with the RAM-aware sizing from `scripts/turbo-sizing.mjs`.
 *
 * Turbo's default concurrency starts about ten type-checking workers at once.
 * Each one peaks between 2.3 GB and 6.9 GB, so `pnpm build` and
 * `pnpm typecheck` made a 16 GB laptop swap. This wrapper caps both the
 * concurrency and the per-process old-space size before it calls turbo.
 *
 * Usage:
 *   node scripts/turbo-sized.mjs <task> [extra turbo arguments...]
 *   node scripts/turbo-sized.mjs build --filter=n8n
 *   node scripts/turbo-sized.mjs typecheck --concurrency=1
 *
 * Every extra argument reaches turbo unchanged, so `pnpm build --concurrency=5`
 * still means concurrency 5. Under CI the wrapper changes nothing at all,
 * because each workflow pins its own concurrency and memory cap per job.
 *
 * Set `N8N_TURBO_SIZING_DEBUG=1` to print the sizing decision.
 *
 * See N8N-383 for design notes.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { CONCURRENCY_ENV_VAR, readMachine, resolveSizing } from './turbo-sizing.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '..');

/**
 * Prefers the workspace binary, so `node scripts/turbo-sized.mjs build` works
 * outside a pnpm script, where node_modules/.bin is not on PATH.
 */
function turboBin() {
	const local = resolve(
		REPO_ROOT,
		'node_modules/.bin',
		process.platform === 'win32' ? 'turbo.cmd' : 'turbo',
	);
	return existsSync(local) ? local : 'turbo';
}

const [task, ...passThrough] = process.argv.slice(2);
if (!task || task === '-h' || task === '--help') {
	process.stderr.write('Usage: node scripts/turbo-sized.mjs <task> [extra turbo arguments...]\n');
	process.exit(task ? 0 : 2);
}

const machine = readMachine();
const sizing = resolveSizing({ args: passThrough, env: process.env, machine });

const turboArgs = ['run', task, ...sizing.args];
const env = { ...process.env, NODE_OPTIONS: sizing.nodeOptions };

if (process.env.N8N_TURBO_SIZING_DEBUG) {
	process.stderr.write(
		`turbo-sized: ${machine.totalMemMb} MB RAM, ${machine.cpuCount} CPU ` +
			`-> concurrency ${sizing.concurrency ?? 'turbo default'} (${sizing.source}), ` +
			`NODE_OPTIONS="${env.NODE_OPTIONS ?? ''}"\n` +
			`turbo-sized: override with --concurrency=<n> or ${CONCURRENCY_ENV_VAR}=<n>\n`,
	);
}

const child = spawn(turboBin(), turboArgs, {
	cwd: REPO_ROOT,
	env,
	stdio: 'inherit',
	shell: process.platform === 'win32',
});

child.once('error', (err) => {
	process.stderr.write(`turbo-sized: cannot start turbo: ${err.message}\n`);
	process.exit(1);
});

child.once('exit', (code, signal) => {
	// Report a signalled child the way a shell does, so CI still sees a failure.
	if (signal) process.exit(1);
	process.exit(code ?? 1);
});
