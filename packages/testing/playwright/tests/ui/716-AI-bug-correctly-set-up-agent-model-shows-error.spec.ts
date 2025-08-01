import { test, expect } from '../../fixtures/base';

test.describe('AI-716 Correctly set up agent model shows error', () => {
	test('should not show error when adding a sub-node with credential set-up', async ({ n8n }) => {
		// Start from home page and create new workflow
		await n8n.goHome();
		await n8n.workflows.clickAddWorkflowButton();

		// Add AI Agent node to canvas
		await n8n.canvas.addNode('AI Agent');

		// Close the NDV that opens after adding the node
		await n8n.page.keyboard.press('Escape');

		// Add OpenAI Chat Model node
		await n8n.canvas.addNode('OpenAI Chat Model');

		// Create OpenAI credential using the established pattern
		await n8n.credentials.createAndSaveNewCredential('apiKey', 'sk-123');

		// Close any open NDV
		await n8n.page.keyboard.press('Escape');

		// Verify no node issues for the language model node
		await expect(n8n.canvas.getNodeIssuesByName('OpenAI Chat Model')).toHaveCount(0);
	});
});
