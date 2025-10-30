import type { Page, TestInfo } from '@playwright/test';

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
 * Polls the memory metric from Prometheus endpoint and calculates average
 * @param baseUrl - The base URL of the n8n instance
 * @param durationMs - How long to poll in milliseconds
 * @param intervalMs - Interval between polls in milliseconds
 * @returns Average memory consumption in bytes
 */
export async function pollMemoryMetric(
	baseUrl: string,
	durationMs: number = 30000,
	intervalMs: number = 1000,
): Promise<number> {
	const samples: number[] = [];
	const startTime = Date.now();

	while (Date.now() - startTime < durationMs) {
		try {
			const response = await fetch(`${baseUrl}/metrics`);
			const metricsText = await response.text();

			const memoryMatch = metricsText.match(/n8n_process_resident_memory_bytes\s+(\d+(?:\.\d+)?)/);
			if (memoryMatch) {
				const memoryBytes = parseFloat(memoryMatch[1]);
				samples.push(memoryBytes);
			}
		} catch (error) {
			console.error('Error polling memory metric:', error);
		}

		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}

	if (samples.length === 0) {
		throw new Error('No memory samples collected');
	}

	return samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
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
