#!/usr/bin/env node
/**
 * Benchmark Regression Checker
 *
 * Compares current benchmark results against baseline and fails if any
 * benchmark regresses beyond the threshold.
 *
 * Exit codes:
 *   0 = All benchmarks within threshold
 *   1 = Regression detected
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILES_DIR = resolve(__dirname, '../profiles');
const THRESHOLD = 0.10; // 10%

const BASELINE_PATH = resolve(PROFILES_DIR, 'baseline.json');
const CURRENT_PATH = resolve(PROFILES_DIR, 'benchmark-results.json');

if (!existsSync(BASELINE_PATH)) {
	console.error('❌ No baseline found. Run: pnpm bench:baseline');
	process.exit(1);
}

if (!existsSync(CURRENT_PATH)) {
	console.error('❌ No current results found. Run bench:ci to generate them.');
	process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf-8'));
const current = JSON.parse(readFileSync(CURRENT_PATH, 'utf-8'));

// Build lookup map from baseline
const baselineMap = new Map();
for (const file of baseline.files) {
	for (const group of file.groups) {
		for (const bench of group.benchmarks) {
			baselineMap.set(`${group.fullName}::${bench.name}`, bench);
		}
	}
}

// Compare results
const results = [];
let hasRegression = false;

for (const file of current.files) {
	for (const group of file.groups) {
		for (const bench of group.benchmarks) {
			const key = `${group.fullName}::${bench.name}`;
			const base = baselineMap.get(key);

			if (!base) {
				results.push({ name: bench.name, status: 'new', current: bench.hz, baseline: null, ratio: null });
				continue;
			}

			const ratio = bench.hz / base.hz;
			const isRegression = ratio < (1 - THRESHOLD);
			const isImprovement = ratio > (1 + THRESHOLD);

			if (isRegression) hasRegression = true;

			results.push({
				name: bench.name,
				status: isRegression ? 'regression' : isImprovement ? 'improved' : 'ok',
				current: bench.hz,
				baseline: base.hz,
				ratio,
			});
		}
	}
}

// Print results
console.log(`\nBenchmark Comparison (±${(THRESHOLD * 100).toFixed(0)}% threshold)\n`);
console.log(''.padEnd(70, '─'));

for (const r of results) {
	const icon = r.status === 'regression' ? '❌' : r.status === 'improved' ? '✅' : r.status === 'new' ? '🆕' : '  ';
	const changeStr = r.ratio !== null ? `${((r.ratio - 1) * 100).toFixed(1)}%` : 'new';
	const currentStr = r.current.toFixed(0).padStart(8);
	const baselineStr = r.baseline !== null ? r.baseline.toFixed(0).padStart(8) : '     N/A';

	console.log(`${icon} ${r.name.padEnd(35)} ${currentStr} hz (was ${baselineStr}) ${changeStr.padStart(7)}`);
}

console.log(''.padEnd(70, '─'));

const regressions = results.filter(r => r.status === 'regression');
const improvements = results.filter(r => r.status === 'improved');

if (hasRegression) {
	console.log(`\n❌ FAILED: ${regressions.length} regression(s) exceeded ${(THRESHOLD * 100).toFixed(0)}% threshold\n`);
	process.exit(1);
} else {
	console.log(`\n✅ PASSED: All benchmarks within threshold`);
	if (improvements.length > 0) {
		console.log(`   ${improvements.length} improved - consider updating baseline with: pnpm bench:baseline`);
	}
	console.log('');
	process.exit(0);
}
