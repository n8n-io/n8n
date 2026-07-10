#!/usr/bin/env node
// Per-package build/typecheck timing for the TS 6 -> 7 migration.
//
// Run it before switching compilers (writes a results file), switch the
// compiler, then run it again — the second run appends to the same file and
// prints a before/after delta table. Migration is per-package, so this always
// targets a single workspace package.
//
// Usage:
//   node scripts/typescript-migration/benchmark.mjs <package> [options]
//
// Options:
//   --label=<name>      Key the run is stored under. Defaults to the detected
//                       TypeScript version (e.g. "ts-6.0.2"), so before/after
//                       with different compilers auto-separate. Re-running a
//                       label overwrites it.
//   --runs=<n>          Repetitions per task (default 3). Reports min/median/mean.
//   --tasks=a,b         Subset of "typecheck,build" (default both). Missing
//                       scripts are skipped with a warning.
//   --no-prepare        Skip the untimed dependency prebuild.
//
// Example:
//   node scripts/typescript-migration/benchmark.mjs @n8n/config --label=before

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..');
const RESULTS_DIR = join(SCRIPT_DIR, 'results');
const DEFAULT_TASKS = ['typecheck', 'build'];

function parseArgs(argv) {
	const opts = { runs: 3, tasks: DEFAULT_TASKS, prepare: true, label: undefined };
	const positionals = [];
	for (const arg of argv) {
		if (arg === '--no-prepare') opts.prepare = false;
		else if (arg.startsWith('--label=')) opts.label = arg.slice('--label='.length);
		else if (arg.startsWith('--runs=')) opts.runs = Number(arg.slice('--runs='.length));
		else if (arg.startsWith('--tasks=')) opts.tasks = arg.slice('--tasks='.length).split(',').map((t) => t.trim()).filter(Boolean);
		else if (arg.startsWith('--')) fail(`Unknown option: ${arg}`);
		else positionals.push(arg);
	}
	if (positionals.length !== 1) fail('Expected exactly one <package> argument.');
	if (!Number.isInteger(opts.runs) || opts.runs < 1) fail('--runs must be a positive integer.');
	opts.package = positionals[0];
	return opts;
}

function fail(message) {
	console.error(`\n✖ ${message}\n`);
	process.exit(1);
}

// Resolve a workspace package name or directory to { name, dir, scripts }.
function resolvePackage(nameOrDir) {
	// A directory path was given directly.
	const asDir = resolve(REPO_ROOT, nameOrDir);
	if (existsSync(join(asDir, 'package.json'))) {
		const pkg = JSON.parse(readFileSync(join(asDir, 'package.json'), 'utf8'));
		return { name: pkg.name, dir: asDir, scripts: pkg.scripts ?? {} };
	}
	// Otherwise treat it as a workspace package name and ask pnpm where it lives.
	let out;
	try {
		out = execFileSync('pnpm', ['--filter', nameOrDir, 'exec', 'node', '-p', 'process.cwd()'], {
			cwd: REPO_ROOT,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		});
	} catch {
		fail(`Could not resolve package "${nameOrDir}" — not a directory and pnpm --filter found no match.`);
	}
	const dir = out.trim().split('\n').filter(Boolean).pop();
	if (!dir || !existsSync(join(dir, 'package.json'))) fail(`Resolved an invalid directory for "${nameOrDir}".`);
	const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
	return { name: pkg.name, dir, scripts: pkg.scripts ?? {} };
}

function detectTsVersion(pkgName) {
	const res = spawnSync('pnpm', ['--filter', pkgName, 'exec', 'tsc', '--version'], {
		cwd: REPO_ROOT,
		encoding: 'utf8',
	});
	const match = /Version\s+([\d.]+)/.exec(res.stdout ?? '');
	return match ? match[1] : 'unknown';
}

// Wipe compiled output + incremental caches so every timed run is cold.
function cleanBuildArtifacts(pkgDir) {
	rmSync(join(pkgDir, 'dist'), { recursive: true, force: true });
	rmSync(join(pkgDir, 'tsconfig.tsbuildinfo'), { force: true });
}

function timeTask(pkgName, pkgDir, task) {
	cleanBuildArtifacts(pkgDir);
	const start = process.hrtime.bigint();
	const res = spawnSync('pnpm', ['--filter', pkgName, 'run', task], {
		cwd: REPO_ROOT,
		stdio: 'inherit',
	});
	const ms = Number(process.hrtime.bigint() - start) / 1e6;
	if (res.status !== 0) fail(`Task "${task}" failed (exit ${res.status}); aborting so timings aren't polluted.`);
	return ms;
}

