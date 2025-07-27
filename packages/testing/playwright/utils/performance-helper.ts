import type { Page } from '@playwright/test';

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
