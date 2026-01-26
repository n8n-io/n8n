import type { Page, TestInfo } from '@playwright/test';
import type { MetricsHelper } from 'n8n-containers';

export async function measurePerformance(
	page: Page,
	actionName: string,
	actionFn: () => Promise<void>,
): Promise<number> {
	// Mark start
	await page.evaluate((name) => performance.mark(`${name}-start`), actionName);

	// Execute action
	await actionFn();

	// Mark end and get duration
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

/**
 * Attach a performance metric for collection by the metrics reporter
 * @param testInfo - The Playwright TestInfo object
 * @param metricName - Name of the metric (will be prefixed with 'metric:')
 * @param value - The numeric value to track
 * @param unit - The unit of measurement (e.g., 'ms', 'bytes', 'count')
 */
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

export interface StabilizationOptions {
	maxWaitMs?: number;
	checkIntervalMs?: number;
	thresholdMB?: number;
	stableReadingsRequired?: number;
}

export interface StabilizationResult {
	heapUsedMB: number;
	stabilizationTimeMs: number;
	readingsCount: number;
}

/**
 * Wait for memory to stabilize by monitoring heap usage until consecutive
 * readings show minimal change. This is more reliable than a fixed timeout
 * because V8's garbage collector runs non-deterministically.
 *
 * @param metrics - MetricsHelper instance from observability services
 * @param options - Configuration options for stabilization behavior
 * @returns Stabilization result with final memory value and timing info (returns last reading with warning if stabilization doesn't occur)
 */
export async function waitForMemoryStabilization(
	metrics: MetricsHelper,
	options: StabilizationOptions = {},
): Promise<StabilizationResult> {
	const {
		maxWaitMs = 120000,
		checkIntervalMs = 5000,
		thresholdMB = 2,
		stableReadingsRequired = 3,
	} = options;

	const query = 'n8n_nodejs_heap_size_used_bytes / 1024 / 1024';
	const startTime = Date.now();
	let lastValue = 0;
	let stableCount = 0;
	let readingsCount = 0;

	while (Date.now() - startTime < maxWaitMs) {
		const result = await metrics.waitForMetric(query, {
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
					return {
						heapUsedMB: currentValue,
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

	// If we didn't stabilize, return the last reading with a warning
	console.warn(
		`[STABILIZATION] Memory did not stabilize within ${maxWaitMs}ms. ` +
			`Last value: ${lastValue.toFixed(2)} MB after ${readingsCount} readings.`,
	);

	return {
		heapUsedMB: lastValue,
		stabilizationTimeMs: Date.now() - startTime,
		readingsCount,
	};
}