function summarize(runsMs) {
	const sorted = [...runsMs].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
	const mean = runsMs.reduce((a, b) => a + b, 0) / runsMs.length;
	return {
		runsMs: runsMs.map((n) => Math.round(n)),
		min: Math.round(sorted[0]),
		median: Math.round(median),
		mean: Math.round(mean),
	};
}

function fmtMs(ms) {
	return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

// Baseline-first ordering: "before" is always the baseline and "after" always
// last regardless of recording order; anything else falls between by timestamp.
function orderLabels(runs) {
	const rank = (l) => (/^before$/i.test(l) ? -1 : /^after$/i.test(l) ? 1 : 0);
	return Object.keys(runs).sort((a, b) => {
		if (rank(a) !== rank(b)) return rank(a) - rank(b);
		return (runs[a].timestamp ?? '').localeCompare(runs[b].timestamp ?? '');
	});
}

// Print a comparison table across every stored label, deltas vs the baseline.
function printComparison(data) {
	const labels = orderLabels(data.runs);
	if (labels.length < 2) {
		console.log(`\nStored 1 run ("${labels[0]}"). Run again with a second --label to see a delta.\n`);
		return;
	}
	const base = labels[0];
	console.log(`\n=== ${data.package} — median times (Δ vs "${base}") ===`);
	const tasks = new Set();
	for (const l of labels) for (const t of Object.keys(data.runs[l].tasks)) tasks.add(t);
	for (const task of tasks) {
		console.log(`\n${task}:`);
		const baseMedian = data.runs[base].tasks[task]?.median;
		for (const label of labels) {
			const stat = data.runs[label].tasks[task];
			if (!stat) {
				console.log(`  ${label.padEnd(16)} (not measured)`);
				continue;
			}
			let delta = '';
			if (label !== base && baseMedian != null) {
				const diff = stat.median - baseMedian;
				const pct = ((diff / baseMedian) * 100).toFixed(1);
				const sign = diff <= 0 ? '' : '+';
				delta = `  ${sign}${fmtMs(diff)} (${sign}${pct}%)`;
			}
			console.log(`  ${label.padEnd(16)} ${fmtMs(stat.median).padStart(9)}${delta}`);
		}
	}
	console.log('');
}

function main() {
	const opts = parseArgs(process.argv.slice(2));
	const pkg = resolvePackage(opts.package);
	const tsVersion = detectTsVersion(pkg.name);
	const label = opts.label ?? `ts-${tsVersion}`;

	const tasks = opts.tasks.filter((task) => {
		if (pkg.scripts[task]) return true;
		console.warn(`⚠ Package "${pkg.name}" has no "${task}" script — skipping.`);
		return false;
	});
	if (tasks.length === 0) fail('No runnable tasks for this package.');

	console.log(`\nBenchmarking ${pkg.name}`);
	console.log(`  label:      ${label}`);
	console.log(`  tsc:        ${tsVersion}`);
	console.log(`  node:       ${process.version}`);
	console.log(`  runs/task:  ${opts.runs}`);
	console.log(`  tasks:      ${tasks.join(', ')}\n`);

	if (opts.prepare) {
		console.log('Prebuilding dependencies (untimed)…');
		const prep = spawnSync('pnpm', ['build', `--filter=${pkg.name}^...`], {
			cwd: REPO_ROOT,
			stdio: 'inherit',
		});
		if (prep.status !== 0) fail('Dependency prebuild failed. Fix the build or pass --no-prepare.');
	}

	const taskStats = {};
	for (const task of tasks) {
		const runsMs = [];
		for (let i = 0; i < opts.runs; i++) {
			console.log(`\n▶ ${task} — run ${i + 1}/${opts.runs}`);
			runsMs.push(timeTask(pkg.name, pkg.dir, task));
		}
		taskStats[task] = summarize(runsMs);
		console.log(`  ↳ ${task}: min ${fmtMs(taskStats[task].min)}, median ${fmtMs(taskStats[task].median)}, mean ${fmtMs(taskStats[task].mean)}`);
	}

	mkdirSync(RESULTS_DIR, { recursive: true });
	const resultsFile = join(RESULTS_DIR, `${pkg.name.replace(/[@/]/g, '_')}.json`);
	const data = existsSync(resultsFile)
		? JSON.parse(readFileSync(resultsFile, 'utf8'))
		: { package: pkg.name, runs: {} };
	data.runs[label] = {
		label,
		tsVersion,
		node: process.version,
		timestamp: new Date().toISOString(),
		tasks: taskStats,
	};
	writeFileSync(resultsFile, `${JSON.stringify(data, null, 2)}\n`);
	console.log(`\n✔ Wrote ${resultsFile}`);

	printComparison(data);
}

main();
