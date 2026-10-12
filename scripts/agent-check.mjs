#!/usr/bin/env node
/** Capture focused checks without sending the full runner output to the agent. */
import { spawn } from 'node:child_process';
import { createReadStream, mkdirSync, openSync, closeSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';

const ROOT = resolve(import.meta.dirname, '..');
const MODES = ['lint', 'typecheck', 'test', 'playwright'];
const HELP = `Usage:
  pnpm agent:lint [--filter <package>] [--json]
  pnpm agent:typecheck [--filter <package>] [--json]
  pnpm agent:test --filter <package> [--script test:unit] -- <test-file> [runner args]
  pnpm agent:playwright [--script test:local] -- <spec-file> [runner args]

Options: --filter <package>, --script <test script>, --log-dir <path>, --json, --help
Use -- to pass test paths and runner flags unchanged. Do not use watch or UI scripts.
Each run saves its full output and summary.json in a unique .agent-setup/checks/ directory.
The console shows only the result and a short failure excerpt.
`;

function fail(message) {
	process.stderr.write(`agent-check: ${message}\n${HELP}`);
	process.exit(2);
}

const mode = process.argv[2];
if (!MODES.includes(mode)) fail(`unknown check: ${mode ?? '(none)'}`);

const input = process.argv.slice(3);
const separator = input.indexOf('--');
const optionsArgs = separator < 0 ? input : input.slice(0, separator);
const runnerArgs = separator < 0 ? [] : input.slice(separator + 1);
let values;
try {
	const parsed = parseArgs({
		args: optionsArgs,
		options: {
			filter: { type: 'string' },
			script: { type: 'string' },
			'log-dir': { type: 'string' },
			json: { type: 'boolean', default: false },
			help: { type: 'boolean', default: false, short: 'h' },
		},
		strict: true,
	});
	values = parsed.values;
} catch (error) {
	fail(error.message);
}

if (values.help) {
	process.stdout.write(HELP);
	process.exit(0);
}
if (mode === 'playwright' && values.filter) fail('playwright always runs in n8n-playwright');
if (mode === 'test' && !values.filter) fail('Vitest needs an owning package (--filter)');
if (mode !== 'test' && mode !== 'playwright' && (values.script || runnerArgs.length)) {
	fail('only test commands accept a script or runner arguments');
}
if (['test', 'playwright'].includes(mode) && !runnerArgs.some((arg) => !arg.startsWith('-'))) {
	fail('provide a focused test file after --');
}

const script =
	values.script ?? (mode === 'playwright' ? 'test:local' : mode === 'test' ? 'test' : mode);
if (['test', 'playwright'].includes(mode) && !/^test(?::[\w:-]+)?$/.test(script)) {
	fail('test scripts must start with test or test:');
}
if (/:(?:dev|watch|ui)(?::|$)/.test(script)) fail('watch and UI scripts need a terminal');
if (values.script && !['test', 'playwright'].includes(mode)) fail('--script needs a test command');

const packageName = mode === 'playwright' ? 'n8n-playwright' : values.filter;
const args = packageName
	? [`--filter=${packageName}`, '--fail-if-no-match', 'run', script, ...runnerArgs]
	: ['run', mode];
const logDir = values['log-dir']
	? resolve(process.cwd(), values['log-dir'])
	: resolve(ROOT, '.agent-setup/checks', `${Date.now()}-${process.pid}-${mode}`);
mkdirSync(logDir, { recursive: true });
const logPath = resolve(logDir, 'output.log');
const summaryPath = resolve(logDir, 'summary.json');

const patterns = {
	lint: /\berror\b|\bERR_PNPM_|not found|✖/i,
	typecheck: /\berror TS\d+\b|\berror\b|\bERR_PNPM_|not found/i,
	test: /\bFAIL\b|\bAssertionError\b|\bError:|\bTest Files\b|\bTests\b|not found|\bERR_PNPM_/i,
	playwright: /^\s*\d+\)\s+\[|\bfailed\b|\bError:|not found|\bERR_PNPM_/i,
};

async function diagnostics() {
	const excerpt = [];
	const artifacts = [];
	const lastLines = [];
	let remaining = 0;
	let matches = 0;
	let lineNumber = 0;
	const lines = createInterface({ input: createReadStream(logPath), crlfDelay: Infinity });
	for await (const raw of lines) {
		lineNumber++;
		const line = raw.replace(/\x1b\[[0-9;]*m/g, '').slice(0, 400);
		if (mode === 'playwright' && /trace\.zip|error-context\.md|playwright-report\//.test(line)) {
			if (artifacts.length < 4) artifacts.push(line.trim());
		}
		lastLines.push(line);
		if (lastLines.length > 12) lastLines.shift();
		if (patterns[mode].test(line) && matches < 4) {
			matches++;
			remaining = 3;
			excerpt.push(`${lineNumber}: ${line}`);
		} else if (remaining > 0) {
			excerpt.push(`${lineNumber}: ${line}`);
			remaining--;
		}
	}
	return { excerpt: excerpt.length ? excerpt.slice(0, 24) : lastLines, artifacts };
}

async function main() {
	const start = Date.now();
	const fd = openSync(logPath, 'w');
	if (!values.json) process.stdout.write(`▶ ${mode}\n`);
	const result = await new Promise((resolveResult) => {
		const child = spawn('pnpm', args, {
			cwd: ROOT,
			env: { ...process.env, FORCE_COLOR: '0' },
			stdio: ['ignore', fd, fd],
		});
		const interrupt = () => child.kill('SIGINT');
		const terminate = () => child.kill('SIGTERM');
		process.on('SIGINT', interrupt);
		process.on('SIGTERM', terminate);
		child.once('error', (error) => resolveResult({ exitCode: 1, error: error.message }));
		child.once('close', (code, signal) => {
			process.off('SIGINT', interrupt);
			process.off('SIGTERM', terminate);
			resolveResult({
				exitCode: code ?? (signal === 'SIGINT' ? 130 : 1),
				...(signal && { signal }),
			});
		});
	});
	closeSync(fd);
	const failure = result.exitCode === 0 ? undefined : await diagnostics();
	const summary = {
		mode,
		ok: result.exitCode === 0,
		seconds: Math.round((Date.now() - start) / 1000),
		exitCode: result.exitCode,
		...(result.signal && { signal: result.signal }),
		...(result.error && { error: result.error }),
		log: logPath,
		logKb: Math.round(statSync(logPath).size / 1024),
		...(failure && { diagnostics: failure.excerpt }),
		...(failure?.artifacts.length && { artifacts: failure.artifacts }),
	};
	writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
	if (values.json) {
		process.stdout.write(`${JSON.stringify(summary)}\n`);
	} else {
		process.stdout.write(`${summary.ok ? '✓' : '✗'} ${mode}: ${summary.seconds}s\n`);
		if (summary.error) process.stdout.write(`${summary.error}\n`);
		if (summary.diagnostics) process.stdout.write(`${summary.diagnostics.join('\n')}\n`);
		if (summary.artifacts) process.stdout.write(`${summary.artifacts.join('\n')}\n`);
		process.stdout.write(`Full log: ${logPath}\n`);
	}
	process.exitCode = result.exitCode;
}

main().catch((error) => {
	process.stderr.write(`agent-check: ${error.stack ?? error.message}\nFull log: ${logPath}\n`);
	process.exitCode = 1;
});
