#!/usr/bin/env node

/**
 * Fetches test duration metrics from Currents API for test orchestration.
 *
 * Usage:
 *   CURRENTS_API_KEY=<key> node packages/testing/playwright/scripts/fetch-currents-metrics.mjs --project=<id>
 *
 * Output: .github/test-metrics/playwright.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../../..');
const PLAYWRIGHT_DIR = path.join(ROOT_DIR, 'packages', 'testing', 'playwright');
const OUTPUT_PATH = path.join(ROOT_DIR, '.github', 'test-metrics', 'playwright.json');

const CURRENTS_API = 'https://api.currents.dev/v1';
const DEFAULT_DURATION = 60000; // 1 minute default for new specs (accounts for container startup)

const PROJECT_ID = process.argv.find((a) => a.startsWith('--project='))?.split('=')[1];
if (!PROJECT_ID) {
	console.error('Usage: CURRENTS_API_KEY=<key> node fetch-currents-metrics.mjs --project=<id>');
	process.exit(1);
}

async function fetchSpecPerformance(apiKey) {
	const specs = [];
	let page = 0;
	let hasMore = true;

	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

	while (hasMore && page < 100) {
		const url = new URL(`${CURRENTS_API}/spec-files/${PROJECT_ID}`);
		url.searchParams.set('limit', '50');
		url.searchParams.set('page', page.toString());
		url.searchParams.set('date_start', sevenDaysAgo.toISOString());
		url.searchParams.set('date_end', new Date().toISOString());

		const res = await fetch(url, {
			headers: { Authorization: `Bearer ${apiKey}` },
		});

		if (!res.ok) throw new Error(`API error: ${res.status}`);
		const data = await res.json();

		// Filter to e2e specs only
		const e2eSpecs = data.data.list.filter((s) => s.spec.startsWith('tests/e2e/'));
		specs.push(...e2eSpecs);
		hasMore = data.data.nextPage !== false;
		page++;

		process.stdout.write(`\rFetched ${specs.length} e2e specs...`);
	}
	console.log();

	return specs;
}

function getPlaywrightSpecs() {
	console.log('Getting specs from Playwright...');
	try {
		const output = execSync('pnpm playwright test --list --project="multi-main:e2e"', {
			cwd: PLAYWRIGHT_DIR,
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		const specs = new Set([...output.matchAll(/› (tests\/e2e\/[^\s:]+\.spec\.ts)/g)].map((m) => m[1]));
		console.log(`Found ${specs.size} specs in Playwright`);
		return specs;
	} catch (e) {
		console.warn('Warning: Could not get Playwright specs, skipping validation');
		return null;
	}
}

async function main() {
	const apiKey = process.env.CURRENTS_API_KEY;
	if (!apiKey) {
		console.error('CURRENTS_API_KEY required');
		process.exit(1);
	}

	const validSpecs = getPlaywrightSpecs();
	const specMetrics = await fetchSpecPerformance(apiKey);

	const output = {
		updatedAt: new Date().toISOString(),
		source: 'currents',
		projectId: PROJECT_ID,
		specs: {},
	};

	const staleSpecs = [];
	for (const item of specMetrics) {
		// Skip specs not in Playwright (deleted/isolated)
		if (validSpecs && !validSpecs.has(item.spec)) {
			staleSpecs.push(item.spec);
			continue;
		}
		const duration = item.metrics.avgDuration < 1000 ? DEFAULT_DURATION : Math.round(item.metrics.avgDuration);
		output.specs[item.spec] = {
			avgDuration: duration,
			testCount: item.metrics.suiteSize,
			flakyRate: Math.round(item.metrics.flakeRate * 10000) / 10000,
		};
	}

	// Add new specs not yet in Currents
	const newSpecs = [];
	if (validSpecs) {
		for (const spec of validSpecs) {
			if (!output.specs[spec]) {
				output.specs[spec] = { avgDuration: DEFAULT_DURATION, testCount: 0, flakyRate: 0 };
				newSpecs.push(spec);
			}
		}
	}

	fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
	fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');

	console.log(`Wrote ${Object.keys(output.specs).length} specs`);
	if (staleSpecs.length) {
		console.log(`\nStale specs (in Currents but not Playwright):`);
		staleSpecs.forEach((s) => console.log(`  - ${s}`));
	}
	if (newSpecs.length) {
		console.log(`\nNew specs (in Playwright but not Currents, using ${DEFAULT_DURATION / 1000}s default):`);
		newSpecs.forEach((s) => console.log(`  - ${s}`));
	}
}

main().catch((e) => {
	console.error(e.message);
	process.exit(1);
});
