/**
 * Large Node Performance Tests with Cloud Resource Constraints
 *
 * These tests use @cloud-* tags to automatically create resource-limited containers
 * that simulate n8n Cloud plan constraints.
 */

import { test, expect } from '../../fixtures/cloud';
import type { n8nPage } from '../../pages/n8nPage';
import { measurePerformance } from '../../utils/performance-helper';

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

test.describe('Large Node Performance - Cloud Resources', () => {
	test('Large workflow with starter plan resources @cloud:starter', async ({ n8n }) => {
		await setupPerformanceTest(n8n, 30000);
		const loopSize = 20;
		const stats = [];

		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow executed successfully',
			{
				timeout: 30000,
			},
		);

		for (let i = 0; i < loopSize; i++) {
			const openNodeDuration = await measurePerformance(n8n.page, `open-node-${i}`, async () => {
				await n8n.canvas.openNode('Code');
			});

			stats.push(openNodeDuration);
			await n8n.ndv.clickBackToCanvasButton();

			console.log(`✓ Open node (${i + 1} of ${loopSize}): ${openNodeDuration.toFixed(1)}ms`);
		}
		const average = stats.reduce((a, b) => a + b, 0) / stats.length;
		console.log(`Average open node duration: ${average.toFixed(1)}ms`);
		expect(average).toBeLessThan(5000);
	});
});

/*
Usage:

# Run all performance tests (including cloud resource tests)
pnpm --filter n8n-playwright test:performance

# Run only cloud resource tests
pnpm --filter n8n-playwright test --grep "@cloud:"

# Run specific cloud plan tests
pnpm --filter n8n-playwright test --grep "@cloud:trial"
pnpm --filter n8n-playwright test --grep "@cloud:enterprise"

# Run this specific file (cloud resource tests only)
pnpm --filter n8n-playwright test tests/performance/large-node-cloud.spec.ts
*/
