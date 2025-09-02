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
