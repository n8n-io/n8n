#!/usr/bin/env node

/**
 * Distributes Playwright test specs across shards using greedy bin-packing.
 *
 * The algorithm assigns the heaviest spec to the lightest shard, ensuring
 * balanced execution times across all shards.
 *
 * Usage:
 *   node scripts/distribute-tests.mjs --shards=4 --index=0
 *   node scripts/distribute-tests.mjs --shards=4 --dry-run
 *   node scripts/distribute-tests.mjs --shards=4 --validate
 *
 * Options:
 *   --shards=N     Total number of shards (required)
 *   --index=N      Shard index to output specs for (0-based)
 *   --dry-run      Show distribution plan with estimated durations
 *   --validate     Validate metrics against Playwright test list
 *   --metrics=PATH Path to metrics file (default: .github/test-metrics/playwright.json)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PLAYWRIGHT_DIR = path.join(ROOT_DIR, 'packages', 'testing', 'playwright');
const DEFAULT_METRICS_PATH = path.join(ROOT_DIR, '.github', 'test-metrics', 'playwright.json');

// Default duration for specs not in metrics (30 seconds)
const DEFAULT_DURATION_MS = 30000;

/**
 * Parse command line arguments
 */
function parseArgs() {
	const args = {
		shards: null,
		index: null,
		dryRun: false,
		validate: false,
		metricsPath: DEFAULT_METRICS_PATH,
	};

	for (const arg of process.argv.slice(2)) {
		if (arg.startsWith('--shards=')) {
			args.shards = parseInt(arg.split('=')[1], 10);
		} else if (arg.startsWith('--index=')) {
			args.index = parseInt(arg.split('=')[1], 10);
		} else if (arg === '--dry-run') {
			args.dryRun = true;
		} else if (arg === '--validate') {
			args.validate = true;
		} else if (arg.startsWith('--metrics=')) {
			args.metricsPath = arg.split('=')[1];
		}
	}

	return args;
}

/**
 * Load metrics from JSON file
 */
function loadMetrics(metricsPath) {
	if (!fs.existsSync(metricsPath)) {
		console.error(`Error: Metrics file not found: ${metricsPath}`);
		console.error('Run "node scripts/fetch-currents-metrics.mjs" first to generate metrics.');
		process.exit(1);
	}

	const content = fs.readFileSync(metricsPath, 'utf-8');
	return JSON.parse(content);
}

/**
 * Get specs from Playwright test list for validation
 */
