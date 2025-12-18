import { ObservabilityHelper } from 'n8n-containers';

import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';
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

test.describe('Memory Leak Detection @capability:observability', () => {
	const CONTAINER_STABILIZATION_TIME = 20000;
	const MAX_MEMORY_RETENTION_PERCENT = 10;

	/**
	 * Define the memory-consuming action to test.
	 * This function can be easily modified to test different features.
	 */
	async function performMemoryAction(n8n: n8nPage) {
		// Example 1: AI Workflow Builder
		// Enable AI workflow feature
		await n8n.api.setEnvFeatureFlags({ '026_easy_ai_workflow': 'variant' });

		await n8n.navigate.toWorkflows();
		await expect(n8n.workflows.getEasyAiWorkflowCard()).toBeVisible({ timeout: 10000 });
		await n8n.workflows.clickEasyAiWorkflowCard();

		// Wait for AI workflow builder to fully load
		await n8n.page.waitForLoadState();
		await expect(n8n.canvas.sticky.getStickies().first()).toBeVisible({ timeout: 10000 });

		await new Promise((resolve) => setTimeout(resolve, 5000));
	}

	test('Memory should be released after actions', async ({ n8nContainer, n8n }, testInfo) => {
		const obs = new ObservabilityHelper(n8nContainer.observability!);

		// Let container stabilize
		await new Promise((resolve) => setTimeout(resolve, CONTAINER_STABILIZATION_TIME));

		// Get baseline heap usage (V8 heap is better for leak detection than RSS)
		// RSS can stay high after GC due to OS memory management
		const baselineResult = await obs.metrics.query(
			'avg_over_time(n8n_nodejs_heap_size_used_bytes[10s]) / 1024 / 1024',
		);
		expect(
			baselineResult.length,
			'Expected baseline metrics result to have at least one value',
		).toBeGreaterThan(0);
		const baselineMemoryMB = baselineResult[0].value;

		// Perform the memory-consuming action
		await performMemoryAction(n8n);
		await n8n.page.goto('/home/workflows');

		// Give time for garbage collection
		await new Promise((resolve) => setTimeout(resolve, 5000));

		// Measure final heap usage
		const finalResult = await obs.metrics.query(
			'avg_over_time(n8n_nodejs_heap_size_used_bytes[30s]) / 1024 / 1024',
		);
		expect(
			finalResult.length,
			'Expected final metrics result to have at least one value',
		).toBeGreaterThan(0);
		const finalMemoryMB = finalResult[0].value;

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
