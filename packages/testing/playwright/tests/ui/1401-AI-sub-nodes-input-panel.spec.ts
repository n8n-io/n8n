import { test, expect } from '../../fixtures/base';

test.describe('AI-1401 AI sub-nodes show node output with no path back in input', () => {
	test('should show correct root node for nested sub-nodes in input panel', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_ai_1401.json');

		// Execute the workflow first to generate data
		await n8n.canvas.executeNode('Edit Fields');
		await n8n.page.waitForTimeout(3000); // Wait for execution to complete

		for (const node of ['hackernews_top', 'hackernews_sub']) {
			await n8n.canvas.openNode(node);
			await expect(n8n.ndv.getContainer()).toBeVisible();
			await expect(n8n.ndv.inputPanel.get()).toBeVisible();

			// Switch to JSON mode within the mapping view
			await n8n.ndv.inputPanel.switchDisplayMode('json');
			// Verify the input node dropdown shows the correct parent nodes
			const inputNodeSelect = n8n.ndv.inputPanel.get().locator('[data-test-id*="input-select"]');
			await expect(inputNodeSelect).toBeVisible();
			await inputNodeSelect.click();
			await expect(n8n.page.getByRole('option', { name: 'Edit Fields' })).toBeVisible();
			await expect(n8n.page.getByRole('option', { name: 'Manual Trigger' })).toBeVisible();
			await expect(n8n.page.getByRole('option', { name: 'No Operation, do nothing' })).toBeHidden();

			await n8n.ndv.clickBackToCanvasButton();
		}
	});
});
