#!/usr/bin/env node

/**
 * Fetches test duration metrics from Currents API and outputs them in the format
 * required for custom test orchestration.
 *
 * This script fetches individual TEST durations (not spec durations) because
 * with fullyParallel mode, tests from the same spec can run on different machines,
 * making spec-level duration inaccurate for orchestration purposes.
 *
 * Usage:
 *   CURRENTS_API_KEY=<key> node scripts/fetch-currents-metrics.mjs
 *   CURRENTS_API_KEY=<key> node scripts/fetch-currents-metrics.mjs --project=qyhJh8
 *
 * Options:
 *   --project=ID   Currents project ID (default: I0yzoc)
 *
 * Output: writes to .github/test-metrics/playwright.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PLAYWRIGHT_DIR = path.join(ROOT_DIR, 'packages', 'testing', 'playwright');
const OUTPUT_PATH = path.join(ROOT_DIR, '.github', 'test-metrics', 'playwright.json');

// Configuration
const CURRENTS_API_BASE = 'https://api.currents.dev/v1';
const DEFAULT_PROJECT_ID = 'I0yzoc'; // n8n production project
const PAGE_SIZE = 50;

// Parse command line arguments
function getProjectId() {
	for (const arg of process.argv.slice(2)) {
		if (arg.startsWith('--project=')) {
			return arg.split('=')[1];
		}
	}
	return DEFAULT_PROJECT_ID;
}

const PROJECT_ID = getProjectId();

// Default duration for new tests with no data (30 seconds in ms)
// This ensures new tests are distributed to the lightest shard
const DEFAULT_DURATION_MS = 30000;

// Patterns to exclude from orchestration metrics
const EXCLUDE_PATTERNS = [
	/^tests\/performance\//,
	/^tests\/infrastructure\//, // chaos, observability, etc.
	/^tests\/ui\//, // Historical path, now renamed to tests/e2e/
];

/**
 * Gets the list of valid spec files from the standard:e2e project.
 * This excludes isolated/serial tests which run on separate workers.
 */
function getValidSpecsFromPlaywright() {
	console.log('Getting valid specs from Playwright standard:e2e project...');
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

		console.log(`  Found ${specs.size} specs in standard:e2e project`);
		return specs;
	} catch (error) {
		console.warn('Warning: Could not get specs from Playwright, skipping validation');
		console.warn(`  Error: ${error.message}`);
		return null;
	}
}

/**
 * Fetches individual test performance data from Currents API
 * @see https://docs.currents.dev/api/resources/tests-explorer
 */
