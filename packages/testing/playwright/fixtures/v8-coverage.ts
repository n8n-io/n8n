import type { BrowserContext, Page, TestInfo } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { CoverageReport } from 'monocart-coverage-reports';

import { coverageOptions, COVERAGE_ENABLED } from '../coverage-options';

/** Per-spec raw lives here; the shard emitter resolves each dir to a per-spec
 *  lcov so the impact map can attribute coverage to the spec that produced it. */
const BY_SPEC_DIR = join(coverageOptions.outputDir ?? './coverage', '.by-spec');

/** Spec id = project-relative path (e.g. tests/e2e/nodes/if-node.spec.ts) — the
 *  same id the runner uses, so the impact map keys match runnable specs. */
function specId(testInfo: TestInfo): string {
	return relative(process.cwd(), testInfo.file).split('\\').join('/');
}

const slugify = (spec: string) => spec.replace(/[^a-zA-Z0-9]+/g, '_');

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

		context.on('page', (page) => void startCoverage(page));
		await Promise.all(context.pages().map(startCoverage));

		await use(context);

		const sharedReport = new CoverageReport(coverageOptions);
		// Capture this test's RAW page.coverage for the per-spec map. We clone the
		// entries before handing the originals to MCR — `add()` runs them through
		// initV8ListAndSourcemap which can mutate in place, so the same object must
		// not be fed to two reports (that silently lost per-spec data before). The
		// emitter does the MCR work later from this raw, off the test's hot path.
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
			// Unique per test so multiple tests in one spec file accumulate (don't clobber).
			writeFileSync(
				join(specDir, `raw-${slugify(testInfo.testId)}.json`),
				JSON.stringify(perSpecRaw),
			);
			writeFileSync(join(specDir, '.spec'), spec);
		}
	},
};
