import type { BrowserContext, Page, TestInfo } from '@playwright/test';
import { CoverageReport } from 'monocart-coverage-reports';
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import {
	BY_SPEC_DIR,
	coverageOptions,
	COVERAGE_ENABLED,
	slugify,
	specId,
} from '../coverage-options';

/**
 * Browser-native V8 coverage collection (Chromium `page.coverage`), replacing
 * the previous istanbul-instrumented build + Currents istanbul fixture.
 *
 * Wraps the BrowserContext: starts JS coverage on every page at creation
 * (before navigation, so the initial bundle load is captured) and, on test
 * teardown, hands each page's V8 coverage to monocart-coverage-reports.
 *
 * Coverage is accumulated TWICE: into the shared outputDir (the full shard
 * report, frontend + backend) and into a PER-SPEC dir keyed by the spec file
 * (`.by-spec/<slug>/`, with a `.spec` marker naming the spec). The per-spec
 * data is what lets the impact map say "this spec exercised this function" for
 * test selection. The extra cost is a second `add()` of data already in memory.
 *
 * No-op unless COVERAGE_ENABLED — normal runs pay nothing.
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
					perSpecRaw.push(...coverage.map((entry) => structuredClone(entry)));
					await sharedReport.add(coverage);
				}
			} catch {
				// Page closed before collection — ignore.
			}
		}
		if (perSpecRaw.length) {
			const spec = specId(testInfo);
			const specDir = join(BY_SPEC_DIR, slugify(spec));
			mkdirSync(specDir, { recursive: true });
			// Stream one V8 entry per line (JSONL). A whole-array JSON.stringify of a
			// navigation-heavy spec (e.g. signout + signin with resetOnNavigation:false)
			// exceeds V8's ~512MB single-string cap and throws RangeError; per-entry
			// serialization stays well under it and the file can grow unbounded.
			// Unique per test so multiple tests in one spec file accumulate (don't clobber).
			await pipeline(
				Readable.from(
					(function* () {
						for (const entry of perSpecRaw) yield `${JSON.stringify(entry)}\n`;
					})(),
				),
				createWriteStream(join(specDir, `raw-${slugify(testInfo.testId)}.jsonl`)),
			);
			writeFileSync(join(specDir, '.spec'), spec);
		}
	},
};
