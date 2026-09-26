#!/usr/bin/env node
/**
 * Save Baseline
 *
 * Runs benchmarks and saves results as the new baseline for regression detection.
 * Sanitizes absolute paths so baseline can be committed.
 *
 * Extra arguments go to `vitest bench`, for example a file filter:
 *   pnpm bench:baseline benchmarks/workflow-graph
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

import { collectBenchmarks, jsonReporterArgs, sanitizePaths } from './bench-results.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILES_DIR = resolve(__dirname, '../profiles');
const PACKAGE_DIR = resolve(__dirname, '..');

const resultsPath = resolve(PROFILES_DIR, 'benchmark-results.json');
const baselinePath = resolve(PROFILES_DIR, 'baseline.json');

console.log('Running benchmarks...\n');

try {
	execFileSync(
		'pnpm',
		[
			'vitest',
			'bench',
			'--run',
			...jsonReporterArgs('./profiles/benchmark-results.json'),
			...process.argv.slice(2),
		],
		{ cwd: PACKAGE_DIR, stdio: 'inherit' },
	);
} catch {
	console.error('\n❌ Benchmark run failed');
	process.exit(1);
}

if (!existsSync(resultsPath)) {
	console.error('\n❌ No benchmark results found');
	process.exit(1);
}

const results = JSON.parse(readFileSync(resultsPath, 'utf-8'));
const benchmarks = collectBenchmarks(results, PACKAGE_DIR);

if (benchmarks.length === 0) {
	console.error('\n❌ Refusing to save baseline: the run produced no benchmark results\n');
	process.exit(1);
}

// Check for failed benchmarks before saving as baseline
let hasFailed = false;
for (const bench of benchmarks) {
	if (bench.failed) {
		console.error(`❌ Benchmark failed (no valid measurements): ${bench.group} > ${bench.name}`);
		hasFailed = true;
	}
}
if (hasFailed) {
	console.error(
		'\n❌ Refusing to save baseline: one or more benchmarks did not produce valid results\n',
	);
	process.exit(1);
}

writeFileSync(baselinePath, JSON.stringify(sanitizePaths(results, PACKAGE_DIR), null, '\t'));
console.log(`\n✅ Saved baseline.json with ${benchmarks.length} benchmarks (paths sanitized)`);
