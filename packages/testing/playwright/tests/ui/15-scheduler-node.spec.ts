import { test, expect } from '../../fixtures/base';

test.describe('Schedule Trigger node', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
	});

	test('should execute schedule trigger node and return timestamp in output', async ({ n8n }) => {
		// Create a new workflow and add a Schedule Trigger node
		await n8n.workflows.clickAddWorkflowButton();
		await n8n.canvas.addNode('Schedule Trigger');

		// Execute the node using NDV execute (partial execution)
		// This executes just this node, not the entire workflow
		// The Schedule Trigger node should return a timestamp when executed
		await n8n.ndv.execute();

		// Verify the output panel contains "timestamp"
		await expect(n8n.ndv.getOutputPanel()).toContainText('timestamp');

		// Go back to canvas using the proper button
		await n8n.ndv.clickBackToCanvasButton();
	});
});
