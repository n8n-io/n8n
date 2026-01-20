import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';
import { attachMetric, waitForMemoryStabilization } from '../../utils/performance-helper';

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
	async function performMemoryAction(n8n: n8nPage) {
		await n8n.start.fromBlankCanvas();
		await n8n.navigate.toWorkflows();
	}

	test('Memory should be released after actions', async ({ n8nContainer, n8n }, testInfo) => {
		const obs = n8nContainer.services.observability;

		// Wait for memory to stabilize before measuring baseline
		const { heapUsedMB: baselineMemoryMB } = await waitForMemoryStabilization(obs.metrics);

		await performMemoryAction(n8n);
		await n8n.page.goto('/home/workflows');

		// Wait for memory to stabilize after actions
		const { heapUsedMB: finalMemoryMB } = await waitForMemoryStabilization(obs.metrics);

		const memoryRetainedMB = finalMemoryMB - baselineMemoryMB;
		const retentionPercent = (memoryRetainedMB / baselineMemoryMB) * 100;

		await attachMetric(testInfo, 'memory-heap-retention-percent', retentionPercent, '%');
		await attachMetric(testInfo, 'memory-heap-used-pre-action', baselineMemoryMB, 'MB');
		await attachMetric(testInfo, 'memory-heap-used-post-action', finalMemoryMB, 'MB');
		await attachMetric(testInfo, 'memory-heap-retained', memoryRetainedMB, 'MB');

		expect(baselineMemoryMB).toBeGreaterThan(0);
		expect(finalMemoryMB).toBeGreaterThan(0);
		console.log(
			`[MEMORY RETENTION] Baseline: ${baselineMemoryMB.toFixed(1)} MB | Final: ${finalMemoryMB.toFixed(1)} MB | ` +
				`Retained: ${memoryRetainedMB.toFixed(1)} MB (${retentionPercent.toFixed(1)}%)`,
		);
	});
});
