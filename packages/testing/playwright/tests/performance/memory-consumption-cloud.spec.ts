import { test, expect } from '../../fixtures/base';
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

test.describe('Memory Consumption @capability:observability', () => {
	const CONTAINER_STABILIZATION_TIME_MS = 40000;
	const METRICS_TIMEOUT_MS = 60000;

	test('Memory consumption baseline with starter plan resources', async ({
		n8nContainer,
	}, testInfo) => {
		const obs = n8nContainer.services.observability;

		// Wait for container to stabilize (allows GC to run, startup memory to be freed)
		await new Promise((resolve) => setTimeout(resolve, CONTAINER_STABILIZATION_TIME_MS));

		// Query all 3 memory metrics in parallel for comprehensive tracking
		const [heapUsedResult, heapTotalResult, rssResult] = await Promise.all([
			// Heap Used: Actual JS memory in use (best for detecting code regressions)
			obs.metrics.waitForMetric(
				'avg_over_time(n8n_nodejs_heap_size_used_bytes[30s]) / 1024 / 1024',
				{ timeoutMs: METRICS_TIMEOUT_MS, intervalMs: 2000 },
			),
			// Heap Total: V8 allocated heap (includes unused but reserved memory)
			obs.metrics.waitForMetric(
				'avg_over_time(n8n_nodejs_heap_size_total_bytes[30s]) / 1024 / 1024',
				{ timeoutMs: METRICS_TIMEOUT_MS, intervalMs: 2000 },
			),
			// RSS: Total process memory (what cloud providers bill, OOM killer uses)
			obs.metrics.waitForMetric(
				'avg_over_time(n8n_process_resident_memory_bytes[30s]) / 1024 / 1024',
				{ timeoutMs: METRICS_TIMEOUT_MS, intervalMs: 2000 },
			),
		]);

		const heapUsedMB = heapUsedResult!.value;
		const heapTotalMB = heapTotalResult!.value;
		const rssMB = rssResult!.value;

		console.log(
			`\n[MEMORY] Heap Used: ${heapUsedMB.toFixed(2)} MB | Heap Total: ${heapTotalMB.toFixed(2)} MB | RSS: ${rssMB.toFixed(2)} MB\n`,
		);

		await attachMetric(testInfo, 'memory-heap-used-baseline', heapUsedMB, 'MB');
		await attachMetric(testInfo, 'memory-heap-total-baseline', heapTotalMB, 'MB');
		await attachMetric(testInfo, 'memory-rss-baseline', rssMB, 'MB');

		expect(heapUsedMB).toBeGreaterThan(0);
		expect(heapTotalMB).toBeGreaterThan(0);
		expect(rssMB).toBeGreaterThan(0);
	});
});
