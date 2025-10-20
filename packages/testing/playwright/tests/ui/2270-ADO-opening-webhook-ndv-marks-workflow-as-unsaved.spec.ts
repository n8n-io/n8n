import { test, expect } from '../../fixtures/base';

test.describe('ADO-2270 Save button resets on webhook node open', () => {
	test('should not reset the save button if webhook node is opened and closed', async ({ n8n }) => {
		await n8n.goHome();

		await n8n.workflows.addResource.workflow();
		await n8n.canvas.addNode('Webhook');

		await n8n.page.keyboard.press('Escape');

		await n8n.canvas.clickSaveWorkflowButton();

		await n8n.canvas.openNode('Webhook');

		await n8n.ndv.clickBackToCanvasButton();

		await expect(n8n.canvas.getWorkflowSaveButton()).toContainText('Saved');
	});
});
