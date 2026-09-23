#!/usr/bin/env node
/** Profile Vitest shards without requiring CI or a remote cache. */
import { spawn, execFile, execFileSync } from 'node:child_process';
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { vitestWindow } from './vitest-phase-markers.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const DEFAULT_OUTPUT_DIR = resolve(REPO_ROOT, '.vitest-profile');

const USAGE = `Usage: pnpm profile:vitest -- [flags]

Runs each shard sequentially so every measurement models a dedicated runner.
Full-suite estimates are available only when all shards complete successfully.

Flags:
  --scope <editor|frontend|package>  Suite group to profile (default: editor)
  --package <name>           Workspace package name for --scope package
  --task <name>              Package test script (default: test)
  --file <path>              Test file filter, relative to the package
  --runner <direct|turbo>    Direct Vitest or exact Turbo path (default: direct for one package)
  --shards <list>            Comma-separated shard totals (default: 2,4)
  --indexes <all|list>       Shard indexes to run for each total (default: all; partial results are samples)
  --coverage <off|on|both>   Coverage modes to measure (default: both)
  --workers <n>              Vitest max workers per runner (default: 4)
  --turbo-concurrency <n>    Turbo package-task concurrency (default: 10)
  --runs <n>                 Repetitions of each case (default: 1)
  --sample-ms <n>            Process resource sample interval (default: 1000)
  --profile <kind>            none, imports, coverage, cpu, heap, or all (default: none)
  --skip-prepare              Do not warm required build outputs before measuring
  --allow-concurrent         Run even when another Vitest process is active
  --continue-on-failure     Measure all requested runs after a test failure
  --output <path>            Logs and summary output (default: .vitest-profile)
  --dry-run                  Print commands without running them
  --json                     Print only the final JSON summary
  -h, --help                 Show this help

Examples:
  pnpm profile:vitest -- --shards 2,4 --coverage both
  pnpm profile:vitest -- --scope package --package n8n-core --task test:unit --shards 4
  pnpm profile:vitest -- --scope package --package n8n-core --file src/example.test.ts --shards 1
  pnpm profile:vitest -- --shards 4 --indexes 1 --coverage on --profile coverage
  pnpm profile:vitest -- --shards 4 --indexes 1 --coverage off --profile cpu
`;

function fail(message) {
	process.stderr.write(`vitest-profile: ${message}\n`);
	process.exit(2);
}

function positiveInteger(value, flag) {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) fail(`${flag} must be a positive integer`);
	return parsed;
}

function integerList(value, flag) {
	const parsed = value.split(',').map((item) => positiveInteger(item.trim(), flag));
	return [...new Set(parsed)];
}

function formatSeconds(seconds) {
	if (seconds < 60) return `${seconds.toFixed(1)}s`;
	const minutes = Math.floor(seconds / 60);
	return `${minutes}m${String(Math.round(seconds % 60)).padStart(2, '0')}s`;
}

function formatMb(kb) {
	return `${Math.round(kb / 1024)}MB`;
}

function activeVitestProcesses() {
	try {
		return execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' })
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter((line) => /\bvitest(?:\.mjs)?\s+(?:run|list|watch|dev|related)\b/.test(line));
	} catch {
		return [];
	}
}

function stripAnsi(value) {
	return value.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '');
}

function parseDuration(value, unit) {
	const number = Number(value);
	if (unit === 'ms') return number / 1000;
	if (unit === 'm') return number * 60;
	return number;
}

function parseVitestSummaries(log) {
	const clean = stripAnsi(log);
	const lines = clean.split(/\r?\n/);
	const summaries = [];
	let current = {};

	for (const line of lines) {
		const files =
			line.match(/Test Files\s+.*?\((\d+)\)/) ?? line.match(/Test Files\s+(\d+) passed/);
		if (files) current.testFiles = Number(files[1]);
		const tests = line.match(/Tests\s+.*?\((\d+)\)/) ?? line.match(/Tests\s+(\d+) passed/);
		if (tests) current.tests = Number(tests[1]);
		const duration = line.match(/Duration\s+([\d.]+)(ms|s|m)(?:\s|$)/);
		if (duration) {
			current.durationSeconds = parseDuration(duration[1], duration[2]);
			summaries.push(current);
			current = {};
		}
	}

	return summaries;
}

