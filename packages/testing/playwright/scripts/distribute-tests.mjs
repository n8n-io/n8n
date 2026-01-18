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
const CONTAINER_STARTUP_TIME = 20000; // 20 seconds per container type
const MAX_GROUP_DURATION = 5 * 60 * 1000; // 5 minutes - split groups larger than this

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

	// Calculate effective durations for capability groups
	// When grouped, only first test pays container startup - rest reuse worker
	// If a group exceeds MAX_GROUP_DURATION, split it into smaller sub-groups
	/** @type {Array<{type: string, capability: string, specs: string[], reportedDuration: number, effectiveDuration: number, startupSavings: number, subGroup?: number}>} */
	const capabilityItems = [];

	for (const [capability, specs] of capabilityGroups.entries()) {
		// Sort specs by duration (largest first) for better splitting
		specs.sort((a, b) => b.duration - a.duration);

		const reportedDuration = specs.reduce((sum, s) => sum + s.duration, 0);
		// Calculate effective duration: each spec's actual time (minus startup) + one startup
		const actualTestTime = reportedDuration - specs.length * CONTAINER_STARTUP_TIME;
		const effectiveDuration = actualTestTime + CONTAINER_STARTUP_TIME;

		// Check if we need to split this group
		if (effectiveDuration > MAX_GROUP_DURATION && specs.length > 1) {
			// Calculate how many sub-groups we need
			const numSubGroups = Math.ceil(effectiveDuration / MAX_GROUP_DURATION);
			const targetPerSubGroup = effectiveDuration / numSubGroups;

			// Greedy split: fill each sub-group up to target
			let currentSubGroup = 0;
			let currentTotal = 0;
			/** @type {typeof specs[]} */
			const subGroups = [[]];

			for (const spec of specs) {
				const specActualTime = spec.duration - CONTAINER_STARTUP_TIME;

				// Start new sub-group if current is full (unless it's empty)
				if (currentTotal + specActualTime > targetPerSubGroup && subGroups[currentSubGroup].length > 0) {
					currentSubGroup++;
					subGroups[currentSubGroup] = [];
					currentTotal = 0;
				}

				subGroups[currentSubGroup].push(spec);
				currentTotal += specActualTime;
			}

			// Create items for each sub-group
			for (let i = 0; i < subGroups.length; i++) {
				const subGroupSpecs = subGroups[i];
				const subReported = subGroupSpecs.reduce((sum, s) => sum + s.duration, 0);
				const subActual = subReported - subGroupSpecs.length * CONTAINER_STARTUP_TIME;
				const subEffective = subActual + CONTAINER_STARTUP_TIME; // Each sub-group pays one startup

				capabilityItems.push({
					type: 'capability',
					capability,
					specs: subGroupSpecs.map((s) => s.path),
					reportedDuration: subReported,
					effectiveDuration: subEffective,
					startupSavings: (subGroupSpecs.length - 1) * CONTAINER_STARTUP_TIME,
					subGroup: i + 1,
				});
			}
		} else {
			// Keep as single group
			capabilityItems.push({
				type: 'capability',
				capability,
				specs: specs.map((s) => s.path),
				reportedDuration,
				effectiveDuration,
				startupSavings: (specs.length - 1) * CONTAINER_STARTUP_TIME,
			});
		}
	}

	// Standard specs keep their reported duration (no grouping benefit)
	const standardItems = standardSpecs.map((spec) => ({
		type: 'standard',
		capability: null,
		specs: [spec.path],
		reportedDuration: spec.duration,
		effectiveDuration: spec.duration,
		startupSavings: 0,
	}));

	// Combine and sort by effective duration (largest first for greedy packing)
	const allItems = [...capabilityItems, ...standardItems].sort(
		(a, b) => b.effectiveDuration - a.effectiveDuration,
	);

	// Calculate totals for reporting
	const totalEffective = allItems.reduce((sum, item) => sum + item.effectiveDuration, 0);
	const totalReported = allItems.reduce((sum, item) => sum + item.reportedDuration, 0);
	const totalSavings = capabilityItems.reduce((sum, item) => sum + item.startupSavings, 0);
	const targetPerShard = totalEffective / numShards;

	console.error('\n📦 Capability-Aware Distribution:');
	console.error(`  Reported total: ${(totalReported / 60000).toFixed(1)} min`);
	console.error(`  Effective total: ${(totalEffective / 60000).toFixed(1)} min (after grouping)`);
	console.error(`  Worker reuse savings: ${(totalSavings / 1000).toFixed(0)}s`);
	console.error(`  Target per shard: ${(targetPerShard / 60000).toFixed(1)} min\n`);

	// Report capability groups
	console.error('  Capability groups (treated as atomic units):');
	for (const item of capabilityItems) {
		const reported = (item.reportedDuration / 60000).toFixed(1);
		const effective = (item.effectiveDuration / 60000).toFixed(1);
		const saved = (item.startupSavings / 1000).toFixed(0);
		console.error(`    ${item.capability}: ${item.specs.length} specs, ${reported} min → ${effective} min (saved ${saved}s)`);
	}
	console.error(`  Standard specs: ${standardItems.length} specs\n`);

	// Initialize buckets
	/** @type {Array<{specs: string[]; total: number; capabilities: Set<string>}>} */
	const buckets = Array.from({ length: numShards }, () => ({
		specs: [],
		total: 0,
		capabilities: new Set(),
	}));

	// Greedy bin-packing: assign each item to the lightest bucket
	for (const item of allItems) {
		const lightest = buckets.reduce((min, b) => (b.total < min.total ? b : min));

		// Add all specs from this item to the bucket
		for (const specPath of item.specs) {
			lightest.specs.push(specPath);
		}
		lightest.total += item.effectiveDuration;

		if (item.capability) {
			lightest.capabilities.add(item.capability);
		}
	}

	// Report container optimization
	const simpleContainers = capabilityItems.reduce((sum, item) => {
		// Estimate: with simple distribution, specs spread across ~70% of shards
		return sum + Math.min(numShards, Math.ceil(item.specs.length * 0.7));
	}, 0);

	const optimizedContainers = capabilityItems.reduce((sum, item) => {
		// Count actual shards with this capability
		return sum + buckets.filter((b) => b.capabilities.has(item.capability)).length;
	}, 0);

	console.error('  Container optimization:');
	console.error(`    Simple distribution: ~${simpleContainers} container starts`);
	console.error(`    Capability-aware: ${optimizedContainers} container starts`);
	console.error(`    Containers saved: ~${simpleContainers - optimizedContainers}`);
	console.error(`    Total time saved: ~${((totalSavings + (simpleContainers - optimizedContainers) * CONTAINER_STARTUP_TIME) / 1000).toFixed(0)}s\n`);

	return buckets;
}

/**
 * Main distribution function
 * @param {number} numShards
 */
function distribute(numShards) {
	return distributeCapabilityAware(numShards);
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
			const caps = buckets[i].capabilities.size > 0 ? ` [${[...buckets[i].capabilities].join(', ')}]` : '';
			console.error(`  Shard ${i + 1}: ${buckets[i].specs.length} specs, ~${mins} min${caps}`);
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
