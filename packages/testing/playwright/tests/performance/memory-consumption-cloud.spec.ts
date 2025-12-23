import { ObservabilityHelper } from 'n8n-containers';

import { test, expect } from '../../fixtures/base';
import { attachMetric } from '../../utils/performance-helper';

test.use({
	addContainerCapability: {
		resourceQuota: {
			memory: 0.75,
			cpu: 0.5,
		},
		observability: true,
	},
});

test.describe('Memory Consumption @capability:observability', () => {
	const STARTER_PLAN_MEMORY_LIMIT_MB = 768;
	const CONTAINER_STABILIZATION_TIME_MS = 40000; // Wait for container to stabilize before measuring
	const METRICS_TIMEOUT_MS = 60000; // Wait up to 60s for metrics to be available

	test('Memory consumption baseline with starter plan resources', async ({
		n8nContainer,
	}, testInfo) => {
		const obs = new ObservabilityHelper(n8nContainer.observability!);

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

		// Track all 3 metrics:
		// - heap-used: Best for detecting JS memory regressions (~135-140 MB baseline)
		// - heap-total: Shows V8 memory allocation behavior (~142-145 MB baseline)
		// - rss: Process memory reported by Node.js (~235-245 MB baseline)
		//        Note: RSS is ~35 MB higher than Docker/cgroup memory due to
		//        shared pages and file-backed memory. Cloud billing uses cgroup.
		await attachMetric(testInfo, 'memory-heap-used-baseline', heapUsedMB, 'MB');
		await attachMetric(testInfo, 'memory-heap-total-baseline', heapTotalMB, 'MB');
		await attachMetric(testInfo, 'memory-rss-baseline', rssMB, 'MB');

		// Verify RSS is within starter plan limits (768MB) - this is what cloud providers care about
		expect(rssMB).toBeLessThan(STARTER_PLAN_MEMORY_LIMIT_MB);
		expect(heapUsedMB).toBeGreaterThan(50); // Minimum expected heap for n8n
	});
});