function parseTurboSummary(log) {
	const clean = stripAnsi(log);
	const tasks = [...clean.matchAll(/Tasks:\s+(\d+) successful, (\d+) total/g)].at(-1);
	const cached = [...clean.matchAll(/Cached:\s+(\d+) cached, (\d+) total/g)].at(-1);
	const time = [...clean.matchAll(/Time:\s+([^\r\n]+)/g)].at(-1);
	return {
		...(tasks && { successfulTasks: Number(tasks[1]), totalTasks: Number(tasks[2]) }),
		...(cached && { cachedTasks: Number(cached[1]) }),
		...(time && { reportedTime: time[1].trim() }),
	};
}

function getProcessRows() {
	return new Promise((resolveRows) => {
		execFile(
			'ps',
			['-axo', 'pid=,ppid=,%cpu=,rss='],
			{ maxBuffer: 8 * 1024 * 1024 },
			(error, stdout) => {
				if (error) return resolveRows([]);
				const rows = stdout
					.split(/\r?\n/)
					.map((line) => line.trim().split(/\s+/))
					.filter((parts) => parts.length === 4)
					.map(([pid, ppid, cpu, rss]) => ({
						pid: Number(pid),
						ppid: Number(ppid),
						cpu: Number(cpu),
						rssKb: Number(rss),
					}));
				resolveRows(rows);
			},
		);
	});
}

function aggregateProcessTree(rows, rootPid) {
	const descendants = new Set([rootPid]);
	let changed = true;
	while (changed) {
		changed = false;
		for (const row of rows) {
			if (descendants.has(row.ppid) && !descendants.has(row.pid)) {
				descendants.add(row.pid);
				changed = true;
			}
		}
	}

	return rows.reduce(
		(total, row) => {
			if (!descendants.has(row.pid)) return total;
			total.cpuPercent += row.cpu;
			total.rssKb += row.rssKb;
			total.processes += 1;
			return total;
		},
		{ cpuPercent: 0, rssKb: 0, processes: 0 },
	);
}

function nodeProfileArgs(profileKinds, profileDir, target) {
	const args = [];
	if (profileKinds.includes('cpu')) {
		args.push('--cpu-prof', `--cpu-prof-dir=${profileDir}`, `--cpu-prof-name=${target}.cpuprofile`);
	}
	if (profileKinds.includes('heap')) {
		args.push(
			'--heap-prof',
			`--heap-prof-dir=${profileDir}`,
			`--heap-prof-name=${target}.heapprofile`,
		);
	}
	return args;
}

function vitestArgs(testCase, options) {
	return [
		...(options.file ? [options.file] : []),
		`--shard=${testCase.index}/${testCase.shards}`,
		`--maxWorkers=${options.workers}`,
		...(options.profileKinds.includes('imports') ? ['--experimental.importDurations.print'] : []),
	];
}

function directTask(packageDir, task) {
	const { scripts } = JSON.parse(readFileSync(resolve(packageDir, 'package.json'), 'utf8'));
	const tokens = scripts?.[task]?.trim().split(/\s+/) ?? [];
	const vitestIndex = tokens.indexOf('vitest');
	if (vitestIndex < 0 || tokens[vitestIndex + 1] !== 'run') {
		fail(`--runner direct requires a "vitest run" script; ${task} is not one. Use --runner turbo.`);
	}
	const prefix = tokens.slice(0, vitestIndex);
	if (prefix[0] === 'cross-env') prefix.shift();
	if (prefix.some((token) => !/^[A-Za-z_][A-Za-z_0-9]*=[^\s]+$/.test(token))) {
		fail(`cannot reproduce the environment of ${task} in direct mode; use --runner turbo`);
	}
	const args = tokens.slice(vitestIndex + 2);
	if (
		args.some(
			(token, index) =>
				!token.startsWith('--config=') && token !== '--config' && args[index - 1] !== '--config',
		)
	) {
		fail(`cannot reproduce the arguments of ${task} in direct mode; use --runner turbo`);
	}
	return {
		args,
		env: Object.fromEntries(
			prefix.map((entry) => {
				const separator = entry.indexOf('=');
				return [entry.slice(0, separator), entry.slice(separator + 1)];
			}),
		),
	};
}

