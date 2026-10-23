import type { Fixtures } from '@playwright/test';
import { request } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { BACKEND_BY_SPEC_DIR, COVERAGE_ENABLED, slugify, specId } from '../coverage-options';

type BackendCoverageTestFixtures = { backendCoverage: undefined; mainUrls: string[] };
type BackendCoverageWorkerFixtures = { n8nUrl: string };

let warnedMultiMain = false;
let warnedHookError = false;

/**
 * Per-spec BACKEND V8 coverage (DEVP-370).
 *
 * The frontend fixture (`v8-coverage.ts`) collects the browser's `page.coverage`
 * per spec; this is its server-side counterpart. Around each test it brackets a
 * coverage window on the n8n main via the test-only `/rest/e2e/coverage` hook:
 * `start` (reset window) before the test, `take` (this spec's delta) after, then
 * writes the raw V8 `{result}` to `BACKEND_BY_SPEC_DIR/<slug>/` exactly like the
 * frontend fixture writes browser raws. `emit-spec-backend-lcovs` later resolves
 * these to repo `.ts` source and the impact map gains backend rows, so a backend
 * change (e.g. an If-node edit) scopes E2E instead of running the whole suite.
 *
 * Auto fixture so it also covers API-only tests (no page). No-op unless
 * COVERAGE_ENABLED — normal runs pay nothing, and any hook/IO failure is
 * swallowed (fail-open: a missing backend raw just means no backend rows, never
 * a failed test or a skipped spec).
 *
 * SINGLE-WORKER ONLY: precise coverage is process-global, so the start→take
 * window is attributable to one spec only when specs don't run concurrently.
 * The coverage project runs `--workers=1`; do not parallelise it.
 */
export const backendV8CoverageFixtures: Fixtures<
	BackendCoverageTestFixtures,
	BackendCoverageWorkerFixtures
> = {
	// Playwright fixture contract: the async function receives `use`, runs setup,
	// calls `await use(value)` to hand the value to the test (and pause until the
	// test finishes), then runs teardown. The fixture's value is the `undefined`
	// passed to `use` — the test never reads `backendCoverage`; this is purely a
	// side-effecting auto fixture that brackets a coverage window around the test.
	// All three `use(undefined)` call sites mark "hand control to the test now":
	//   - early returns when coverage is off (no setup, no teardown);
	//   - the main path between `/coverage/start` (setup) and `/coverage/take`
	//     (teardown that writes the raw V8 file).
	backendCoverage: [
		async ({ n8nUrl, mainUrls }, use, testInfo) => {
			// Target the main directly via n8nUrl (always set for a container run);
			// mainUrls is only populated for multi-main and is used here just to warn.
			if (!COVERAGE_ENABLED || !n8nUrl) {
				await use(undefined);
				return;
			}
			if (mainUrls.length > 1 && !warnedMultiMain) {
				warnedMultiMain = true;
				console.warn(
					`backend coverage: ${mainUrls.length} mains detected — attributing main-1 only ` +
						'(DEVP-370 phase 1; multi-main union deferred).',
				);
			}

			const ctx = await request.newContext({ baseURL: n8nUrl });
			try {
				await ctx.post('/rest/e2e/coverage/start');
			} catch {
				// Hook unreachable — fall through; teardown take will no-op.
			}

			// Run the test inside the start→take coverage window.
			await use(undefined);

			try {
				const res = await ctx.post('/rest/e2e/coverage/take');
				// n8n wraps controller returns in { data: ... } (response-helper.ts).
				const body = (await res.json()) as { data?: { result?: unknown[] } };
				const result = body?.data?.result ?? [];
				if (Array.isArray(result) && result.length) {
					const spec = specId(testInfo);
					const specDir = join(BACKEND_BY_SPEC_DIR, slugify(spec));
					mkdirSync(specDir, { recursive: true });
					// Unique per test so multiple tests in one spec file accumulate.
					writeFileSync(
						join(specDir, `raw-${slugify(testInfo.testId)}.json`),
						JSON.stringify({ result }),
					);
					writeFileSync(join(specDir, '.spec'), spec);
				} else if (!warnedHookError) {
					warnedHookError = true;
					console.warn(
						`backend coverage: /rest/e2e/coverage/take returned ${res.status()} with ` +
							`${Array.isArray(result) ? result.length : 'no'} entries — no backend rows this run.`,
					);
				}
			} catch (error) {
				if (!warnedHookError) {
					warnedHookError = true;
					console.warn(`backend coverage: take failed — ${String(error)}`);
				}
			} finally {
				await ctx.dispose();
			}
		},
		{ auto: true },
	],
};
