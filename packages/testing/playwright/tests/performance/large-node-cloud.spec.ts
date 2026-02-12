import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';
import { measurePerformance, attachMetric } from '../../utils/performance-helper';

async function setupPerformanceTest(n8n: n8nPage, size: number) {
	await n8n.start.fromImportedWorkflow('large.json');
	await n8n.notifications.closeNotificationByText('Successful');

	await n8n.canvas.openNode('Edit Fields');
	await n8n.ndv.fillParameterInputByName('value', size.toString());
	await n8n.ndv.clickBackToCanvasButton();
}

test.use({
	capability: {
		resourceQuota: {
			memory: 0.75,
			cpu: 0.5,
		},
	},
});
test.describe('Large Data Size Performance - Cloud Resources', {
	annotation: [
		{ type: 'owner', description: 'Catalysts' },
	],
}, () => {
	test('Code Node with 30000 items', async ({ n8n }, testInfo) => {
		const itemCount = 30000;
		await setupPerformanceTest(n8n, itemCount);
		const workflowExecuteTimeout = 65_000;
		const loopSize = 30;
		const stats = [];

		const triggerDuration = await measurePerformance(n8n.page, 'trigger-workflow', async () => {
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
				{
					timeout: workflowExecuteTimeout,
				},
			);
		});

		for (let i = 0; i < loopSize; i++) {
			const openNodeDuration = await measurePerformance(n8n.page, `open-node-${i}`, async () => {
				await n8n.canvas.openNode('Code');
			});

			stats.push(openNodeDuration);
			await n8n.ndv.clickBackToCanvasButton();
		}
		const average = stats.reduce((a, b) => a + b, 0) / stats.length;

		await attachMetric(testInfo, `open-node-${itemCount}`, average, 'ms');
		await attachMetric(testInfo, `trigger-workflow-${itemCount}`, triggerDuration, 'ms');

		expect(average).toBeGreaterThan(0);
		expect(triggerDuration).toBeGreaterThan(0);
		console.log(
			`[PERF] Open node avg: ${average.toFixed(2)} ms | Workflow trigger: ${triggerDuration.toFixed(2)} ms`,
		);
	});
});
