import { installPerfObservers } from './helpers/measure';
import {
	buildReport,
	buildRunMeta,
	summarize,
	writeResults,
	type PageResult,
} from './helpers/output';
import { openSignedOutPage, pageFor, runTarget } from './helpers/run-target';
import { seedInstance } from './helpers/seed';
import { buildTargets, selectTargets } from './helpers/targets';
import { parseTraceMode } from './helpers/trace';
import { test, expect } from '../../../fixtures/base';
import { attachMetric } from '../../../utils/metrics';

/**
 * Page-load benchmark for the most visited editor pages.
 *
 * Each page: one warm-up navigation, then PERF_ITERATIONS (default 10)
 * measured navigations with warm caches. Every run records the time to usable
 * on the page's own clock, Navigation / Paint / Resource Timing, long tasks
 * and the responseEnd of the boot requests. Results land in
 * `page-load.json` + `page-load.csv` (attached, and copied to PERF_OUTPUT_DIR
 * when set). PERF_TRACE=warmup|first|all|none picks which runs also write a
 * Chrome DevTools trace. PERF_PAGES=id,id limits the pages.
 * PERF_COLD_CACHE=true clears the HTTP cache before each page's warm-up.
 */
const ITERATIONS = Number(process.env.PERF_ITERATIONS ?? 10);
const TRACE_MODE = parseTraceMode(process.env.PERF_TRACE);
const COLD_CACHE = process.env.PERF_COLD_CACHE === 'true';
const READY_TIMEOUT_MS = 60_000;

test.use({
	// Cloud starter resources, same as the canvas benchmark. No `services`, so the
	// spec also runs against an attached instance (N8N_BASE_URL).
	capability: { resourceQuota: { memory: 0.75, cpu: 0.5 } },
	// Playwright's own trace/video/screenshot recording would compete with the
	// measurement; the Chrome traces come from `withChromeTrace` instead.
	trace: 'off',
	video: 'off',
	screenshot: 'off',
});

test.describe(
	'Editor page load',
	{ annotation: [{ type: 'owner', description: 'Identity & Access' }] },
	() => {
		test.setTimeout(60 * 60_000);

		test('measures the most visited pages', async ({ n8n, api, baseURL }, testInfo) => {
			const startedAt = new Date().toISOString();
			const seed = await seedInstance(api, { workflows: 30, credentials: 15, executions: 15 });
			const targets = selectTargets(buildTargets(seed), process.env.PERF_PAGES);

			await n8n.page.setViewportSize({ width: 1536, height: 960 });
			await n8n.page.emulateMedia({ reducedMotion: 'reduce' });
			await installPerfObservers(n8n.page);
			const signedOut = await openSignedOutPage(n8n.page, baseURL);

			const results: PageResult[] = [];
			for (const target of targets) {
				await test.step(target.label, async () => {
					const samples = await runTarget(
						pageFor(target, n8n.page, signedOut.page),
						target,
						{
							iterations: ITERATIONS,
							traceMode: TRACE_MODE,
							coldCache: COLD_CACHE,
							readyTimeoutMs: READY_TIMEOUT_MS,
							outputDir: testInfo.outputDir,
						},
						testInfo,
					);
					results.push(summarize(target, samples));
				});
			}
			await signedOut.close();

			const meta = buildRunMeta({
				startedAt,
				baseURL,
				iterations: ITERATIONS,
				traceMode: TRACE_MODE,
				coldCache: COLD_CACHE,
			});
			for (const result of results) {
				const dimensions = { page: result.target.id, route: result.target.routeName };
				await attachMetric(
					testInfo,
					`editor-load-${result.target.id}-usable-p50-ms`,
					result.stats.usableMs.median,
					'ms',
					dimensions,
				);
				await attachMetric(
					testInfo,
					`editor-load-${result.target.id}-usable-p90-ms`,
					result.stats.usableMs.p90,
					'ms',
					dimensions,
				);
				await attachMetric(
					testInfo,
					`editor-load-${result.target.id}-usable-p95-ms`,
					result.stats.usableMs.p95,
					'ms',
					dimensions,
				);
			}
			const files = await writeResults(testInfo, meta, results);
			console.log(buildReport(meta, results));
			console.log(`[PERF] data: ${files.json}\n[PERF] csv:  ${files.csv}`);

			expect(results.length).toBe(targets.length);
			for (const result of results) {
				expect(result.stats.usableMs.count, result.target.id).toBe(ITERATIONS);
				expect(result.stats.usableMs.median, result.target.id).toBeGreaterThan(0);
			}
		});
	},
);
