#!/usr/bin/env node
/**
 * Save Baseline
 *
 * Runs benchmarks and saves results as the new baseline for regression detection.
 * Sanitizes absolute paths so baseline can be committed.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILES_DIR = resolve(__dirname, '../profiles');
const PACKAGE_DIR = resolve(__dirname, '..');

console.log('Running benchmarks...\n');

try {
	execSync('pnpm vitest bench --run --outputJson ./profiles/benchmark-results.json', {
		cwd: PACKAGE_DIR,
		stdio: 'inherit',
	});
} catch {
	console.error('\n❌ Benchmark run failed');
	process.exit(1);
}

const resultsPath = resolve(PROFILES_DIR, 'benchmark-results.json');
const baselinePath = resolve(PROFILES_DIR, 'baseline.json');

if (!existsSync(resultsPath)) {
	console.error('\n❌ No benchmark results found');
	process.exit(1);
}

// Load and sanitize paths
const results = JSON.parse(readFileSync(resultsPath, 'utf-8'));

// Check for failed benchmarks before saving as baseline
let hasFailed = false;
for (const file of results.files) {
	for (const group of file.groups) {
		for (const bench of group.benchmarks) {
			if (bench.hz === undefined || !isFinite(bench.hz)) {
				console.error(`❌ Benchmark failed (no valid measurements): ${group.fullName} > ${bench.name}`);
				hasFailed = true;
			}
		}
	}
}
if (hasFailed) {
	console.error('\n❌ Refusing to save baseline: one or more benchmarks did not produce valid results\n');
	process.exit(1);
}

for (const file of results.files) {
	// Convert absolute path to relative
	if (file.filepath) {
		file.filepath = file.filepath.replace(/^.*\/benchmarks\//, 'benchmarks/');
	}
}

writeFileSync(baselinePath, JSON.stringify(results, null, '\t'));
console.log('\n✅ Saved baseline.json (paths sanitized)');
