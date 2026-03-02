import type { Page, TestInfo } from '@playwright/test';
import type { MetricsHelper } from 'n8n-containers';

const HEAP_USED_QUERY = 'n8n_nodejs_heap_size_used_bytes / 1024 / 1024';
const HEAP_TOTAL_QUERY = 'n8n_nodejs_heap_size_total_bytes / 1024 / 1024';
const RSS_QUERY = 'n8n_process_resident_memory_bytes / 1024 / 1024';
const PSS_QUERY = 'n8n_process_pss_bytes / 1024 / 1024';

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
	heapTotalMB: number;
	rssMB: number;
	pssMB: number | null;
	nonHeapOverheadMB: number;
	stabilizationTimeMs: number;
	readingsCount: number;
}

/**
 * Trigger GC and wait for heap memory to stabilize.
 * Collects RSS, PSS, and heap total samples during the stabilization window
 * and returns median values to reduce point-in-time noise.
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

interface MemorySamples {
	heapTotal: number[];
	rss: number[];
	pss: number[];
}

function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function collectAdditionalSamples(
	metrics: MetricsHelper,
	samples: MemorySamples,
): Promise<void> {
	try {
		const results = await Promise.all([
			metrics.query(HEAP_TOTAL_QUERY),
			metrics.query(RSS_QUERY),
			metrics.query(PSS_QUERY),
		]);

		if (results[0]?.[0]) samples.heapTotal.push(results[0][0].value);
		if (results[1]?.[0]) samples.rss.push(results[1][0].value);
		if (results[2]?.[0]) samples.pss.push(results[2][0].value);
	} catch {
		// Non-critical, skip this sample
	}
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
	const samples: MemorySamples = { heapTotal: [], rss: [], pss: [] };

	while (Date.now() - startTime < maxWaitMs) {
		const result = await metrics.waitForMetric(HEAP_USED_QUERY, {
			timeoutMs: checkIntervalMs,
			intervalMs: 1000,
		});

		if (result) {
			readingsCount++;
			const currentValue = result.value;

			await collectAdditionalSamples(metrics, samples);

			const delta = Math.abs(currentValue - lastValue);

			if (lastValue > 0 && delta < thresholdMB) {
				stableCount++;
				if (stableCount >= stableReadingsRequired) {
					const stabilizationTimeMs = Date.now() - startTime;
					const heapUsedMB = currentValue;
					const heapTotalMB = median(samples.heapTotal);
					const rssMB = median(samples.rss);
					const pssMB = samples.pss.length > 0 ? median(samples.pss) : null;
					// Can theoretically go negative if RSS/heapTotal medians come from slightly
					// different sample windows. A negative value would indicate a measurement
					// timing issue — don't clamp to 0, surface it for investigation.
					const nonHeapOverheadMB = rssMB - heapTotalMB;

					console.log(
						`[STABILIZATION] Memory stabilized after ${stabilizationTimeMs}ms (${readingsCount} readings)\n` +
							`  Heap Used: ${heapUsedMB.toFixed(2)} MB\n` +
							`  Heap Total: ${heapTotalMB.toFixed(2)} MB (median of ${samples.heapTotal.length})\n` +
							`  RSS: ${rssMB.toFixed(2)} MB (median of ${samples.rss.length})\n` +
							`  PSS: ${pssMB?.toFixed(2) ?? 'N/A'} MB${pssMB !== null ? ` (median of ${samples.pss.length})` : ''}\n` +
							`  Non-Heap Overhead: ${nonHeapOverheadMB.toFixed(2)} MB`,
					);

					return {
						heapUsedMB,
						heapTotalMB,
						rssMB,
						pssMB,
						nonHeapOverheadMB,
						stabilizationTimeMs,
						readingsCount,
					};
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
