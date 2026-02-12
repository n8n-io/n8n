import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';
import { attachMetric, getStableHeap } from '../../utils/performance-helper';

test.use({
	capability: {
		resourceQuota: { memory: 0.75, cpu: 0.5 },
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
	},
});

test.describe('Memory Leak Detection @capability:observability', {
	annotation: [
		{ type: 'owner', description: 'Catalysts' },
	],
}, () => {
	async function performMemoryAction(n8n: n8nPage) {
		await n8n.start.fromBlankCanvas();
		await n8n.navigate.toWorkflows();
	}

	test('Memory should be released after actions', async ({
		n8nContainer,
		n8n,
		services,
	}, testInfo) => {
		const obs = services.observability;

		const baseline = await getStableHeap(n8nContainer.baseUrl, obs.metrics);
		await performMemoryAction(n8n);
		await n8n.page.goto('/home/workflows');
		const final = await getStableHeap(n8nContainer.baseUrl, obs.metrics);

		const retainedMB = final.heapUsedMB - baseline.heapUsedMB;
		const retentionPercent = (retainedMB / baseline.heapUsedMB) * 100;

		await attachMetric(testInfo, 'memory-heap-retention-percent', retentionPercent, '%');
		await attachMetric(testInfo, 'memory-heap-used-pre-action', baseline.heapUsedMB, 'MB');
		await attachMetric(testInfo, 'memory-heap-used-post-action', final.heapUsedMB, 'MB');
		await attachMetric(testInfo, 'memory-heap-retained', retainedMB, 'MB');

		expect(baseline.heapUsedMB).toBeGreaterThan(0);
		expect(final.heapUsedMB).toBeGreaterThan(0);

		console.log(
			`[MEMORY RETENTION] Baseline: ${baseline.heapUsedMB.toFixed(1)} MB | ` +
				`Final: ${final.heapUsedMB.toFixed(1)} MB | ` +
				`Retained: ${retainedMB.toFixed(1)} MB (${retentionPercent.toFixed(1)}%)`,
		);
	});
});
