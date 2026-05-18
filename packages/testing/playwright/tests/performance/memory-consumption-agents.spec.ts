import { test, expect } from '../../fixtures/base';
import { attachMetric, getStableHeap } from '../../utils/performance-helper';

test.use({
	capability: {
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
		env: {
			N8N_ENABLED_MODULES: 'agents',
			N8N_AI_ANTHROPIC_KEY: 'fake-key',
		},
	},
});

test.describe(
	'Agents Memory Consumption @capability:observability',
	{
		annotation: [{ type: 'owner', description: 'Agent' }],
	},
	() => {
		test('Idle baseline with Agents module loaded', async ({
			n8nContainer,
			services,
		}, testInfo) => {
			const obs = services.observability;

			const result = await getStableHeap(n8nContainer.baseUrl, obs.metrics);

			await attachMetric(testInfo, 'agents-heap-used-baseline', result.heapUsedMB, 'MB');
			await attachMetric(testInfo, 'agents-heap-total-baseline', result.heapTotalMB, 'MB');
			await attachMetric(testInfo, 'agents-rss-baseline', result.rssMB, 'MB');
			await attachMetric(testInfo, 'agents-pss-baseline', result.pssMB ?? 0, 'MB');
			await attachMetric(
				testInfo,
				'agents-non-heap-overhead-baseline',
				result.nonHeapOverheadMB,
				'MB',
			);

			expect(result.heapUsedMB).toBeGreaterThan(0);
			expect(result.heapTotalMB).toBeGreaterThan(0);
			expect(result.rssMB).toBeGreaterThan(0);

			console.log(
				`[AGENTS IDLE] Heap used: ${result.heapUsedMB.toFixed(1)} MB | ` +
					`Heap total: ${result.heapTotalMB.toFixed(1)} MB | ` +
					`RSS: ${result.rssMB.toFixed(1)} MB | ` +
					`Non-heap overhead: ${result.nonHeapOverheadMB.toFixed(1)} MB`,
			);
		});
	},
);
