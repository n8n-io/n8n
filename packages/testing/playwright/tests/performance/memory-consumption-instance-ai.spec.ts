import { test, expect } from '../../fixtures/base';
import { attachMetric, getStableHeap } from '../../utils/performance-helper';

test.use({
	capability: {
		resourceQuota: { memory: 0.75, cpu: 0.5 },
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
		env: {
			N8N_ENABLED_MODULES: 'instance-ai',
			N8N_INSTANCE_AI_MODEL: 'anthropic/claude-sonnet-4-6',
			N8N_INSTANCE_AI_MODEL_API_KEY: 'fake-key',
		},
	},
});

test.describe(
	'Instance AI Memory Consumption @capability:observability',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('Idle baseline with Instance AI module loaded', async ({
			n8nContainer,
			services,
		}, testInfo) => {
			const obs = services.observability;

			const result = await getStableHeap(n8nContainer.baseUrl, obs.metrics);

			await attachMetric(testInfo, 'instance-ai-heap-used-baseline', result.heapUsedMB, 'MB');
			await attachMetric(testInfo, 'instance-ai-heap-total-baseline', result.heapTotalMB, 'MB');
			await attachMetric(testInfo, 'instance-ai-rss-baseline', result.rssMB, 'MB');
			await attachMetric(testInfo, 'instance-ai-pss-baseline', result.pssMB ?? 0, 'MB');
			await attachMetric(
				testInfo,
				'instance-ai-non-heap-overhead-baseline',
				result.nonHeapOverheadMB,
				'MB',
			);

			expect(result.heapUsedMB).toBeGreaterThan(0);
			expect(result.heapTotalMB).toBeGreaterThan(0);
			expect(result.rssMB).toBeGreaterThan(0);

			console.log(
				`[INSTANCE AI IDLE] Heap used: ${result.heapUsedMB.toFixed(1)} MB | ` +
					`Heap total: ${result.heapTotalMB.toFixed(1)} MB | ` +
					`RSS: ${result.rssMB.toFixed(1)} MB | ` +
					`Non-heap overhead: ${result.nonHeapOverheadMB.toFixed(1)} MB`,
			);
		});
	},
);