async function fetchTestMetrics(apiKey, page = 0) {
	const url = new URL(`${CURRENTS_API_BASE}/tests/${PROJECT_ID}`);
	url.searchParams.set('limit', PAGE_SIZE.toString());
	url.searchParams.set('page', page.toString());
	url.searchParams.set('order', 'duration');
	url.searchParams.set('dir', 'desc');

	// Fetch last 30 days of data for more accurate averages
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	url.searchParams.set('date_start', thirtyDaysAgo.toISOString());
	url.searchParams.set('date_end', new Date().toISOString());

	const response = await fetch(url.toString(), {
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		throw new Error(`Currents API error: ${response.status} ${response.statusText}`);
	}

	return response.json();
}

/**
 * Fetches all test metrics with pagination
 */
async function fetchAllTestMetrics(apiKey) {
	const allTests = [];
	let page = 0;
	let hasMore = true;

	console.log('Fetching test metrics from Currents API...');

	while (hasMore) {
		const result = await fetchTestMetrics(apiKey, page);

		if (result.status !== 'OK') {
			throw new Error(`Currents API returned error status: ${result.status}`);
		}

		allTests.push(...result.data.list);
		console.log(`  Page ${page + 1}: fetched ${result.data.list.length} tests (total: ${allTests.length}/${result.data.total})`);

		hasMore = result.data.nextPage !== false && result.data.nextPage !== undefined;
		page++;

		// Safety limit to prevent infinite loops
		if (page > 200) {
			console.warn('Warning: Reached page limit, stopping pagination');
			break;
		}
	}

	return allTests;
}

/**
 * Checks if a spec should be excluded from orchestration
 */
function shouldExcludeSpec(specPath) {
	for (const pattern of EXCLUDE_PATTERNS) {
		if (pattern.test(specPath)) {
			return true;
		}
	}
	return false;
}

/**
 * Groups tests by spec file and calculates total duration per spec
 * This gives us accurate execution time for orchestration (sum of individual test durations)
 */
function aggregateTestsBySpec(tests) {
	const specMap = new Map();

	for (const test of tests) {
		const specPath = test.spec;

		// Skip excluded specs
		if (shouldExcludeSpec(specPath)) {
			continue;
		}

		if (!specMap.has(specPath)) {
			specMap.set(specPath, {
				totalDuration: 0,
				testCount: 0,
				totalExecutions: 0,
				totalFlaky: 0,
			});
		}

		const spec = specMap.get(specPath);
		spec.totalDuration += test.metrics.avgDurationMs;
		spec.testCount += 1;
		spec.totalExecutions += test.metrics.executions;
		spec.totalFlaky += test.metrics.flaky;
	}

	return specMap;
}

/**
 * Transforms aggregated spec data to our metrics schema
 * @param {Map} specMap - Map of spec paths to aggregated data
 * @param {Set|null} validSpecs - Set of valid spec paths from Playwright, or null to skip validation
 */
function transformToMetricsSchema(specMap, validSpecs) {
	const specsOutput = {};
	let defaultsApplied = 0;
	let skippedInvalid = 0;

	for (const [specPath, data] of specMap) {
		// Skip specs that aren't in the valid set (deleted/isolated specs)
		if (validSpecs && !validSpecs.has(specPath)) {
			skippedInvalid++;
			continue;
		}

		const rawDuration = Math.round(data.totalDuration);

		// Use default duration if spec has no meaningful data
		// (< 1 second total or very few executions)
		const avgExecutionsPerTest = data.totalExecutions / data.testCount;
		const needsDefault = rawDuration < 1000 || avgExecutionsPerTest < 3;
		const totalDuration = needsDefault ? DEFAULT_DURATION_MS : rawDuration;

		if (needsDefault) {
			defaultsApplied++;
		}

		// Calculate flaky rate across all tests in spec
		const flakyRate = data.totalExecutions > 0
			? data.totalFlaky / data.totalExecutions
			: 0;

		specsOutput[specPath] = {
			avgDuration: totalDuration,
			testCount: data.testCount,
			flakyRate: Math.round(flakyRate * 10000) / 10000, // Round to 4 decimal places
		};
	}

	if (skippedInvalid > 0) {
		console.log(`  Skipped ${skippedInvalid} specs not in standard:e2e project (deleted/isolated)`);
	}
	if (defaultsApplied > 0) {
		console.log(`  Applied default duration (${DEFAULT_DURATION_MS / 1000}s) to ${defaultsApplied} specs with insufficient data`);
	}

	return {
		updatedAt: new Date().toISOString(),
		source: 'currents',
		projectId: PROJECT_ID,
		specs: specsOutput,
	};
}

/**
 * Main function
 */
async function main() {
	const apiKey = process.env.CURRENTS_API_KEY;

	if (!apiKey) {
		console.error('Error: CURRENTS_API_KEY environment variable is required');
		process.exit(1);
	}

	try {
		// Get valid specs from Playwright (excludes isolated/serial tests)
		const validSpecs = getValidSpecsFromPlaywright();

		// Fetch all test metrics
		const allTests = await fetchAllTestMetrics(apiKey);
		console.log(`\nTotal tests fetched: ${allTests.length}`);

		// Count excluded tests
		const excludedTests = allTests.filter((t) => shouldExcludeSpec(t.spec));
		console.log(`Excluded tests (performance/chaos/historical): ${excludedTests.length}`);

		// Aggregate tests by spec file
		const specMap = aggregateTestsBySpec(allTests);
		console.log(`Unique specs after pattern filtering: ${specMap.size}`);

		// Transform to output schema (filtering to only valid specs)
		const metrics = transformToMetricsSchema(specMap, validSpecs);

		// Add any specs that are in Playwright but not in Currents (new specs)
		if (validSpecs) {
			let newSpecsAdded = 0;
			for (const specPath of validSpecs) {
				if (!metrics.specs[specPath]) {
					metrics.specs[specPath] = {
						avgDuration: DEFAULT_DURATION_MS,
						testCount: 0, // Unknown, will be determined at runtime
						flakyRate: 0,
					};
					newSpecsAdded++;
				}
			}
			if (newSpecsAdded > 0) {
				console.log(`  Added ${newSpecsAdded} new specs with default duration (not yet in Currents)`);
			}
		}

		// Ensure output directory exists
		const outputDir = path.dirname(OUTPUT_PATH);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		// Write output file
		fs.writeFileSync(OUTPUT_PATH, JSON.stringify(metrics, null, 2) + '\n');
		console.log(`\nMetrics written to: ${OUTPUT_PATH}`);

		// Print summary statistics
		const durations = Object.values(metrics.specs).map((s) => s.avgDuration);
		const totalDuration = durations.reduce((sum, d) => sum + d, 0);
		const avgDuration = totalDuration / durations.length;
		const maxDuration = Math.max(...durations);
		const minDuration = Math.min(...durations);

		console.log('\nSummary:');
		console.log(`  Total specs: ${durations.length}`);
		console.log(`  Total duration: ${(totalDuration / 1000 / 60).toFixed(1)} minutes`);
		console.log(`  Average duration per spec: ${(avgDuration / 1000).toFixed(1)} seconds`);
		console.log(`  Max spec duration: ${(maxDuration / 1000).toFixed(1)} seconds`);
		console.log(`  Min spec duration: ${(minDuration / 1000).toFixed(1)} seconds`);

		// Show top 5 longest specs
		const sortedSpecs = Object.entries(metrics.specs)
			.sort(([, a], [, b]) => b.avgDuration - a.avgDuration)
			.slice(0, 5);

		console.log('\nTop 5 longest specs (by summed test durations):');
		sortedSpecs.forEach(([spec, data], i) => {
			const mins = Math.floor(data.avgDuration / 60000);
			const secs = ((data.avgDuration % 60000) / 1000).toFixed(1);
			console.log(`  ${i + 1}. ${mins}m ${secs}s (${data.testCount} tests) - ${spec}`);
		});
	} catch (error) {
		console.error('Error fetching metrics:', error.message);
		process.exit(1);
	}
}

main();
