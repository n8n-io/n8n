#!/usr/bin/env node
/**
 * tsc vs tsgo (@typescript/native-preview) benchmark + diagnostic-parity probe.
 *
 *   SPEED  : wall-clock of `tsc --noEmit` vs `tsgo --noEmit` (min of N runs).
 *   PARITY : normalized diagnostics from each compiler, diffed, so we can see
 *            where tsgo disagrees with tsc (false positives / missed errors).
 *
 * tsgo currently rejects this repo's `moduleResolution: "node"` (node10 was
 * removed in TS7), so to get past the config gate we pass a probe override
 * (default `--moduleResolution bundler`). This is a MEASUREMENT crutch, not a
 * proposed config change — see scripts/tsgo/README.md. Override changes module
 * resolution, so some parity diffs may be artifacts of the override rather than
 * true tsgo/tsc divergences; treat the parity output as a triage list.
 *
 * Usage:
 *   node scripts/tsgo/bench.mjs                       # default speed + parity set
 *   node scripts/tsgo/bench.mjs --speed packages/nodes-base --runs 3
 *   node scripts/tsgo/bench.mjs --parity packages/workflow,packages/@n8n/di
 *   node scripts/tsgo/bench.mjs --tsgo-args="--moduleResolution bundler"
 */
import { spawn, spawnSync, execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { availableParallelism } from 'node:os';

const ROOT = resolve(import.meta.dirname, '../..');

function arg(name, fallback) {
	const i = process.argv.indexOf(name);
	return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const SPEED_PKG = arg('--speed', 'packages/nodes-base');
const RUNS = Number(arg('--runs', '3'));
const PARITY_PKGS = arg(
	'--parity',
	'packages/workflow,packages/cli,packages/@n8n/di,packages/@n8n/db,packages/@n8n/api-types',
).split(',');
const TSGO_EXTRA = arg('--tsgo-args', '--moduleResolution bundler').split(' ').filter(Boolean);

function run(bin, args, cwd) {
	const start = process.hrtime.bigint();
	const res = spawnSync('pnpm', ['exec', bin, ...args], {
		cwd: resolve(ROOT, cwd),
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
	});
	const ms = Number(process.hrtime.bigint() - start) / 1e6;
	return { ms, code: res.status, out: `${res.stdout ?? ''}${res.stderr ?? ''}` };
}

// ---- diagnostics normalization -------------------------------------------
// Keep only `path(line,col): error TSxxxx: msg`, drop the line/col + abs path,
// so the comparison is about *which errors* fire, not formatting/ordering.
function diagnostics(out) {
	const set = new Set();
	for (const line of out.split('\n')) {
		const m = line.match(/^(.*?)\((\d+),(\d+)\): (error|warning) (TS\d+): (.*)$/);
		if (m) set.add(`${m[1].split('/').pop()} ${m[5]}: ${m[6]}`);
	}
	return set;
}

console.log(`tsgo probe override: ${TSGO_EXTRA.join(' ') || '(none)'}\n`);

// ---- FULL: whole-monorepo parallel fanout --------------------------------
// Runs `<bin> --noEmit` in every non-Vue package that has a typecheck:tsgo
// script, under a fixed concurrency pool, and reports total wall time. Both
// compilers use the SAME pool, so the ratio is apples-to-apples regardless of
// the pool size. Build cache must be warm first (`pnpm build`).
if (process.argv.includes('--full')) {
	const CONCURRENCY = Number(arg('--concurrency', String(availableParallelism())));
	const pkgs = execSync('find packages -name package.json -not -path "*/node_modules/*" -maxdepth 4')
		.toString()
		.trim()
		.split('\n')
		.filter(Boolean)
		.filter((f) => JSON.parse(readFileSync(f, 'utf8')).scripts?.['typecheck:tsgo'])
		.map((f) => dirname(f));

	const runAsync = (bin, extra, cwd) =>
		new Promise((res) => {
			const child = spawn('pnpm', ['exec', bin, '--noEmit', ...extra], { cwd: resolve(ROOT, cwd) });
			child.on('close', (code) => res(code));
			child.on('error', () => res(1));
			child.stdout?.resume();
			child.stderr?.resume();
		});

	async function fanout(bin, extra) {
		const queue = [...pkgs];
		let failures = 0;
		const start = process.hrtime.bigint();
		const worker = async () => {
			let cwd;
			while ((cwd = queue.shift()) !== undefined) {
				const code = await runAsync(bin, extra, cwd);
				if (code !== 0) failures++;
			}
		};
		await Promise.all(Array.from({ length: CONCURRENCY }, worker));
		return { ms: Number(process.hrtime.bigint() - start) / 1e6, failures };
	}

	console.log(`## FULL monorepo typecheck — ${pkgs.length} packages, concurrency ${CONCURRENCY}\n`);
	const tsc = await fanout('tsc', []);
	const tsgo = await fanout('tsgo', TSGO_EXTRA);
	console.log(`  tsc : ${(tsc.ms / 1000).toFixed(2)}s  (${tsc.failures} pkg failures)`);
	console.log(`  tsgo: ${(tsgo.ms / 1000).toFixed(2)}s  (${tsgo.failures} pkg failures)`);
	console.log(`  speedup: ${(tsc.ms / tsgo.ms).toFixed(1)}x`);
	writeFileSync(
		resolve(import.meta.dirname, 'baseline-full.json'),
		JSON.stringify({ packages: pkgs.length, concurrency: CONCURRENCY, tsgoProbeOverride: TSGO_EXTRA, tsc, tsgo, speedup: tsc.ms / tsgo.ms }, null, 2) + '\n',
	);
	process.exit(0);
}

// ---- SPEED ----------------------------------------------------------------
function best(bin, extra, cwd) {
	let min = Infinity;
	let last;
	for (let i = 0; i < RUNS; i++) {
		last = run(bin, ['--noEmit', ...extra], cwd);
		min = Math.min(min, last.ms);
	}
	return { ms: min, code: last.code };
}

console.log(`## Speed — ${SPEED_PKG} (best of ${RUNS})`);
const tscSpeed = best('tsc', [], SPEED_PKG);
const tsgoSpeed = best('tsgo', TSGO_EXTRA, SPEED_PKG);
const speedup = tscSpeed.ms / tsgoSpeed.ms;
console.log(`  tsc : ${(tscSpeed.ms / 1000).toFixed(2)}s (exit ${tscSpeed.code})`);
console.log(`  tsgo: ${(tsgoSpeed.ms / 1000).toFixed(2)}s (exit ${tsgoSpeed.code})`);
console.log(`  speedup: ${speedup.toFixed(1)}x\n`);

// ---- PARITY ---------------------------------------------------------------
console.log('## Parity (diagnostics tsgo vs tsc)');
const parityRows = [];
for (const pkg of PARITY_PKGS) {
	const tsc = run('tsc', ['--noEmit'], pkg);
	const tsgo = run('tsgo', ['--noEmit', ...TSGO_EXTRA], pkg);
	const dTsc = diagnostics(tsc.out);
	const dTsgo = diagnostics(tsgo.out);
	const onlyTsgo = [...dTsgo].filter((d) => !dTsc.has(d));
	const onlyTsc = [...dTsc].filter((d) => !dTsgo.has(d));
	const status = onlyTsgo.length === 0 && onlyTsc.length === 0 ? 'MATCH' : 'DIFF';
	parityRows.push({ pkg, status, tscExit: tsc.code, tsgoExit: tsgo.code, onlyTsgo, onlyTsc });
	console.log(`  ${status.padEnd(5)} ${pkg}  (tsc=${tsc.code} tsgo=${tsgo.code}, +${onlyTsgo.length} tsgo-only / +${onlyTsc.length} tsc-only)`);
	for (const d of onlyTsgo.slice(0, 5)) console.log(`        tsgo-only: ${d}`);
	for (const d of onlyTsc.slice(0, 5)) console.log(`        tsc-only:  ${d}`);
}

const report = {
	tsgoProbeOverride: TSGO_EXTRA,
	speed: { pkg: SPEED_PKG, runs: RUNS, tscMs: tscSpeed.ms, tsgoMs: tsgoSpeed.ms, speedup },
	parity: parityRows,
};
const outPath = resolve(import.meta.dirname, 'baseline.json');
writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
console.log(`\nWrote ${outPath}`);
