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
const JANITOR_CLI = path.resolve(__dirname, '..', '..', 'janitor', 'dist', 'cli.js');
const CONTAINER_STARTUP_TIME = 22_500; // 22.5s average per fixture

const CAPABILITY_IMAGES = {
	email: ['mailpit'],
	kafka: ['kafka'],
	observability: ['victoriaLogs', 'victoriaMetrics', 'vector', 'jaeger', 'n8nTracer'],
	oidc: ['keycloak'],
	proxy: ['mockserver'],
	'source-control': ['gitea'],
};

const BASE_IMAGES = ['postgres', 'redis', 'caddy', 'n8n', 'taskRunner'];

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

function getOrchestration(numShards, options = {}) {
	const impactFlag = options.impact ? ' --impact' : '';
	const baseFlag = options.base ? ` --base=${options.base}` : '';
	const output = execSync(
		`node ${JANITOR_CLI} orchestrate --shards=${numShards}${impactFlag}${baseFlag}`,
		{ cwd: PLAYWRIGHT_DIR, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
	);
	return JSON.parse(output);
}

const args = process.argv.slice(2);
const matrixMode = args.includes('--matrix');
const orchestrateMode = args.includes('--orchestrate');
const impactMode = args.includes('--impact');
const baseArg = args.find((a) => a.startsWith('--base='))?.slice('--base='.length);
const shards = parseInt(args.find((a) => !a.startsWith('-')) ?? '');

if (!shards || shards < 1) {
	console.error('Usage: node distribute-tests.mjs --matrix <shards> [--orchestrate] [--impact]');
	console.error('       node distribute-tests.mjs <shards> <index>');
	process.exit(1);
}

if (matrixMode) {
	if (!orchestrateMode) {
		const matrix = Array.from({ length: shards }, (_, i) => ({
			shard: i + 1,
			specs: '',
			images: '',
		}));
		console.log(JSON.stringify(matrix));
	} else {
		const result = getOrchestration(shards, { impact: impactMode, base: baseArg });

		if (result.shards.length === 0) {
			console.error('\n⏭️  No specs to run — all filtered out by discovery/impact. Skipping.\n');
			console.log(JSON.stringify([{ shard: 1, specs: '', images: '' }]));
		} else {
			console.error('\n📊 Shard Distribution:');
			let maxShardTime = 0;
			for (const shard of result.shards) {
				const overhead = shard.fixtureCount * CONTAINER_STARTUP_TIME;
				const totalTime = shard.testTime + overhead;
				maxShardTime = Math.max(maxShardTime, totalTime);
				const testMins = (shard.testTime / 60_000).toFixed(1);
				const totalMins = (totalTime / 60_000).toFixed(1);
				const caps =
					shard.capabilities.length > 0 ? ` [${shard.capabilities.join(', ')}]` : '';
				console.error(
					`  Shard ${shard.shard}: ${shard.specs.length} specs, ${testMins} min test + ${(overhead / 1000).toFixed(0)}s startup = ${totalMins} min${caps}`,
				);
			}
			const totalTestMins = (result.totalTestTime / 60_000).toFixed(1);
			console.error(`\n  Total test time: ${totalTestMins} min`);
			console.error(
				`  Expected wall-clock: ~${(maxShardTime / 60_000).toFixed(1)} min (longest shard)\n`,
			);

			const matrix = result.shards.map((shard) => ({
				shard: shard.shard,
				specs: shard.specs.join(' '),
				images: getRequiredImages(shard.capabilities).join(' '),
			}));
			console.log(JSON.stringify(matrix));
		}
	}
} else {
	const index = parseInt(args[1]);
	if (isNaN(index) || index < 0 || index >= shards) {
		console.error(`Index must be between 0 and ${shards - 1}`);
		process.exit(1);
	}
	const result = getOrchestration(shards, { impact: impactMode, base: baseArg });
	const shard = result.shards[index];
	if (shard) {
		console.log(shard.specs.join('\n'));
	}
}