function getPlaywrightSpecs() {
	try {
		const output = execSync('pnpm playwright test --list --project="standard:e2e"', {
			cwd: PLAYWRIGHT_DIR,
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		const specs = new Set();
		const lines = output.split('\n');
		for (const line of lines) {
			const match = line.match(/› (tests\/e2e\/[^\s:]+\.spec\.ts)/);
			if (match) {
				specs.add(match[1]);
			}
		}

		return specs;
	} catch (error) {
		console.error('Error getting Playwright specs:', error.message);
		return null;
	}
}

/**
 * Distribute specs across shards using greedy bin-packing
 * @param {Object} specs - Map of spec path to metrics
 * @param {number} numShards - Number of shards
 * @returns {Array} Array of shard objects with specs and total duration
 */
function distributeSpecs(specs, numShards) {
	// Convert to array and sort by duration (descending)
	const specList = Object.entries(specs)
		.map(([path, data]) => ({
			path,
			duration: data.avgDuration || DEFAULT_DURATION_MS,
			testCount: data.testCount || 0,
		}))
		.sort((a, b) => b.duration - a.duration);

	// Initialize shards
	const shards = Array.from({ length: numShards }, (_, i) => ({
		index: i,
		specs: [],
		totalDuration: 0,
		testCount: 0,
	}));

	// Greedy bin-packing: assign each spec to the lightest shard
	for (const spec of specList) {
		// Find shard with minimum total duration
		const lightestShard = shards.reduce((min, shard) =>
			shard.totalDuration < min.totalDuration ? shard : min
		);

		lightestShard.specs.push(spec);
		lightestShard.totalDuration += spec.duration;
		lightestShard.testCount += spec.testCount;
	}

	return shards;
}

/**
 * Format duration in human readable format
 */
function formatDuration(ms) {
	const minutes = Math.floor(ms / 60000);
	const seconds = ((ms % 60000) / 1000).toFixed(1);
	return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/**
 * Print dry-run output showing distribution plan
 */
function printDryRun(shards, metrics) {
	const totalDuration = shards.reduce((sum, s) => sum + s.totalDuration, 0);
	const totalSpecs = shards.reduce((sum, s) => sum + s.specs.length, 0);
	const totalTests = shards.reduce((sum, s) => sum + s.testCount, 0);
	const maxDuration = Math.max(...shards.map((s) => s.totalDuration));
	const minDuration = Math.min(...shards.map((s) => s.totalDuration));
	const imbalance = ((maxDuration - minDuration) / maxDuration * 100).toFixed(1);

	console.log('═══════════════════════════════════════════════════════════════');
	console.log('                    TEST DISTRIBUTION PLAN');
	console.log('═══════════════════════════════════════════════════════════════');
	console.log(`Metrics updated: ${metrics.updatedAt}`);
	console.log(`Total specs: ${totalSpecs}`);
	console.log(`Total tests: ${totalTests}`);
	console.log(`Total duration: ${formatDuration(totalDuration)}`);
	console.log(`Shards: ${shards.length}`);
	console.log(`Imbalance: ${imbalance}% (max - min)`);
	console.log('');

	// Sort shards by index for display
	const sortedShards = [...shards].sort((a, b) => a.index - b.index);

	console.log('┌─────────┬───────────┬────────┬──────────────────────────────┐');
	console.log('│  Shard  │  Duration │  Specs │  Est. Completion             │');
	console.log('├─────────┼───────────┼────────┼──────────────────────────────┤');

	for (const shard of sortedShards) {
		const bar = '█'.repeat(Math.round(shard.totalDuration / maxDuration * 20));
		const padBar = bar.padEnd(20);
		console.log(
			`│  ${String(shard.index).padStart(3)}    │ ${formatDuration(shard.totalDuration).padStart(9)} │ ${String(shard.specs.length).padStart(6)} │  ${padBar}  │`
		);
	}

	console.log('└─────────┴───────────┴────────┴──────────────────────────────┘');
	console.log('');

	// Show detailed breakdown per shard
	console.log('DETAILED BREAKDOWN:');
	console.log('───────────────────────────────────────────────────────────────');

	for (const shard of sortedShards) {
		console.log(`\nShard ${shard.index} (${formatDuration(shard.totalDuration)}, ${shard.specs.length} specs, ${shard.testCount} tests):`);

		// Sort specs by duration descending for display
		const sortedSpecs = [...shard.specs].sort((a, b) => b.duration - a.duration);

		// Show top 5 longest specs
		const topSpecs = sortedSpecs.slice(0, 5);
		for (const spec of topSpecs) {
			console.log(`  ${formatDuration(spec.duration).padStart(8)} │ ${spec.path}`);
		}

		if (sortedSpecs.length > 5) {
			const remaining = sortedSpecs.length - 5;
			const remainingDuration = sortedSpecs.slice(5).reduce((sum, s) => sum + s.duration, 0);
			console.log(`  ${formatDuration(remainingDuration).padStart(8)} │ ... and ${remaining} more specs`);
		}
	}

	console.log('');
	console.log('═══════════════════════════════════════════════════════════════');
	console.log(`ESTIMATED TIME PER SHARD: ~${formatDuration(maxDuration)}`);
	console.log('═══════════════════════════════════════════════════════════════');
}

/**
 * Validate metrics against Playwright test list
 */
function validateMetrics(metrics) {
	console.log('Validating metrics against Playwright test list...\n');

	const playwrightSpecs = getPlaywrightSpecs();
	if (!playwrightSpecs) {
		console.error('Could not get Playwright specs for validation');
		process.exit(1);
	}

	const metricsSpecs = new Set(Object.keys(metrics.specs));

	// Find specs in Playwright but not in metrics
	const missingFromMetrics = [...playwrightSpecs].filter((s) => !metricsSpecs.has(s));

	// Find specs in metrics but not in Playwright
	const extraInMetrics = [...metricsSpecs].filter((s) => !playwrightSpecs.has(s));

	// Find common specs
	const common = [...playwrightSpecs].filter((s) => metricsSpecs.has(s));

	console.log(`Playwright specs (standard:e2e): ${playwrightSpecs.size}`);
	console.log(`Metrics specs: ${metricsSpecs.size}`);
	console.log(`Common specs: ${common.length}`);
	console.log('');

	let hasIssues = false;

	if (missingFromMetrics.length > 0) {
		hasIssues = true;
		console.log('⚠️  SPECS IN PLAYWRIGHT BUT NOT IN METRICS (will use default duration):');
		for (const spec of missingFromMetrics) {
			console.log(`   - ${spec}`);
		}
		console.log('');
	}

	if (extraInMetrics.length > 0) {
		hasIssues = true;
		console.log('⚠️  SPECS IN METRICS BUT NOT IN PLAYWRIGHT (will be ignored):');
		for (const spec of extraInMetrics) {
			console.log(`   - ${spec}`);
		}
		console.log('');
	}

	if (!hasIssues) {
		console.log('✅ Metrics are in sync with Playwright test list');
	} else {
		console.log('Run "node scripts/fetch-currents-metrics.mjs" to refresh metrics.');
	}

	return !hasIssues;
}

/**
 * Main function
 */
function main() {
	const args = parseArgs();

	// Validate arguments
	if (!args.shards || args.shards < 1) {
		console.error('Error: --shards=N is required (must be >= 1)');
		console.error('');
		console.error('Usage:');
		console.error('  node scripts/distribute-tests.mjs --shards=4 --index=0');
		console.error('  node scripts/distribute-tests.mjs --shards=4 --dry-run');
		console.error('  node scripts/distribute-tests.mjs --shards=4 --validate');
		process.exit(1);
	}

	if (!args.dryRun && !args.validate && (args.index === null || args.index < 0 || args.index >= args.shards)) {
		console.error(`Error: --index must be between 0 and ${args.shards - 1}`);
		process.exit(1);
	}

	// Load metrics
	const metrics = loadMetrics(args.metricsPath);

	// Validate mode
	if (args.validate) {
		const valid = validateMetrics(metrics);
		process.exit(valid ? 0 : 1);
	}

	// Distribute specs
	const shards = distributeSpecs(metrics.specs, args.shards);

	// Dry-run mode
	if (args.dryRun) {
		printDryRun(shards, metrics);
		return;
	}

	// Output specs for requested shard
	const shard = shards.find((s) => s.index === args.index);
	if (!shard) {
		console.error(`Error: Shard ${args.index} not found`);
		process.exit(1);
	}

	// Output spec paths (one per line for easy consumption)
	for (const spec of shard.specs) {
		console.log(spec.path);
	}
}

main();
