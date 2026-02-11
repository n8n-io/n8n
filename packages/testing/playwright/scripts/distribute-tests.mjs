#!/usr/bin/env node
// @ts-check

/**
 * Distributes Playwright specs across shards using capability-aware bin-packing.
 *
 * Algorithm:
 * 1. Group specs by capability (proxy, source-control, email, etc.)
 * 2. Calculate effective duration (accounts for container startup reuse)
 * 3. Split large groups (>5 min) into smaller sub-groups
 * 4. Assign groups + standard specs using greedy bin-packing
 *
 * This minimizes container startup overhead by keeping tests that need the same
 * container on the same shard, enabling Playwright worker reuse.
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
const CONTAINER_STARTUP_TIME = 22500; // 22.5 seconds average (heavier stacks with extra services take longer)
const MAX_GROUP_DURATION = 5 * 60 * 1000; // 5 minutes - split groups larger than this

/** Maps capability tags to required container images */
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
 * Get spec files and their capabilities from Playwright test --list output
 * @returns {{path: string, capabilities: string[]}[]} Array of spec info
 */
function getSpecsFromPlaywright() {
	const output = execSync(`pnpm playwright test --list --project="${E2E_PROJECT}" --grep-invert "@fixme"`, {
		cwd: PLAYWRIGHT_DIR,
		encoding: 'utf-8',
		stdio: ['pipe', 'pipe', 'pipe'],
	});

	// Parse output: "[multi-main:e2e] › tests/e2e/path/spec.ts:line:col › describe @capability:xxx › test"
	/** @type {Map<string, Set<string>>} */
	const specCapabilities = new Map();

	for (const line of output.split('\n')) {
		const specMatch = line.match(/› (tests\/e2e\/[^:]+\.spec\.ts):/);
		if (specMatch) {
			const specPath = specMatch[1];
			if (!specCapabilities.has(specPath)) {
				specCapabilities.set(specPath, new Set());
			}

			// Extract @capability:xxx tags from the test description
			const capMatches = line.matchAll(/@capability:(\w+[-\w]*)/g);
			for (const match of capMatches) {
				specCapabilities.get(specPath)?.add(match[1]);
			}
		}
	}

	return [...specCapabilities.entries()].map(([path, caps]) => ({
		path,
		capabilities: [...caps],
	}));
}

/**
 * Distribute specs using capability-aware bin-packing
 *
 * Key insight: Reported test durations include container startup overhead.
 * When tests are grouped (same capability on same shard), only ONE test pays
 * the startup cost - the rest reuse the worker. So we:
 *
 * 1. Calculate "effective duration" for capability groups (removes redundant startup)
 * 2. Treat each capability group as an atomic unit for bin-packing
 * 3. Use greedy bin-packing on groups + standard specs together
 *
 * @param {number} numShards
 */
