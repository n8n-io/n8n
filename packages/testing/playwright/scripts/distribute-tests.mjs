#!/usr/bin/env node
// @ts-check

/**
 * Distributes Playwright specs across shards using greedy bin-packing.
 *
 * Usage:
 *   node distribute-tests.mjs <shards> <index>           # Output specs for single shard
 *   node distribute-tests.mjs --matrix <shards>          # Output JSON matrix (empty specs)
 *   node distribute-tests.mjs --matrix <shards> --orchestrate  # Output JSON matrix with distributed specs
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../../..');
const METRICS_PATH = path.join(ROOT_DIR, '.github/test-metrics/playwright.json');
const PLAYWRIGHT_DIR = path.resolve(__dirname, '..');
const DEFAULT_DURATION = 60000; // 1 minute default (accounts for container startup)
const E2E_PROJECT = 'multi-main:e2e';

const args = process.argv.slice(2);
const matrixMode = args.includes('--matrix');
const orchestrate = args.includes('--orchestrate');
const shards = parseInt(args.find((a) => !a.startsWith('-')) ?? '');

if (!shards || shards < 1) {
	console.error('Usage: node distribute-tests.mjs <shards> <index>');
	console.error('       node distribute-tests.mjs --matrix <shards> [--orchestrate]');
	process.exit(1);
}

/**
 * Get spec files from Playwright test --list output
 * @returns {string[]} Array of spec file paths
 */
function getSpecsFromPlaywright() {
	const output = execSync(`pnpm playwright test --list --project="${E2E_PROJECT}"`, {
		cwd: PLAYWRIGHT_DIR,
		encoding: 'utf-8',
		stdio: ['pipe', 'pipe', 'pipe'],
	});

	// Parse output: "[multi-main:e2e] › tests/e2e/path/spec.ts:line:col › test name"
	const specPaths = new Set();
	for (const line of output.split('\n')) {
		const match = line.match(/› (tests\/e2e\/[^:]+\.spec\.ts):/);
		if (match) {
			specPaths.add(match[1]);
		}
	}
	return [...specPaths];
}

/**
 * Distribute specs using greedy bin-packing
 * @param {number} numShards
 */
function distribute(numShards) {
	const metrics = JSON.parse(fs.readFileSync(METRICS_PATH, 'utf-8'));

	// Get specs from Playwright (respects project config, grep/grepInvert patterns)
	const allSpecs = getSpecsFromPlaywright();

	if (allSpecs.length === 0) {
		console.error('Error: No spec files found. Check Playwright config and project name.');
		process.exit(1);
	}

	// Use metrics for duration estimates, default 30s for new specs
	const specs = allSpecs
		.map((specPath) => ({
			path: specPath,
			duration: metrics.specs?.[specPath]?.avgDuration || DEFAULT_DURATION,
		}))
		.sort((a, b) => b.duration - a.duration);

	/**
	 * @type Array<{specs: string[]; total:number}>
	 */
	const buckets = Array.from({ length: numShards }, () => ({ specs: [], total: 0 }));
	for (const spec of specs) {
		const lightest = buckets.reduce((min, b) => (b.total < min.total ? b : min));
		lightest.specs.push(spec.path);
		lightest.total += spec.duration;
	}
	return buckets;
}

if (matrixMode) {
	const buckets = orchestrate ? distribute(shards) : null;
	const matrix = Array.from({ length: shards }, (_, i) => ({
		shard: i + 1,
		specs: orchestrate ? (buckets?.[i].specs.join(' ') ?? '') : '',
	}));

	if (orchestrate && buckets) {
		console.error('\n📊 Shard Distribution:');
		for (let i = 0; i < buckets.length; i++) {
			const mins = (buckets[i].total / 60000).toFixed(1);
			console.error(`  Shard ${i + 1}: ${buckets[i].specs.length} specs, ~${mins} min`);
		}
		const totalMins = (buckets.reduce((sum, b) => sum + b.total, 0) / 60000).toFixed(1);
		console.error(`  Total: ${totalMins} min across ${shards} shards\n`);
	}

	console.log(JSON.stringify(matrix));
} else {
	const index = parseInt(args[1]);
	if (isNaN(index) || index < 0 || index >= shards) {
		console.error(`Index must be between 0 and ${shards - 1}`);
		process.exit(1);
	}
	const buckets = distribute(shards);
	console.log(buckets[index].specs.join('\n'));
}
