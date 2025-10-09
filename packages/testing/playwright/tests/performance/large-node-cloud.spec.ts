import { test, expect } from '../../fixtures/cloud';
import type { n8nPage } from '../../pages/n8nPage';
import { measurePerformance, attachMetric } from '../../utils/performance-helper';

async function setupPerformanceTest(n8n: n8nPage, size: number) {
	await n8n.start.fromImportedWorkflow('large.json');
	await n8n.notifications.closeNotificationByText('Successful');

	await n8n.canvas.openNode('Edit Fields');
	await n8n.ndv.fillParameterInputByName('value', size.toString());
	await n8n.ndv.clickBackToCanvasButton();
}

test.describe('Large Data Size Performance - Cloud Resources', () => {
	test('Code Node with 30000 items @cloud:starter', async ({ n8n }, testInfo) => {
		const itemCount = 30000;
		await setupPerformanceTest(n8n, itemCount);
		const workflowExecuteBudget = 10_000;
		const openNodeBudget = 600;
		const loopSize = 30;
		const stats = [];

		const triggerDuration = await measurePerformance(n8n.page, 'trigger-workflow', async () => {
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
				{
					// Add buffer, we still assert at the end and expect less than the budget
					timeout: workflowExecuteBudget + 5000,
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

		expect.soft(average, `Open node duration for ${itemCount} items`).toBeLessThan(openNodeBudget);
		expect
			.soft(triggerDuration, `Trigger workflow duration for ${itemCount} items`)
			.toBeLessThan(workflowExecuteBudget);
	});
});
