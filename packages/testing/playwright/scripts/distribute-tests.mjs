#!/usr/bin/env node

/**
 * Distributes Playwright specs across shards using greedy bin-packing.
 *
 * Usage:
 *   node distribute-tests.mjs <shards> <index>           # Output specs for single shard
 *   node distribute-tests.mjs --matrix <shards>          # Output JSON matrix (empty specs)
 *   node distribute-tests.mjs --matrix <shards> --orchestrate  # Output JSON matrix with distributed specs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../../..');
const METRICS_PATH = path.join(ROOT_DIR, '.github/test-metrics/playwright.json');
const DEFAULT_DURATION = 30000;

const args = process.argv.slice(2);
const matrixMode = args.includes('--matrix');
const orchestrate = args.includes('--orchestrate');
const shards = parseInt(args.find((a) => !a.startsWith('-')));

if (!shards || shards < 1) {
	console.error('Usage: node distribute-tests.mjs <shards> <index>');
	console.error('       node distribute-tests.mjs --matrix <shards> [--orchestrate]');
	process.exit(1);
}

// Distribute specs using greedy bin-packing
function distribute(numShards) {
	const metrics = JSON.parse(fs.readFileSync(METRICS_PATH, 'utf-8'));
	const specs = Object.entries(metrics.specs)
		.map(([p, data]) => ({ path: p, duration: data.avgDuration || DEFAULT_DURATION }))
		.sort((a, b) => b.duration - a.duration);

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
		specs: orchestrate ? buckets[i].specs.join(' ') : '',
	}));
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
