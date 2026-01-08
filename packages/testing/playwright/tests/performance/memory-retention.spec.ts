import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';
import { attachMetric } from '../../utils/performance-helper';

test.use({
	capability: {
		resourceQuota: {
			memory: 0.75,
			cpu: 0.5,
		},
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
	},
});

test.describe('Memory Leak Detection @capability:observability', () => {
	const METRICS_TIMEOUT_MS = 60000; // Wait up to 60s for metrics to be available
	const MAX_MEMORY_RETENTION_PERCENT = 10;

	/**
	 * Define the memory-consuming action to test.
	 * This function can be easily modified to test different features.
	 */
	async function performMemoryAction(n8n: n8nPage) {
		await n8n.start.fromBlankCanvas();
		await n8n.navigate.toWorkflows();
	}

	test('Memory should be released after actions', async ({ n8nContainer, n8n }, testInfo) => {
		const obs = n8nContainer.services.observability;

		// Get baseline heap usage (V8 heap is better for leak detection than RSS)
		// RSS can stay high after GC due to OS memory management
		// waitForMetric polls until metrics are available from VictoriaMetrics
		const heapQuery = 'avg_over_time(n8n_nodejs_heap_size_used_bytes[10s]) / 1024 / 1024';
		const baselineResult = await obs.metrics.waitForMetric(heapQuery, {
			timeoutMs: METRICS_TIMEOUT_MS,
			intervalMs: 2000,
		});
		expect(baselineResult, 'Expected baseline metrics to be available').not.toBeNull();
		const baselineMemoryMB = baselineResult!.value;

		// Perform the memory-consuming action
		await performMemoryAction(n8n);
		await n8n.page.goto('/home/workflows');

		// Give time for garbage collection
		await new Promise((resolve) => setTimeout(resolve, 5000));

		// Measure final heap usage (use longer window for final measurement)
		const finalQuery = 'avg_over_time(n8n_nodejs_heap_size_used_bytes[30s]) / 1024 / 1024';
		const finalResult = await obs.metrics.waitForMetric(finalQuery, {
			timeoutMs: METRICS_TIMEOUT_MS,
			intervalMs: 2000,
		});
		expect(finalResult, 'Expected final metrics to be available').not.toBeNull();
		const finalMemoryMB = finalResult!.value;

		// Calculate retention percentage - How much memory is retained after the action
		const memoryRetainedMB = finalMemoryMB - baselineMemoryMB;
		const retentionPercent = (memoryRetainedMB / baselineMemoryMB) * 100;

		await attachMetric(testInfo, 'memory-retention-percentage', retentionPercent, '%');

		expect(
			retentionPercent,
			`Memory retention (${retentionPercent.toFixed(1)}%) exceeds maximum allowed ${MAX_MEMORY_RETENTION_PERCENT}%. ` +
				`Baseline: ${baselineMemoryMB.toFixed(1)} MB, Final: ${finalMemoryMB.toFixed(1)} MB, ` +
				`Retained: ${memoryRetainedMB.toFixed(1)} MB`,
		).toBeLessThan(MAX_MEMORY_RETENTION_PERCENT);
	});
});
