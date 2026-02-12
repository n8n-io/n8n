import type { Page, TestInfo } from '@playwright/test';
import type { MetricsHelper } from 'n8n-containers';

const HEAP_USED_QUERY = 'n8n_nodejs_heap_size_used_bytes / 1024 / 1024';

export async function measurePerformance(
	page: Page,
	actionName: string,
	actionFn: () => Promise<void>,
): Promise<number> {
	await page.evaluate((name) => performance.mark(`${name}-start`), actionName);
	await actionFn();
	return await page.evaluate((name) => {
		performance.mark(`${name}-end`);
		performance.measure(name, `${name}-start`, `${name}-end`);
		const measure = performance.getEntriesByName(name)[0] as PerformanceMeasure;
		return measure.duration;
	}, actionName);
}

export async function getAllPerformanceMetrics(page: Page) {
	return await page.evaluate(() => {
		const metrics: Record<string, number> = {};
		const measures = performance.getEntriesByType('measure') as PerformanceMeasure[];
		measures.forEach((m) => (metrics[m.name] = m.duration));
		return metrics;
	});
}

/** Attach a performance metric for collection by the metrics reporter */
export async function attachMetric(
	testInfo: TestInfo,
	metricName: string,
	value: number,
	unit?: string,
): Promise<void> {
	await testInfo.attach(`metric:${metricName}`, {
		body: JSON.stringify({ value, unit }),
	});
}

export interface StableHeapOptions {
	maxWaitMs?: number;
	checkIntervalMs?: number;
	thresholdMB?: number;
	stableReadingsRequired?: number;
	logGC?: boolean;
}

export interface StableHeapResult {
	heapUsedMB: number;
	stabilizationTimeMs: number;
	readingsCount: number;
}

/**
 * Trigger GC and wait for heap memory to stabilize.
 * Uses consecutive stable readings to ensure metrics have settled post-GC.
 */
export async function getStableHeap(
	baseUrl: string,
	metrics: MetricsHelper,
	options: StableHeapOptions = {},
): Promise<StableHeapResult> {
	const {
		maxWaitMs = 60000,
		checkIntervalMs = 5000,
		thresholdMB = 2,
		stableReadingsRequired = 2,
		logGC = true,
	} = options;

	await triggerGC(baseUrl, logGC);
	return await waitForStableMemory(metrics, {
		maxWaitMs,
		checkIntervalMs,
		thresholdMB,
		stableReadingsRequired,
	});
}

async function triggerGC(baseUrl: string, log: boolean): Promise<void> {
	const response = await fetch(`${baseUrl}/rest/e2e/gc`, { method: 'POST' });
	if (!response.ok) {
		throw new Error(`GC endpoint returned ${response.status}: ${response.statusText}`);
	}
	const result = (await response.json()) as { data?: { success: boolean; message: string } };
	if (!result.data?.success) {
		throw new Error(`GC failed: ${result.data?.message ?? 'Unknown error'}`);
	}
	if (log) {
		console.log(`[GC] ${result.data.message}`);
	}
}

interface StabilizationConfig {
	maxWaitMs: number;
	checkIntervalMs: number;
	thresholdMB: number;
	stableReadingsRequired: number;
}

async function waitForStableMemory(
	metrics: MetricsHelper,
	config: StabilizationConfig,
): Promise<StableHeapResult> {
	const { maxWaitMs, checkIntervalMs, thresholdMB, stableReadingsRequired } = config;
	const startTime = Date.now();
	let lastValue = 0;
	let stableCount = 0;
	let readingsCount = 0;

	while (Date.now() - startTime < maxWaitMs) {
		const result = await metrics.waitForMetric(HEAP_USED_QUERY, {
			timeoutMs: checkIntervalMs,
			intervalMs: 1000,
		});

		if (result) {
			readingsCount++;
			const currentValue = result.value;
			const delta = Math.abs(currentValue - lastValue);

			if (lastValue > 0 && delta < thresholdMB) {
				stableCount++;
				if (stableCount >= stableReadingsRequired) {
					const stabilizationTimeMs = Date.now() - startTime;
					console.log(
						`[STABILIZATION] Memory stabilized at ${currentValue.toFixed(2)} MB ` +
							`after ${stabilizationTimeMs}ms (${readingsCount} readings)`,
					);
					return { heapUsedMB: currentValue, stabilizationTimeMs, readingsCount };
				}
			} else {
				stableCount = 0;
			}
			lastValue = currentValue;
		}

		await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
	}

	throw new Error(
		`Memory did not stabilize within ${maxWaitMs}ms. ` +
			`Last: ${lastValue.toFixed(2)} MB (${readingsCount} readings)`,
	);
}
