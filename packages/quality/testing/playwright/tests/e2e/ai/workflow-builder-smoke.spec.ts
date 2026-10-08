import { workflowBuilderEnabledRequirements } from '../../../config/ai-builder-fixtures';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'Legacy Workflow Builder @auth:owner @ai',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test('opens from an empty canvas with an enabled suggestion', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(workflowBuilderEnabledRequirements);
			await n8n.start.fromBlankCanvas();

			await n8n.aiBuilder.waitForCanvasBuildEntry();
			await n8n.aiBuilder.getCanvasBuildWithAIButton().click();

			await expect(n8n.aiAssistant.getAskAssistantSidebar()).toBeVisible();
			await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();

			const suggestion = n8n.aiBuilder
				.getSuggestionPills()
				.filter({ hasText: 'Daily weather report' });
			await expect(suggestion).toBeVisible();
			await expect(suggestion).toBeEnabled();
		});
	},
);
