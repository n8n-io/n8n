#!/usr/bin/env node
// @ts-check

/**
 * n8n CI Adapter for Test Distribution
 *
 * Thin wrapper that calls `janitor orchestrate` for generic shard distribution,
 * then maps capabilities to n8n-specific Docker images for the CI matrix.
 *
 * Usage:
 *   node distribute-tests.mjs --matrix <shards> --orchestrate  # GitHub Actions matrix with images
 *   node distribute-tests.mjs --matrix <shards>                # Simple matrix (no distribution)
 *   node distribute-tests.mjs <shards> <index>                 # Specs for a single shard
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYWRIGHT_DIR = path.resolve(__dirname, '..');
const CONTAINER_STARTUP_TIME = 22_500; // 22.5s average per fixture

/** Maps capability names to required Docker container images */
const CAPABILITY_IMAGES = {
	email: ['mailpit'],
	kafka: ['kafka'],
	observability: ['victoriaLogs', 'victoriaMetrics', 'vector', 'jaeger', 'n8nTracer'],
	oidc: ['keycloak'],
	proxy: ['mockserver'],
	'source-control': ['gitea'],
};

/** Base images needed by all E2E tests */
const BASE_IMAGES = ['postgres', 'redis', 'caddy', 'n8n', 'taskRunner'];

/**
 * Get required Docker images for a shard based on its capabilities
 * @param {string[]} capabilities
 * @returns {string[]}
 */
function getRequiredImages(capabilities) {
	const images = new Set(BASE_IMAGES);
	for (const cap of capabilities) {
		const capImages = CAPABILITY_IMAGES[cap];
		if (capImages) {
			for (const img of capImages) images.add(img);
		}
	}
	return [...images].sort();
}

/**
 * Call janitor orchestrate and get shard assignments
 * @param {number} numShards
 * @returns {{ shards: Array<{ shard: number, specs: string[], testTime: number, capabilities: string[], fixtureCount: number }>, totalTestTime: number }}
 */
function getOrchestration(numShards) {
	const output = execSync(
		`pnpm exec playwright-janitor orchestrate --shards=${numShards} --json`,
		{ cwd: PLAYWRIGHT_DIR, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
	);
	// pnpm exec may print headers — extract JSON from first '{'
	const jsonStart = output.indexOf('{');
	const json = jsonStart >= 0 ? output.slice(jsonStart) : output;
	return JSON.parse(json);
}

const args = process.argv.slice(2);
const matrixMode = args.includes('--matrix');
const orchestrateMode = args.includes('--orchestrate');
const shards = parseInt(args.find((a) => !a.startsWith('-')) ?? '');

if (!shards || shards < 1) {
	console.error('Usage: node distribute-tests.mjs --matrix <shards> [--orchestrate]');
	console.error('       node distribute-tests.mjs <shards> <index>');
	process.exit(1);
}

if (matrixMode) {
	if (!orchestrateMode) {
		// Simple matrix — let Playwright handle sharding
		const matrix = Array.from({ length: shards }, (_, i) => ({
			shard: i + 1,
			specs: '',
			images: '',
		}));
		console.log(JSON.stringify(matrix));
	} else {
		// Orchestrated matrix — janitor distributes (specFilter handles e2e-only), we map images
		const result = getOrchestration(shards);

		// Log n8n-specific diagnostics (container overhead)
		console.error('\n📊 Shard Distribution:');
		let maxShardTime = 0;
		for (const shard of result.shards) {
			const overhead = shard.fixtureCount * CONTAINER_STARTUP_TIME;
			const totalTime = shard.testTime + overhead;
			maxShardTime = Math.max(maxShardTime, totalTime);
			const testMins = (shard.testTime / 60_000).toFixed(1);
			const totalMins = (totalTime / 60_000).toFixed(1);
			const caps = shard.capabilities.length > 0 ? ` [${shard.capabilities.join(', ')}]` : '';
			console.error(
				`  Shard ${shard.shard}: ${shard.specs.length} specs, ${testMins} min test + ${(overhead / 1000).toFixed(0)}s startup = ${totalMins} min${caps}`,
			);
		}
		const totalTestMins = (result.totalTestTime / 60_000).toFixed(1);
		console.error(`\n  Total test time: ${totalTestMins} min`);
		console.error(`  Expected wall-clock: ~${(maxShardTime / 60_000).toFixed(1)} min (longest shard)\n`);

		// Output GitHub Actions matrix
		const matrix = result.shards.map((shard) => ({
			shard: shard.shard,
			specs: shard.specs.join(' '),
			images: getRequiredImages(shard.capabilities).join(' '),
		}));
		console.log(JSON.stringify(matrix));
	}
} else {
	const index = parseInt(args[1]);
	if (isNaN(index) || index < 0 || index >= shards) {
		console.error(`Index must be between 0 and ${shards - 1}`);
		process.exit(1);
	}
	const result = getOrchestration(shards);
	console.log(result.shards[index].specs.join('\n'));
}
