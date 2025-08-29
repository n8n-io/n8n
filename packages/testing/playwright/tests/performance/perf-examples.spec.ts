import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';
import { getAllPerformanceMetrics, measurePerformance } from '../../utils/performance-helper';

async function setupPerformanceTest(n8n: n8nPage, size: number) {
	await n8n.goHome();
	await n8n.workflows.clickNewWorkflowCard();
	await n8n.canvas.importWorkflow('large.json', 'Large Workflow');
	await n8n.notifications.closeNotificationByText('Successful');

	// Configure data size
	await n8n.canvas.openNode('Edit Fields');
	await n8n.page
		.getByTestId('parameter-input-value')
		.getByTestId('parameter-input-field')
		.fill(size.toString());
	await n8n.ndv.clickBackToCanvasButton();
}

test.describe('Performance Example: Multiple sets}', () => {
	const testData = [
		{
			size: 30000,
			timeout: 40000,
			budgets: {
				triggerWorkflow: 8000, // 8s budget (actual: 6.4s)
				openLargeNode: 2500, // 2.5s budget (actual: 1.6s)
			},
		},
		{
			size: 60000,
			timeout: 60000,
			budgets: {
				triggerWorkflow: 15000, // 15s budget (actual: 12.4s)
				openLargeNode: 6000, // 6s budget (actual: 4.9s)
			},
		},
	];

	testData.forEach(({ size, timeout, budgets }) => {
		test(`workflow performance - ${size.toLocaleString()} items`, async ({ n8n }) => {
			test.setTimeout(timeout);

			// Setup workflow
			await setupPerformanceTest(n8n, size);

			// Measure workflow execution
			const triggerDuration = await measurePerformance(n8n.page, 'trigger-workflow', async () => {
				await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful', {
					timeout: budgets.triggerWorkflow + 5000, // Add buffer
				});
			});

			// Assert trigger performance
			expect(triggerDuration).toBeLessThan(budgets.triggerWorkflow);
			console.log(
				`✓ Trigger workflow (${size} items): ${triggerDuration.toFixed(1)}ms < ${budgets.triggerWorkflow}ms`,
			);

			// Measure node opening
			const openNodeDuration = await measurePerformance(n8n.page, 'open-large-node', async () => {
				await n8n.canvas.openNode('Code');
			});

			// Assert node opening performance
			expect(openNodeDuration).toBeLessThan(budgets.openLargeNode);
			console.log(
				`✓ Open node (${size} items): ${openNodeDuration.toFixed(1)}ms < ${budgets.openLargeNode}ms`,
			);

			// Get all metrics and attach to test report
			const allMetrics = await getAllPerformanceMetrics(n8n.page);
			console.log(`\nAll performance metrics for ${size.toLocaleString()} items:`, allMetrics);

			// Attach metrics to test report
			await test.info().attach('performance-metrics', {
				body: JSON.stringify(
					{
						dataSize: size,
						metrics: allMetrics,
						budgets,
						passed: {
							triggerWorkflow: triggerDuration < budgets.triggerWorkflow,
							openNode: openNodeDuration < budgets.openLargeNode,
						},
					},
					null,
					2,
				),
				contentType: 'application/json',
			});
		});
	});
});

test('Performance Example: Multiple Loops in a single test', async ({ n8n }) => {
	await setupPerformanceTest(n8n, 30000);
	const loopSize = 20;
	const stats = [];

	await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful');

	for (let i = 0; i < loopSize; i++) {
		// Measure node opening
		const openNodeDuration = await measurePerformance(n8n.page, `open-node-${i}`, async () => {
			await n8n.canvas.openNode('Code');
		});

		stats.push(openNodeDuration);
		await n8n.ndv.clickBackToCanvasButton();

		console.log(`✓ Open node (${i + 1} of ${loopSize}): ${openNodeDuration.toFixed(1)}ms`);
	}
	// Get the average of the stats
	const average = stats.reduce((a, b) => a + b, 0) / stats.length;
	console.log(`Average open node duration: ${average.toFixed(1)}ms`);
	expect(average).toBeLessThan(2000);
});

test('Performance Example: Aserting on a performance metric', async ({ n8n }) => {
	await setupPerformanceTest(n8n, 30000);
	await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful');
	const openNodeDuration = await measurePerformance(n8n.page, 'open-node', async () => {
		await n8n.canvas.openNode('Code');
	});
	expect(openNodeDuration).toBeLessThan(2000);
});
