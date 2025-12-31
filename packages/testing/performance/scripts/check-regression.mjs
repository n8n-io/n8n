#!/usr/bin/env node
/**
 * Benchmark Regression Checker
 *
 * Compares current benchmark results against a baseline and fails if any
 * benchmark regresses beyond the threshold.
 *
 * Usage:
 *   node scripts/check-regression.mjs
 *   node scripts/check-regression.mjs --threshold 0.15
 *   node scripts/check-regression.mjs --baseline baseline-2024-W52.json
 *
 * Exit codes:
 *   0 = All benchmarks within threshold
 *   1 = Regression detected
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILES_DIR = resolve(__dirname, '../profiles');

// Parse args
const args = process.argv.slice(2);
const thresholdIdx = args.indexOf('--threshold');
const THRESHOLD = thresholdIdx !== -1 ? parseFloat(args[thresholdIdx + 1]) : 0.10;

const baselineIdx = args.indexOf('--baseline');
const baselineFile = baselineIdx !== -1 ? args[baselineIdx + 1] : findLatestBaseline();

function findLatestBaseline() {
	// Look for weekly baselines (baseline-YYYY-WXX.json), prefer over baseline.json
	const weeklyFiles = readdirSync(PROFILES_DIR)
		.filter(f => f.match(/^baseline-\d{4}-W\d{2}\.json$/))
		.sort()
		.reverse();

	// Prefer latest weekly baseline, fall back to baseline.json
	return weeklyFiles[0] || 'baseline.json';
}

const BASELINE_PATH = resolve(PROFILES_DIR, baselineFile);
const CURRENT_PATH = resolve(PROFILES_DIR, 'benchmark-results.json');

// Check files exist
if (!existsSync(BASELINE_PATH)) {
	console.error('❌ No baseline found. Run: pnpm bench:save-baseline');
	process.exit(1);
}

if (!existsSync(CURRENT_PATH)) {
	console.error('❌ No current results found. Run: pnpm bench -- --outputJson ./profiles/benchmark-results.json');
	process.exit(1);
}

// Load results
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
				results.push({
					name: bench.name,
					group: group.fullName,
					status: 'new',
					current: bench.hz,
					baseline: null,
					ratio: null,
				});
				continue;
			}

			const ratio = bench.hz / base.hz;
			const isRegression = ratio < (1 - THRESHOLD);
			const isImprovement = ratio > (1 + THRESHOLD);

			if (isRegression) hasRegression = true;

			results.push({
				name: bench.name,
				group: group.fullName,
				status: isRegression ? 'regression' : isImprovement ? 'improved' : 'ok',
				current: bench.hz,
				baseline: base.hz,
				ratio,
			});
		}
	}
}

// Print results
console.log(`\n📊 Benchmark Comparison`);
console.log(`   Baseline: ${baselineFile}`);
console.log(`   Threshold: ±${(THRESHOLD * 100).toFixed(0)}%\n`);
console.log(''.padEnd(80, '─'));

for (const r of results) {
	const icon = r.status === 'regression' ? '❌' :
	             r.status === 'improved' ? '✅' :
	             r.status === 'new' ? '🆕' : '  ';

	const ratioStr = r.ratio !== null
		? `${(r.ratio).toFixed(2)}x`
		: 'N/A';

	const changeStr = r.ratio !== null
		? `${((r.ratio - 1) * 100).toFixed(1)}%`
		: 'new';

	const currentStr = r.current.toFixed(0).padStart(8);
	const baselineStr = r.baseline !== null ? r.baseline.toFixed(0).padStart(8) : '     N/A';

	console.log(`${icon} ${r.name.padEnd(35)} ${currentStr} hz  (was ${baselineStr})  ${changeStr.padStart(7)}`);
}

console.log(''.padEnd(80, '─'));

// Summary
const regressions = results.filter(r => r.status === 'regression');
const improvements = results.filter(r => r.status === 'improved');
const newTests = results.filter(r => r.status === 'new');

console.log(`\n📈 Summary:`);
console.log(`   Total: ${results.length} benchmarks`);
if (improvements.length > 0) console.log(`   ✅ Improved: ${improvements.length}`);
if (newTests.length > 0) console.log(`   🆕 New: ${newTests.length}`);
if (regressions.length > 0) console.log(`   ❌ Regressions: ${regressions.length}`);

if (hasRegression) {
	console.log(`\n❌ FAILED: ${regressions.length} benchmark(s) regressed more than ${(THRESHOLD * 100).toFixed(0)}%\n`);
	for (const r of regressions) {
		console.log(`   • ${r.name}: ${((1 - r.ratio) * 100).toFixed(1)}% slower`);
	}
	console.log('');
	process.exit(1);
} else {
	console.log(`\n✅ PASSED: No regressions exceed ${(THRESHOLD * 100).toFixed(0)}% threshold`);
	if (improvements.length > 0) {
		console.log(`\n📝 Note: ${improvements.length} benchmark(s) improved >${(THRESHOLD * 100).toFixed(0)}% - consider updating baseline:\n`);
		for (const r of improvements) {
			console.log(`   • ${r.name}: ${((r.ratio - 1) * 100).toFixed(1)}% faster`);
		}
	}
	console.log('');
	process.exit(0);
}
