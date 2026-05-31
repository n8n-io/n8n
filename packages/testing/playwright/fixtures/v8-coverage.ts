import type { BrowserContext, Page } from '@playwright/test';
import { CoverageReport } from 'monocart-coverage-reports';

import { coverageOptions, COVERAGE_ENABLED } from '../coverage-options';

/**
 * Browser-native V8 coverage collection (Chromium `page.coverage`), replacing
 * the previous istanbul-instrumented build + Currents istanbul fixture.
 *
 * Wraps the BrowserContext: starts JS coverage on every page at creation
 * (before navigation, so the initial bundle load is captured) and, on test
 * teardown, hands each page's V8 coverage to monocart-coverage-reports, which
 * accumulates raw data in the shared outputDir for `coverage:report` to merge.
 *
 * No-op unless COVERAGE_ENABLED — normal runs pay nothing.
 */
export const v8CoverageFixtures = {
	context: async (
		{ context }: { context: BrowserContext },
		use: (context: BrowserContext) => Promise<void>,
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

		context.on('page', (page) => void startCoverage(page));
		await Promise.all(context.pages().map(startCoverage));

		await use(context);

		const report = new CoverageReport(coverageOptions);
		for (const page of tracked) {
			if (page.isClosed()) continue;
			try {
				const coverage = await page.coverage.stopJSCoverage();
				if (coverage?.length) await report.add(coverage);
			} catch {
				// Page closed before collection — ignore.
			}
		}
	},
};
