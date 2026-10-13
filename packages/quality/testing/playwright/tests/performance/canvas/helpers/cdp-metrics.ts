import type { Page } from '@playwright/test';

export type CdpMetric =
	| 'JSHeapUsedSize'
	| 'JSHeapTotalSize'
	| 'Nodes'
	| 'JSEventListeners'
	| 'LayoutCount'
	| 'RecalcStyleCount'
	| 'LayoutDuration'
	| 'RecalcStyleDuration'
	| 'ScriptDuration'
	| 'TaskDuration';

export type CdpMetrics = Partial<Record<CdpMetric, number>>;

/**
 * Read Chromium CDP performance metrics — heap, DOM count, layout / script
 * timing — after forcing a browser-side GC. CDP numbers are far more reliable
 * than `performance.memory` (which is bucketed) and surface layout/style cost
 * as a side-effect. Metric names are dictated by the CDP API (PascalCase).
 */
export async function captureCdpMetrics(page: Page): Promise<CdpMetrics> {
	const client = await page.context().newCDPSession(page);
	try {
		await client.send('HeapProfiler.enable');
		await client.send('HeapProfiler.collectGarbage');
		await client.send('Performance.enable');
		const { metrics } = await client.send('Performance.getMetrics');
		const record: Record<string, number> = {};
		for (const metric of metrics) {
			record[metric.name] = metric.value;
		}
		return record;
	} finally {
		await client.detach();
	}
}

export function bytesToMb(bytes: number | undefined): number {
	if (!bytes) return 0;
	return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}
