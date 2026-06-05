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

export interface PostExecHeap {
	server: number;
	browser: number;
}

/**
 * Capture post-execution heap snapshots only after the heaviest scenario.
 * `getStableHeap` takes 40-55s per call — running it for every scenario
 * eats most of the test budget. The heaviest scenario is the most meaningful
 * leak signal anyway, so we trade scenario granularity for test stability.
 *
 * Returns the captured values so the caller can include them in its own
 * per-test report; returns null for any other scenario.
 */
export async function maybeCapturePostExecHeap(
	args: PostExecHeapArgs,
): Promise<PostExecHeap | null> {
	if (args.scenario !== 'heavy-concentrated') return null;
	const cdp = await captureCdpMetrics(args.page);
	const server = await getStableHeap(args.baseUrl, args.metrics, { logGC: false });
	const dimensions = { tier: args.tier };
	const browserMb = bytesToMb(cdp.JSHeapUsedSize);
	await attachMetric(
		args.testInfo,
		`canvas-post-exec-browser-heap-${args.tier}-mb`,
		browserMb,
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
	return { server: server.heapUsedMB, browser: browserMb };
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
 * Read Chromium's actual V8 jsHeapSizeLimit once per page, in gigabytes.
 * Returns the value the first time it's called for a given page and null on
 * subsequent calls. Surfaced in the execution report to confirm the benchmark
 * runs at Chromium's default launch — the reported limit is ~4 GB (V8's
 * pointer-compression cage, the ceiling that bounds desktop Chrome). If a future
 * change moves it (a launch flag, or a Chromium bump), the report makes that
 * visible instead of the numbers silently shifting.
 */
export async function readHeapLimitOnce(page: Page): Promise<number | null> {
	if (loggedHeapLimitFor.has(page)) return null;
	loggedHeapLimitFor.add(page);
	return await page.evaluate(() => {
		const memory = (performance as unknown as { memory?: { jsHeapSizeLimit: number } }).memory;
		return memory ? memory.jsHeapSizeLimit / (1024 * 1024 * 1024) : -1;
	});
}