function commandForCase(testCase, options, profileDir) {
	if (options.runner === 'direct') {
		return {
			command: process.execPath,
			args: [
				...nodeProfileArgs(options.profileKinds, resolve(profileDir, 'main'), 'vitest-main'),
				options.vitestEntry,
				'run',
				...options.directTask.args,
				...vitestArgs(testCase, options),
			],
			cwd: options.packageDir,
		};
	}

	const filters =
		options.scope === 'editor'
			? ['--filter=n8n-editor-ui']
			: options.scope === 'frontend'
				? ['--filter=./packages/frontend/**', '--filter=./packages/modules/*/frontend']
				: [`--filter=${options.package}`];
	return {
		command: 'pnpm',
		args: [
			'exec',
			'turbo',
			'run',
			options.task,
			'--continue',
			'--only',
			'--force',
			'--env-mode=loose',
			...filters,
			`--concurrency=${options.turboConcurrency}`,
			'--summarize',
			'--',
			...vitestArgs(testCase, options),
		],
		cwd: REPO_ROOT,
	};
}

function prepareBuild(options) {
	const filters =
		options.scope === 'editor'
			? ['--filter=n8n-editor-ui']
			: options.scope === 'frontend'
				? ['--filter=./packages/frontend/**', '--filter=./packages/modules/*/frontend']
				: [`--filter=${options.package}`];
	const command = 'pnpm';
	const args = ['exec', 'turbo', 'run', 'build', ...filters, '--summarize'];
	if (options.dryRun) {
		if (!options.json) process.stdout.write(`[prepare] ${command} ${args.join(' ')}\n`);
		return Promise.resolve({ skipped: false, dryRun: true });
	}

	const logPath = resolve(options.outputDir, 'prepare.log');
	const logStream = createWriteStream(logPath, { flags: 'w' });
	const startedAt = Date.now();
	if (!options.json) process.stdout.write('[prepare] warming build outputs... ');
	const child = spawn(command, args, {
		cwd: REPO_ROOT,
		env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	child.stdout.pipe(logStream, { end: false });
	child.stderr.pipe(logStream, { end: false });

	return new Promise((resolvePrepare, rejectPrepare) => {
		child.once('error', rejectPrepare);
		child.once('exit', (exitCode, signal) => {
			logStream.end();
			const result = {
				skipped: false,
				exitCode,
				signal,
				wallSeconds: (Date.now() - startedAt) / 1000,
				log: logPath,
			};
			if (!options.json) {
				process.stdout.write(
					exitCode === 0
						? `ok ${formatSeconds(result.wallSeconds)}\n`
						: `failed (${signal ?? exitCode})\n`,
				);
			}
			resolvePrepare(result);
		});
	});
}

async function runCase(testCase, options) {
	const label = [
		options.suiteLabel,
		`${testCase.index}-of-${testCase.shards}`,
		`coverage-${testCase.coverage ? 'on' : 'off'}`,
		`workers-${options.workers}`,
		`run-${testCase.run}`,
	].join('-');
	const logPath = resolve(options.outputDir, `${label}.log`);
	const profileDir = resolve(options.outputDir, `${label}-profiles`);
	const { command, args, cwd } = commandForCase(testCase, options, profileDir);
	const invocation = { bin: command, args, cwd };

	if (options.dryRun) {
		return { ...testCase, label, command: invocation, dryRun: true };
	}

	mkdirSync(resolve(profileDir, 'main'), { recursive: true });
	mkdirSync(resolve(profileDir, 'runner'), { recursive: true });
	const logStream = createWriteStream(logPath, { flags: 'w' });
	const startedAt = Date.now();
	const child = spawn(command, args, {
		cwd,
		env: {
			...process.env,
			...(options.directTask?.env ?? {}),
			AFFECTED_PACKAGES: '',
			CHANGED_FILES: '',
			CI: 'true',
			COVERAGE_ENABLED: testCase.coverage ? 'true' : 'false',
			...(options.profileKinds.includes('coverage')
				? { DEBUG: [process.env.DEBUG, 'vitest:coverage'].filter(Boolean).join(',') }
				: {}),
			FORCE_COLOR: '0',
			VITEST_PHASE_PROFILE: 'true',
			VITEST_RUNNER_PROFILE_DIR: resolve(profileDir, 'runner'),
			VITEST_RUNNER_PROFILE_KINDS: options.profileKinds.join(','),
		},
		stdio: ['ignore', 'pipe', 'pipe'],
	});

	child.stdout.pipe(logStream, { end: false });
	child.stderr.pipe(logStream, { end: false });

	const resources = { peakCpuPercent: 0, peakRssKb: 0, peakProcesses: 0, samples: 0 };
	let sampling = false;
	const sample = async () => {
		if (sampling || child.exitCode !== null) return;
		sampling = true;
		const aggregate = aggregateProcessTree(await getProcessRows(), child.pid);
		resources.peakCpuPercent = Math.max(resources.peakCpuPercent, aggregate.cpuPercent);
		resources.peakRssKb = Math.max(resources.peakRssKb, aggregate.rssKb);
		resources.peakProcesses = Math.max(resources.peakProcesses, aggregate.processes);
		resources.samples += 1;
		sampling = false;
	};
	const sampler = setInterval(sample, options.sampleMs);
	await sample();

	const outcome = await new Promise((resolveOutcome) => {
		child.once('error', (error) =>
			resolveOutcome({ exitCode: null, signal: null, error: error.message }),
		);
		child.once('exit', (exitCode, signal) => resolveOutcome({ exitCode, signal }));
	});
	clearInterval(sampler);
	await sample();
	logStream.end();
	await new Promise((resolveEnd) => logStream.once('finish', resolveEnd));
	const endedAt = Date.now();

	const log = await readFile(logPath, 'utf8');
	const window = vitestWindow(log, startedAt, endedAt);
	const vitestPhases = window
		? {
				setupSeconds: (window.first - startedAt) / 1000,
				runSeconds: (window.last - window.first) / 1000,
				teardownSeconds: (endedAt - window.last) / 1000,
				processes: window.processes,
			}
		: null;
	const vitest = parseVitestSummaries(log);
	const slowestVitest = vitest.reduce(
		(slowest, summary) =>
			summary.durationSeconds > (slowest?.durationSeconds ?? 0) ? summary : slowest,
		null,
	);

	return {
		...testCase,
		...outcome,
		label,
		command: invocation,
		log: logPath,
		profileDir,
		wallSeconds: (endedAt - startedAt) / 1000,
		vitestPhases,
		resources,
		turbo: parseTurboSummary(log),
		vitest,
		slowestVitest,
	};
}

function aggregateResults(results) {
	const groups = new Map();
	for (const result of results.filter((item) => !item.dryRun)) {
		const key = `${result.shards}:${result.coverage}:${result.run}`;
		const group = groups.get(key) ?? {
			shards: result.shards,
			coverage: result.coverage,
			run: result.run,
			results: [],
		};
		group.results.push(result);
		groups.set(key, group);
	}

	return [...groups.values()].map((group) => {
		const complete =
			group.results.length === group.shards && group.results.every((r) => r.exitCode === 0);
		const sampledWallSeconds = Math.max(...group.results.map((result) => result.wallSeconds));
		const sampledRunnerSeconds = group.results.reduce((sum, result) => sum + result.wallSeconds, 0);
		return {
			shards: group.shards,
			coverage: group.coverage,
			run: group.run,
			measuredShards: group.results.length,
			complete,
			sampledWallSeconds,
			sampledRunnerSeconds,
			predictedWallSeconds: complete ? sampledWallSeconds : null,
			totalRunnerSeconds: complete ? sampledRunnerSeconds : null,
			peakRssKb: Math.max(...group.results.map((result) => result.resources.peakRssKb)),
			peakCpuPercent: Math.max(...group.results.map((result) => result.resources.peakCpuPercent)),
		};
	});
}

function printResult(result) {
	const vitest = result.slowestVitest;
	const details = [
		formatSeconds(result.wallSeconds),
		vitest?.testFiles ? `${vitest.testFiles} files` : 'files unknown',
		vitest?.durationSeconds ? `vitest ${formatSeconds(vitest.durationSeconds)}` : 'vitest unknown',
		`peak ${formatMb(result.resources.peakRssKb)}`,
		`CPU ${Math.round(result.resources.peakCpuPercent)}%`,
	];
	process.stdout.write(`${result.exitCode === 0 ? 'ok' : 'failed'} ${details.join(', ')}\n`);
}

let values;
try {
	({ values } = parseArgs({
		args: process.argv[2] === '--' ? process.argv.slice(3) : process.argv.slice(2),
		options: {
			scope: { type: 'string', default: 'editor' },
			package: { type: 'string' },
			task: { type: 'string' },
			file: { type: 'string' },
			runner: { type: 'string' },
			shards: { type: 'string', default: '2,4' },
			indexes: { type: 'string', default: 'all' },
			coverage: { type: 'string', default: 'both' },
			workers: { type: 'string', default: '4' },
			'turbo-concurrency': { type: 'string', default: '10' },
			runs: { type: 'string', default: '1' },
			'sample-ms': { type: 'string', default: '1000' },
			profile: { type: 'string', default: 'none' },
			'skip-prepare': { type: 'boolean', default: false },
			'allow-concurrent': { type: 'boolean', default: false },
			'continue-on-failure': { type: 'boolean', default: false },
			output: { type: 'string' },
			'dry-run': { type: 'boolean', default: false },
			json: { type: 'boolean', default: false },
			help: { type: 'boolean', default: false, short: 'h' },
		},
		strict: true,
	}));
} catch (error) {
	fail(error.message);
}

if (values.help) {
	process.stdout.write(USAGE);
	process.exit(0);
}
if (!['editor', 'frontend', 'package'].includes(values.scope)) {
	fail('--scope must be editor, frontend, or package');
}
if (values.scope === 'package' && !values.package) fail('--package is required for package scope');
const runner = values.runner ?? (values.scope === 'frontend' ? 'turbo' : 'direct');
if (!['direct', 'turbo'].includes(runner)) fail('--runner must be direct or turbo');
if (values.scope === 'frontend' && runner === 'direct') {
	fail('direct runner requires a single package scope');
}
if (!['off', 'on', 'both'].includes(values.coverage)) {
	fail('--coverage must be off, on, or both');
}
const validProfileKinds = ['imports', 'coverage', 'cpu', 'heap'];
const profileKinds =
	values.profile === 'none'
		? []
		: values.profile === 'all'
			? validProfileKinds
			: values.profile.split(',').map((kind) => kind.trim());
const invalidProfileKind = profileKinds.find((kind) => !validProfileKinds.includes(kind));
if (invalidProfileKind) fail(`unknown profile kind "${invalidProfileKind}"`);
if (values.scope === 'frontend' && profileKinds.some((kind) => kind === 'cpu' || kind === 'heap')) {
	fail('cpu and heap profiles require a single package scope');
}
if (runner !== 'direct' && profileKinds.some((kind) => kind === 'cpu' || kind === 'heap')) {
	fail('cpu and heap profiles require --runner direct');
}

const packageName = values.scope === 'editor' ? 'n8n-editor-ui' : values.package;
let packageDir;
if (packageName) {
	try {
		packageDir = execFileSync(
			'pnpm',
			['--filter', packageName, 'exec', 'node', '-e', 'process.stdout.write(process.cwd())'],
			{ cwd: REPO_ROOT, encoding: 'utf8' },
		).trim();
	} catch {
		fail(`could not resolve workspace package "${packageName}"`);
	}
}
let vitestEntry;
if (packageDir) {
	try {
		const requireFromPackage = createRequire(resolve(packageDir, 'package.json'));
		vitestEntry = join(dirname(requireFromPackage.resolve('vitest')), 'vitest.mjs');
	} catch {
		fail(`vitest is not available in ${packageName}`);
	}
}
const task = values.task ?? 'test';
const taskConfig = runner === 'direct' ? directTask(packageDir, task) : undefined;

const options = {
	scope: values.scope,
	package: packageName,
	packageDir,
	suiteLabel:
		[packageName, values.file]
			.filter(Boolean)
			.join('-')
			.replaceAll(/[^A-Za-z0-9._-]/g, '-')
			.replace(/^-+/, '') || values.scope,
	task,
	file: values.file,
	runner,
	vitestEntry,
	directTask: taskConfig,
	shards: integerList(values.shards, '--shards'),
	indexes: values.indexes === 'all' ? 'all' : integerList(values.indexes, '--indexes'),
	coverage:
		values.coverage === 'both' ? [false, true] : values.coverage === 'on' ? [true] : [false],
	workers: positiveInteger(values.workers, '--workers'),
	turboConcurrency: positiveInteger(values['turbo-concurrency'], '--turbo-concurrency'),
	runs: positiveInteger(values.runs, '--runs'),
	sampleMs: positiveInteger(values['sample-ms'], '--sample-ms'),
	profileKinds,
	skipPrepare: values['skip-prepare'],
	allowConcurrent: values['allow-concurrent'],
	continueOnFailure: values['continue-on-failure'],
	outputDir: values.output ? resolve(process.cwd(), values.output) : DEFAULT_OUTPUT_DIR,
	dryRun: values['dry-run'],
	json: values.json,
};

const cases = [];
for (const shards of options.shards) {
	const indexes =
		options.indexes === 'all'
			? Array.from({ length: shards }, (_, index) => index + 1)
			: options.indexes;
	for (const index of indexes) {
		if (index > shards) fail(`shard index ${index} exceeds shard total ${shards}`);
		for (const coverage of options.coverage) {
			for (let run = 1; run <= options.runs; run++) cases.push({ shards, index, coverage, run });
		}
	}
}

async function main() {
	if (!options.dryRun) mkdirSync(options.outputDir, { recursive: true });
	if (!options.dryRun && !options.allowConcurrent) {
		const active = activeVitestProcesses();
		if (active.length > 0) {
			fail(
				`${active.length} other Vitest process(es) are active; wait for them or use --allow-concurrent`,
			);
		}
	}
	const preparation = options.skipPrepare ? { skipped: true } : await prepareBuild(options);
	if (preparation.exitCode !== undefined && preparation.exitCode !== 0) {
		const summary = { schemaVersion: 1, options, preparation, results: [], aggregates: [] };
		writeFileSync(
			resolve(options.outputDir, 'summary.json'),
			JSON.stringify(summary, null, 2) + '\n',
		);
		if (options.json) process.stdout.write(`${JSON.stringify(summary)}\n`);
		process.exit(1);
	}
	const results = [];
	for (const [position, testCase] of cases.entries()) {
		const label = [
			options.suiteLabel,
			`${testCase.index}-of-${testCase.shards}`,
			`coverage-${testCase.coverage ? 'on' : 'off'}`,
			`workers-${options.workers}`,
			`run-${testCase.run}`,
		].join('-');
		const command = commandForCase(
			testCase,
			options,
			resolve(options.outputDir, `${label}-profiles`),
		);
		if (!options.json) {
			process.stdout.write(
				`[${position + 1}/${cases.length}] ${options.suiteLabel} shard ${testCase.index}/${testCase.shards}, coverage ${testCase.coverage ? 'on' : 'off'}... `,
			);
			if (options.dryRun) process.stdout.write(`${command.command} ${command.args.join(' ')}\n`);
		}
		const result = await runCase(testCase, options);
		results.push(result);
		if (!options.json && !options.dryRun) printResult(result);
		if (!options.dryRun) {
			writeFileSync(
				resolve(options.outputDir, 'summary.json'),
				JSON.stringify({ schemaVersion: 1, options, preparation, results }, null, 2) + '\n',
			);
		}
		if (!result.dryRun && result.exitCode !== 0 && !options.continueOnFailure) break;
	}

	const summary = {
		schemaVersion: 1,
		options,
		preparation,
		results,
		aggregates: aggregateResults(results),
	};
	if (!options.dryRun) {
		writeFileSync(
			resolve(options.outputDir, 'summary.json'),
			JSON.stringify(summary, null, 2) + '\n',
		);
	}
	if (options.json) {
		process.stdout.write(`${JSON.stringify(summary)}\n`);
	} else if (!options.dryRun) {
		process.stdout.write('\nPredicted CI shape (sequential local measurements):\n');
		for (const aggregate of summary.aggregates) {
			const timing = aggregate.complete
				? `wall ${formatSeconds(aggregate.predictedWallSeconds)}, runner total ${formatSeconds(aggregate.totalRunnerSeconds)}`
				: `${aggregate.measuredShards}/${aggregate.shards} measured, sampled max ${formatSeconds(aggregate.sampledWallSeconds)}`;
			process.stdout.write(
				`${aggregate.shards} shards, coverage ${aggregate.coverage ? 'on' : 'off'}: ${timing}, peak ${formatMb(aggregate.peakRssKb)}\n`,
			);
		}
		process.stdout.write(`summary: ${resolve(options.outputDir, 'summary.json')}\n`);
	}

	process.exitCode = results.some((result) => !result.dryRun && result.exitCode !== 0) ? 1 : 0;
}

main().catch((error) => {
	process.stderr.write(`vitest-profile: ${error.stack ?? error.message}\n`);
	process.exit(1);
});