function distributeCapabilityAware(numShards) {
	const metrics = JSON.parse(fs.readFileSync(METRICS_PATH, 'utf-8'));
	const allSpecs = getSpecsFromPlaywright();

	if (allSpecs.length === 0) {
		console.error('Error: No spec files found. Check Playwright config and project name.');
		process.exit(1);
	}

	// Add duration info
	const specsWithDuration = allSpecs.map((spec) => ({
		...spec,
		duration: metrics.specs?.[spec.path]?.avgDuration || DEFAULT_DURATION,
	}));

	// Group specs by capability (specs can only have one capability in practice)
	/** @type {Map<string, typeof specsWithDuration>} */
	const capabilityGroups = new Map();
	/** @type {typeof specsWithDuration} */
	const standardSpecs = [];

	for (const spec of specsWithDuration) {
		if (spec.capabilities.length > 0) {
			// Use first capability as the grouping key
			const cap = spec.capabilities[0];
			if (!capabilityGroups.has(cap)) {
				capabilityGroups.set(cap, []);
			}
			capabilityGroups.get(cap)?.push(spec);
		} else {
			standardSpecs.push(spec);
		}
	}

	// Group capability specs together - container startup is per-shard overhead, not per-spec
	// Currents avgDuration = actual test time, container startup is separate
	// If a group exceeds MAX_GROUP_DURATION, split it into smaller sub-groups
	/** @type {Array<{type: string, capability: string, specs: string[], duration: number, subGroup?: number}>} */
	const capabilityItems = [];

	for (const [capability, specs] of capabilityGroups.entries()) {
		// Sort specs by duration (largest first) for better splitting
		specs.sort((a, b) => b.duration - a.duration);

		const totalDuration = specs.reduce((sum, s) => sum + s.duration, 0);

		// Check if we need to split this group
		if (totalDuration > MAX_GROUP_DURATION && specs.length > 1) {
			// Calculate how many sub-groups we need
			const numSubGroups = Math.ceil(totalDuration / MAX_GROUP_DURATION);
			const targetPerSubGroup = totalDuration / numSubGroups;

			// Greedy split: fill each sub-group up to target
			let currentSubGroup = 0;
			let currentTotal = 0;
			/** @type {typeof specs[]} */
			const subGroups = [[]];

			for (const spec of specs) {
				// Start new sub-group if current is full (unless it's empty)
				if (currentTotal + spec.duration > targetPerSubGroup && subGroups[currentSubGroup].length > 0) {
					currentSubGroup++;
					subGroups[currentSubGroup] = [];
					currentTotal = 0;
				}

				subGroups[currentSubGroup].push(spec);
				currentTotal += spec.duration;
			}

			// Create items for each sub-group
			for (let i = 0; i < subGroups.length; i++) {
				const subGroupSpecs = subGroups[i];
				const subDuration = subGroupSpecs.reduce((sum, s) => sum + s.duration, 0);

				capabilityItems.push({
					type: 'capability',
					capability,
					specs: subGroupSpecs.map((s) => s.path),
					duration: subDuration,
					subGroup: i + 1,
				});
			}
		} else {
			// Keep as single group
			capabilityItems.push({
				type: 'capability',
				capability,
				specs: specs.map((s) => s.path),
				duration: totalDuration,
			});
		}
	}

	// Standard specs - each is its own item
	const standardItems = standardSpecs.map((spec) => ({
		type: 'standard',
		capability: null,
		specs: [spec.path],
		duration: spec.duration,
	}));

	// Combine and sort by duration (largest first for greedy packing)
	const allItems = [...capabilityItems, ...standardItems].sort((a, b) => b.duration - a.duration);

	// Calculate totals for reporting
	const totalTestTime = allItems.reduce((sum, item) => sum + item.duration, 0);
	const targetPerShard = totalTestTime / numShards;

	console.error('\n📦 Capability-Aware Distribution:');
	console.error(`  Total test time: ${(totalTestTime / 60000).toFixed(1)} min`);
	console.error(`  Target per shard: ${(targetPerShard / 60000).toFixed(1)} min\n`);

	// Report capability groups
	console.error('  Capability groups:');
	for (const item of capabilityItems) {
		const mins = (item.duration / 60000).toFixed(1);
		const subGroupLabel = item.subGroup ? ` (part ${item.subGroup})` : '';
		console.error(`    ${item.capability}${subGroupLabel}: ${item.specs.length} specs, ${mins} min`);
	}
	console.error(`  Standard specs: ${standardItems.length} specs\n`);

	// Initialize buckets
	/** @type {Array<{specs: string[]; testTime: number; capabilities: Set<string>; hasStandardSpecs: boolean}>} */
	const buckets = Array.from({ length: numShards }, () => ({
		specs: [],
		testTime: 0,
		capabilities: new Set(),
		hasStandardSpecs: false,
	}));

	// Greedy bin-packing: assign each item to the lightest bucket
	for (const item of allItems) {
		const lightest = buckets.reduce((min, b) => (b.testTime < min.testTime ? b : min));

		// Add all specs from this item to the bucket
		for (const specPath of item.specs) {
			lightest.specs.push(specPath);
		}
		lightest.testTime += item.duration;

		if (item.capability) {
			lightest.capabilities.add(item.capability);
		} else {
			lightest.hasStandardSpecs = true;
		}
	}

	// Calculate container starts per shard: unique capabilities + 1 for default if has standard specs
	const containerStartsPerShard = buckets.map((b) => b.capabilities.size + (b.hasStandardSpecs ? 1 : 0));
	const totalContainerStarts = containerStartsPerShard.reduce((sum, c) => sum + c, 0);
	const totalContainerOverhead = totalContainerStarts * CONTAINER_STARTUP_TIME;

	// Estimate simple distribution: capabilities spread across ~70% of shards + default container per shard
	const simpleCapabilityContainers = capabilityItems.reduce((sum, item) => {
		return sum + Math.min(numShards, Math.ceil(item.specs.length * 0.7));
	}, 0);
	const simpleDefaultContainers = numShards; // Every shard would have standard specs
	const simpleContainers = simpleCapabilityContainers + simpleDefaultContainers;
	const containersSaved = simpleContainers - totalContainerStarts;

	console.error('  Container starts per shard:');
	for (let i = 0; i < buckets.length; i++) {
		const caps = buckets[i].capabilities.size;
		const def = buckets[i].hasStandardSpecs ? 1 : 0;
		const containerCount = caps + def;
		const overhead = containerCount * CONTAINER_STARTUP_TIME;
		const totalTime = buckets[i].testTime + overhead;
		const details = [
			...[...buckets[i].capabilities],
			...(buckets[i].hasStandardSpecs ? ['default'] : []),
		].join(', ');
		console.error(`    Shard ${i + 1}: ${containerCount} containers (${details}) → +${(overhead / 1000).toFixed(0)}s overhead`);
	}
	console.error(`\n  Container optimization:`);
	console.error(`    Simple distribution: ~${simpleContainers} container starts`);
	console.error(`    Capability-aware: ${totalContainerStarts} container starts`);
	console.error(`    Containers saved: ~${containersSaved}`);
	console.error(`    Time saved: ~${((containersSaved * CONTAINER_STARTUP_TIME) / 1000).toFixed(0)}s\n`);

	return buckets;
}

