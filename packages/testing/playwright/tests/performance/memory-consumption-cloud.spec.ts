import { test, expect } from '../../fixtures/base';
import { attachMetric, getStableHeap } from '../../utils/performance-helper';

test.use({
	capability: {
		resourceQuota: { memory: 0.75, cpu: 0.5 },
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
	},
});

test.describe(
	'Memory Consumption @capability:observability',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('Memory consumption baseline with starter plan resources', async ({
			n8nContainer,
			services,
		}, testInfo) => {
			const obs = services.observability;

			const result = await getStableHeap(n8nContainer.baseUrl, obs.metrics);

			await attachMetric(testInfo, 'memory-heap-used-baseline', result.heapUsedMB, 'MB');
			await attachMetric(testInfo, 'memory-heap-total-baseline', result.heapTotalMB, 'MB');
			await attachMetric(testInfo, 'memory-rss-baseline', result.rssMB, 'MB');
			await attachMetric(testInfo, 'memory-pss-baseline', result.pssMB ?? 0, 'MB');
			await attachMetric(
				testInfo,
				'memory-non-heap-overhead-baseline',
				result.nonHeapOverheadMB,
				'MB',
			);

			expect(result.heapUsedMB).toBeGreaterThan(0);
			expect(result.heapTotalMB).toBeGreaterThan(0);
			expect(result.rssMB).toBeGreaterThan(0);
		});
	},
);
