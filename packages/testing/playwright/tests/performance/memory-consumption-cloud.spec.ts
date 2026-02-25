import { test, expect } from '../../fixtures/base';
import { attachMetric, getStableHeap } from '../../utils/performance-helper';

test.use({
	capability: {
		resourceQuota: { memory: 0.75, cpu: 0.5 },
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
	},
});

test.describe('Memory Consumption @capability:observability', {
	annotation: [
		{ type: 'owner', description: 'Catalysts' },
	],
}, () => {
	test('Memory consumption baseline with starter plan resources', async ({
		n8nContainer,
		services,
	}, testInfo) => {
		const obs = services.observability;

		const { heapUsedMB } = await getStableHeap(n8nContainer.baseUrl, obs.metrics);

		const [heapTotalResult, rssResult] = await Promise.all([
			obs.metrics.waitForMetric('n8n_nodejs_heap_size_total_bytes / 1024 / 1024'),
			obs.metrics.waitForMetric('n8n_process_resident_memory_bytes / 1024 / 1024'),
		]);
		const heapTotalMB = heapTotalResult!.value;
		const rssMB = rssResult!.value;

		console.log(
			`[MEMORY] Heap Used: ${heapUsedMB.toFixed(2)} MB | Heap Total: ${heapTotalMB.toFixed(2)} MB | RSS: ${rssMB.toFixed(2)} MB`,
		);

		await attachMetric(testInfo, 'memory-heap-used-baseline', heapUsedMB, 'MB');
		await attachMetric(testInfo, 'memory-heap-total-baseline', heapTotalMB, 'MB');
		await attachMetric(testInfo, 'memory-rss-baseline', rssMB, 'MB');

		expect(heapUsedMB).toBeGreaterThan(0);
		expect(heapTotalMB).toBeGreaterThan(0);
		expect(rssMB).toBeGreaterThan(0);
	});
});