/**
 * Main distribution function
 * @param {number} numShards
 */
function distribute(numShards) {
	return distributeCapabilityAware(numShards);
}

/**
 * Get required images for a bucket based on its capabilities
 * @param {{capabilities: Set<string>}} bucket
 * @returns {string[]}
 */
function getRequiredImages(bucket) {
	const images = new Set(BASE_IMAGES);
	for (const cap of bucket.capabilities) {
		const capImages = CAPABILITY_IMAGES[cap];
		if (capImages) {
			for (const img of capImages) images.add(img);
		}
	}
	return [...images].sort();
}

if (matrixMode) {
	const buckets = orchestrate ? distribute(shards) : null;
	const matrix = Array.from({ length: shards }, (_, i) => ({
		shard: i + 1,
		specs: orchestrate ? (buckets?.[i].specs.join(' ') ?? '') : '',
		images: orchestrate && buckets ? getRequiredImages(buckets[i]).join(' ') : '',
	}));

	if (orchestrate && buckets) {
		console.error('\n📊 Shard Distribution:');
		let maxShardTime = 0;
		for (let i = 0; i < buckets.length; i++) {
			const containerCount = buckets[i].capabilities.size + (buckets[i].hasStandardSpecs ? 1 : 0);
			const overhead = containerCount * CONTAINER_STARTUP_TIME;
			const totalTime = buckets[i].testTime + overhead;
			maxShardTime = Math.max(maxShardTime, totalTime);
			const testMins = (buckets[i].testTime / 60000).toFixed(1);
			const totalMins = (totalTime / 60000).toFixed(1);
			const caps = buckets[i].capabilities.size > 0 ? ` [${[...buckets[i].capabilities].join(', ')}]` : '';
			console.error(`  Shard ${i + 1}: ${buckets[i].specs.length} specs, ${testMins} min test + ${(overhead / 1000).toFixed(0)}s startup = ${totalMins} min${caps}`);
		}
		const totalTestMins = (buckets.reduce((sum, b) => sum + b.testTime, 0) / 60000).toFixed(1);
		console.error(`\n  Total test time: ${totalTestMins} min`);
		console.error(`  Expected wall-clock: ~${(maxShardTime / 60000).toFixed(1)} min (longest shard)\n`);
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
