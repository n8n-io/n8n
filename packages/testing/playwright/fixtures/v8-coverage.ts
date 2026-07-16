import type { BrowserContext, Page, TestInfo } from '@playwright/test';
import { CoverageReport } from 'monocart-coverage-reports';
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';

import {
	addV8CoverageInBatches,
	BY_SPEC_DIR,
	coverageOptions,
	COVERAGE_ENABLED,
	mergeV8CoverageByUrl,
	type V8CoverageEntry,
	slugify,
	specId,
} from '../coverage-options';

/**
 * Browser-native V8 coverage (Chromium `page.coverage`): start JS coverage on
 * every page at creation, and on teardown feed each page's coverage into the
 * shared shard report AND a per-spec dir (`.by-spec/<slug>/` + a `.spec` marker)
 * that the impact map keys on for test selection.
 *
 * No-op unless COVERAGE_ENABLED.
 */
export const v8CoverageFixtures = {
	context: async (
		{ context }: { context: BrowserContext },
		use: (context: BrowserContext) => Promise<void>,
		testInfo: TestInfo,
	) => {
		if (!COVERAGE_ENABLED) {
			await use(context);
			return;
		}

		const tracked = new Set<Page>();
		const startCoverage = async (page: Page) => {
			try {
				await page.coverage.startJSCoverage({ resetOnNavigation: false });
				tracked.add(page);
			} catch {
				// Non-Chromium browser or coverage unavailable — skip silently.
			}
		};

		context.on('page', (page) => {
			startCoverage(page).catch(() => {});
		});
		await Promise.all(context.pages().map(startCoverage));

		await use(context);

		const sharedReport = new CoverageReport(coverageOptions);
		// Capture this test's RAW page.coverage for the per-spec map, cloning each
		// entry — MCR's add() mutates input in place, so the same object can't be
		// fed to two reports. The emitter does the MCR work later from this raw.
		const perSpecRaw: unknown[] = [];
		for (const page of tracked) {
			if (page.isClosed()) continue;
			try {
				const coverage = await page.coverage.stopJSCoverage();
				if (coverage?.length) {
					// Collapse the per-navigation duplicate scripts (resetOnNavigation:false)
					// before they accumulate, so the worker heap / per-spec raw stay bounded.
					const merged = mergeV8CoverageByUrl(coverage as V8CoverageEntry[]);
					perSpecRaw.push(...merged.map((entry) => structuredClone(entry)));
					await addV8CoverageInBatches(sharedReport, merged);
				}
			} catch {
				// Page closed before collection — ignore.
			}
		}
		if (perSpecRaw.length) {
			const spec = specId(testInfo);
			const specDir = join(BY_SPEC_DIR, slugify(spec));
			mkdirSync(specDir, { recursive: true });
			// One V8 entry per line (JSONL): a whole-array JSON.stringify of a
			// navigation-heavy spec exceeds V8's ~512MB string cap. Filename is unique
			// per test so multiple tests in one spec file don't clobber each other.
			const rawPath = join(specDir, `raw-${slugify(testInfo.testId)}.jsonl`);
			const toJsonlLines = function* () {
				for (const entry of perSpecRaw) yield `${JSON.stringify(entry)}\n`;
			};
			await pipeline(toJsonlLines(), createWriteStream(rawPath));
			writeFileSync(join(specDir, '.spec'), spec);
		}
	},
};
