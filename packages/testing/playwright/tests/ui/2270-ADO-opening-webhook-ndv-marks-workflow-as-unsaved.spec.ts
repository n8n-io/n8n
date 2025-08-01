import { test, expect } from '../../fixtures/base';

test.describe('ADO-2270 Save button resets on webhook node open', () => {
	test('should not reset the save button if webhook node is opened and closed', async ({ n8n }) => {
		// Start from home page
		await n8n.goHome();

		// Create a new workflow and add a webhook node
		await n8n.workflows.clickAddWorkflowButton();
		await n8n.canvas.addNode('Webhook');

		// Close the NDV that opens after adding the node
		await n8n.page.keyboard.press('Escape');

		// Click the save button
		await n8n.canvas.clickSaveWorkflowButton();

		// Open the webhook node (NDV)
		await n8n.canvas.openNode('Webhook');

		// Close the NDV
		await n8n.ndv.clickBackToCanvasButton();

		// Verify the save button still shows "Saved"
		await expect(n8n.canvas.workflowSaveButton()).toContainText('Saved');
	});
});
