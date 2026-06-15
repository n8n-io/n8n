#!/usr/bin/env node
/**
 * Token- and memory-friendly fresh-checkout setup/verify for agents.
 *
 * Runs install → build → test in one process and surfaces only a compact
 * summary, so a fresh agent (cat-bot, Claude Code, a new hire) can verify a
 * checkout without burning context tokens on tens of thousands of lines of
 * pnpm/turbo/vitest output. Every spawned Node process is capped via
 * NODE_OPTIONS=--max-old-space-size and turbo concurrency is capped so total
 * resident memory stays bounded on a 6GB box.
 *
 * Usage:
 *   pnpm agent:setup [all|install|build|test] [flags]
 *   node scripts/agent-setup.mjs all --mem 6144 --concurrency 4
 *
 * Exit codes: 0 = all steps pass, 1 = a step failed, 2 = invalid arguments.
 *
 * See DEVP-367 for design notes.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, openSync, statSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const VALID_STEPS = ['all', 'install', 'build', 'test'];

const USAGE = `Usage: pnpm agent:setup [all|install|build|test] [flags]

Steps:
  all       install → build → test (default; stops at first failure)
  install   pnpm install --frozen-lockfile
  build     turbo run build
  test      turbo run test (full suite)

Flags:
  --mem <MB>          per-process old-space cap (default 6144, matches CI)
  --concurrency <n>   turbo concurrency for build/test (default 4)
  --tail <n>          lines of the failing log to print on failure (default 60)
  --json              emit only the JSON summary to stdout
  --log-dir <path>    write logs and summary.json here (default .agent-setup/)
  -h, --help          show this help

All step output streams to <log-dir>/<step>.log. A machine-readable
<log-dir>/summary.json is always written.
`;

function fail(msg) {
	process.stderr.write(`agent-setup: ${msg}\n`);
	process.exit(2);
}

let values;
let positionals;
try {
	({ values, positionals } = parseArgs({
		options: {
			mem: { type: 'string', default: '6144' },
			concurrency: { type: 'string', default: '4' },
			tail: { type: 'string', default: '60' },
			json: { type: 'boolean', default: false },
			'log-dir': { type: 'string' },
			help: { type: 'boolean', default: false, short: 'h' },
		},
		allowPositionals: true,
		strict: true,
	}));
} catch (err) {
	fail(err.message);
}

if (values.help) {
	process.stdout.write(USAGE);
	process.exit(0);
}

if (positionals.length > 1) {
	fail(`unexpected extra arguments: ${positionals.slice(1).join(' ')}`);
}
const step = positionals[0] ?? 'all';
if (!VALID_STEPS.includes(step)) {
	fail(`unknown step "${step}" — must be one of: ${VALID_STEPS.join(', ')}`);
}

const mem = Number(values.mem);
const concurrency = Number(values.concurrency);
const tailLines = Number(values.tail);
if (!Number.isInteger(mem) || mem <= 0) fail('--mem must be a positive integer (MB)');
if (!Number.isInteger(concurrency) || concurrency <= 0) {
	fail('--concurrency must be a positive integer');
}
if (!Number.isInteger(tailLines) || tailLines < 0) {
	fail('--tail must be a non-negative integer');
}

const logDir = values['log-dir']
	? resolve(process.cwd(), values['log-dir'])
	: resolve(REPO_ROOT, '.agent-setup');
mkdirSync(logDir, { recursive: true });

// Call turbo directly via `pnpm exec` rather than the wrapper scripts so a
// user-supplied `--concurrency` isn't silently fought by a flag baked into a
// wrapper.
const PLAN = {
	install: { cmd: 'pnpm', args: ['install', '--frozen-lockfile'] },
	build: {
		cmd: 'pnpm',
		args: ['exec', 'turbo', 'run', 'build', `--concurrency=${concurrency}`],
	},
	test: {
		cmd: 'pnpm',
		args: ['exec', 'turbo', 'run', 'test', `--concurrency=${concurrency}`],
	},
};

const stepsToRun = step === 'all' ? ['install', 'build', 'test'] : [step];

const NODE_OPTS = `--max-old-space-size=${mem}`;
const childEnv = {
	...process.env,
	NODE_OPTIONS: process.env.NODE_OPTIONS
		? `${process.env.NODE_OPTIONS} ${NODE_OPTS}`
		: NODE_OPTS,
	FORCE_COLOR: '0',
};

function elapsed(start) {
	return Math.max(1, Math.round((Date.now() - start) / 1000));
}

function runStep(name) {
	return new Promise((res) => {
		const { cmd, args } = PLAN[name];
		const logPath = resolve(logDir, `${name}.log`);
		const start = Date.now();
		const logFd = openSync(logPath, 'w');

		if (!values.json) process.stdout.write(`▶ ${name.padEnd(7)} `);

		const child = spawn(cmd, args, {
			cwd: REPO_ROOT,
			env: childEnv,
			stdio: ['ignore', logFd, logFd],
		});

		child.once('error', (err) => {
			const seconds = elapsed(start);
			if (!values.json) process.stdout.write(`✗ failed to spawn (${err.message})\n`);
			res({ name, ok: false, seconds, log: logPath, error: err.message });
		});

		child.once('exit', (code, signal) => {
			const seconds = elapsed(start);
			const ok = code === 0;
			if (!values.json) {
				const reason = signal ?? `exit ${code}`;
				process.stdout.write(ok ? `✓ ${seconds}s\n` : `✗ ${seconds}s (${reason})\n`);
			}
			res({ name, ok, seconds, log: logPath, exitCode: code, signal });
		});
	});
}

async function tailFile(path, n) {
	if (n <= 0) return '';
	const content = await readFile(path, 'utf8');
	const lines = content.split(/\r?\n/);
	while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
	return lines.slice(-n).join('\n');
}

async function main() {
	const results = [];
	for (const name of stepsToRun) {
		const r = await runStep(name);
		try {
			r.logKb = Math.round(statSync(r.log).size / 1024);
		} catch {
			r.logKb = 0;
		}
		results.push(r);
		if (!r.ok) break;
	}

	const failed = results.find((r) => !r.ok);
	const failTail = failed ? await tailFile(failed.log, tailLines) : undefined;

	const summary = {
		ok: !failed,
		steps: results.map(({ name, ok, seconds, log, logKb }) => ({
			name,
			ok,
			seconds,
			log,
			logKb,
		})),
		...(failTail !== undefined && { failTail }),
	};
	const summaryPath = resolve(logDir, 'summary.json');
	writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');

	if (values.json) {
		process.stdout.write(JSON.stringify(summary) + '\n');
	} else if (failed) {
		process.stdout.write(`\n--- last ${tailLines} lines of ${failed.log} ---\n`);
		if (failTail) process.stdout.write(failTail + '\n');
		process.stdout.write(`(full log: ${failed.log})\n`);
		process.stdout.write(`(summary:  ${summaryPath})\n`);
	} else {
		process.stdout.write(`(summary: ${summaryPath})\n`);
	}

	process.exit(summary.ok ? 0 : 1);
}

main().catch((err) => {
	process.stderr.write(`agent-setup: ${err.stack ?? err.message}\n`);
	process.exit(1);
});
