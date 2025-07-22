import { test, expect } from '../../fixtures/base';
import { getAllPerformanceMetrics, measurePerformance } from '../../fixtures/performance-helper';

test.describe('Workflow Builder Performance', () => {
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
		{
			size: 100000,
			timeout: 100000,
			budgets: {
				triggerWorkflow: 25000, // 25s budget (actual: 20.5s)
				openLargeNode: 15000, // 15s budget (actual: 12.7s)
			},
		},
	];

	testData.forEach(({ size, timeout, budgets }) => {
		test(`workflow performance - ${size.toLocaleString()} items @db:reset`, async ({ n8n }) => {
			test.setTimeout(timeout);

			// Setup workflow
			await n8n.goHome();
			await n8n.workflows.clickNewWorkflowCard();
			await n8n.workflows.importWorkflow('large.json', 'Large Workflow');
			await n8n.notifications.closeNotificationByText('Successful');

			// Configure data size
			await n8n.canvas.openNode('Edit Fields');
			await n8n.page
				.getByTestId('parameter-input-value')
				.getByTestId('parameter-input-field')
				.fill(size.toString());
			await n8n.ndv.clickBackToCanvasButton();

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
