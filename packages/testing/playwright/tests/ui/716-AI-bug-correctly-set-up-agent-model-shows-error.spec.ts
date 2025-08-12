import { test, expect } from '../../fixtures/base';

test.describe('AI-716 Correctly set up agent model shows error', () => {
	test('should not show error when adding a sub-node with credential set-up', async ({ n8n }) => {
		await n8n.goHome();
		await n8n.workflows.clickAddWorkflowButton();

		await n8n.canvas.addNode('AI Agent');

		await n8n.page.keyboard.press('Escape');

		await n8n.canvas.addNode('OpenAI Chat Model');

		await n8n.credentials.createAndSaveNewCredential('apiKey', 'sk-123');

		await n8n.page.keyboard.press('Escape');

		await expect(n8n.canvas.getNodeIssuesByName('OpenAI Chat Model')).toHaveCount(0);
	});
});
