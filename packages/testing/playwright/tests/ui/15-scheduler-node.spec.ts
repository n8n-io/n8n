import { test, expect } from '../../fixtures/base';

test.describe('Schedule Trigger node', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
	});

	test('should execute schedule trigger node and return timestamp in output', async ({ n8n }) => {
		await n8n.workflows.clickAddWorkflowButton();
		await n8n.canvas.addNode('Schedule Trigger');

		await n8n.ndv.execute();

		await expect(n8n.ndv.getOutputPanel()).toContainText('timestamp');

		await n8n.ndv.clickBackToCanvasButton();
	});
});
