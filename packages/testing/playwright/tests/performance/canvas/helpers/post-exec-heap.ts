import type { Page, TestInfo } from '@playwright/test';
import type { MetricsHelper } from 'n8n-containers';

import { bytesToMb, captureCdpMetrics } from './cdp-metrics';
import { attachMetric, getStableHeap } from '../../../../utils/performance-helper';
import type { Tier } from '../fixtures/generate-workflow';

interface PostExecHeapArgs {
	scenario: string;
	tier: Tier;
	testInfo: TestInfo;
	page: Page;
	baseUrl: string;
	metrics: MetricsHelper;
}

/**
 * Capture post-execution heap snapshots only after the heaviest scenario.
 * `getStableHeap` takes 40-55s per call — running it for every scenario
 * eats most of the test budget. The heaviest scenario is the most meaningful
 * leak signal anyway, so we trade scenario granularity for test stability.
 */
export async function maybeCapturePostExecHeap(args: PostExecHeapArgs): Promise<void> {
	if (args.scenario !== 'heavy-concentrated') return;
	const cdp = await captureCdpMetrics(args.page);
	const server = await getStableHeap(args.baseUrl, args.metrics);
	const dimensions = { tier: args.tier };
	await attachMetric(
		args.testInfo,
		`canvas-post-exec-browser-heap-${args.tier}-mb`,
		bytesToMb(cdp.JSHeapUsedSize),
		'MB',
		dimensions,
	);
	await attachMetric(
		args.testInfo,
		`canvas-post-exec-server-heap-${args.tier}-mb`,
		server.heapUsedMB,
		'MB',
		dimensions,
	);
	console.log(
		`[POST-EXEC HEAP ${args.tier}] server=${server.heapUsedMB.toFixed(1)}MB · browser=${bytesToMb(cdp.JSHeapUsedSize).toFixed(1)}MB`,
	);
}

/**
 * Force a browser-side GC pulse. Useful between scenarios when we know the
 * page will be re-navigated and want to reclaim retained closures / DOM refs
 * before the next mount inflates the heap further. Without this, Chromium's
 * tab process crashes on L / XL after a few mounts (each mount allocates
 * 230+ MB of canvas DOM).
 */
export async function forceBrowserGc(page: Page): Promise<void> {
	const client = await page.context().newCDPSession(page);
	try {
		await client.send('HeapProfiler.enable');
		await client.send('HeapProfiler.collectGarbage');
	} finally {
		await client.detach();
	}
}

const loggedHeapLimitFor = new WeakSet<Page>();

/**
 * Log Chromium's actual V8 jsHeapSizeLimit once per page. Used to verify
 * that the `--js-flags=--max-old-space-size=N` launch arg from
 * playwright-projects.ts actually took effect — default Chromium reports
 * ~2 GB, with the flag set we expect ~8 GB. A 2 GB reading means the flag
 * is being silently ignored.
 */
export async function logHeapLimitOnce(page: Page, label: string): Promise<void> {
	if (loggedHeapLimitFor.has(page)) return;
	loggedHeapLimitFor.add(page);
	const heapLimitGb = await page.evaluate(() => {
		const memory = (performance as unknown as { memory?: { jsHeapSizeLimit: number } }).memory;
		return memory ? memory.jsHeapSizeLimit / (1024 * 1024 * 1024) : -1;
	});
	console.log(`[V8 ${label}] jsHeapSizeLimit: ${heapLimitGb.toFixed(2)} GB`);
}
