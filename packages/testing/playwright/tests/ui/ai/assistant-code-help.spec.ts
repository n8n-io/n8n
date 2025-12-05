import {
	codeDiffSuggestionResponse,
	applyCodeDiffResponse,
	nodeExecutionSucceededResponse,
	aiEnabledWorkflowBaseRequirements,
	aiEnabledWithCodeDiffRequirements,
} from '../../../config/ai-assistant-fixtures';
import { test, expect } from '../../../fixtures/base';

test.describe('AI Assistant::enabled', () => {
	test.describe('Code Node Error Help', () => {
		test('should apply code diff to code node', async ({ n8n, setupRequirements }) => {
			await setupRequirements(aiEnabledWithCodeDiffRequirements);

			let applySuggestionCalls = 0;
			await n8n.page.route('**/rest/ai/chat/apply-suggestion', async (route) => {
				applySuggestionCalls += 1;
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(applyCodeDiffResponse),
				});
			});

			await n8n.canvas.openNode('Code');

			await n8n.ndv.execute();

			await n8n.aiAssistant.getNodeErrorViewAssistantButton().click();

			await expect(n8n.aiAssistant.getChatMessagesAll()).toHaveCount(2);
			await expect(n8n.aiAssistant.getCodeDiffs()).toHaveCount(1);
			await expect(n8n.aiAssistant.getApplyCodeDiffButtons()).toHaveCount(1);

			await n8n.aiAssistant.getApplyCodeDiffButtons().first().click();

			await expect(n8n.aiAssistant.getApplyCodeDiffButtons()).toHaveCount(0);
			await expect(n8n.aiAssistant.getUndoReplaceCodeButtons()).toHaveCount(1);
			await expect(n8n.aiAssistant.getCodeReplacedMessage()).toBeVisible();
			await expect(n8n.ndv.getCodeEditor()).toContainText('item.json.myNewField = 1');

			await n8n.aiAssistant.getUndoReplaceCodeButtons().first().click();

			await expect(n8n.aiAssistant.getApplyCodeDiffButtons()).toHaveCount(1);
			await expect(n8n.aiAssistant.getCodeReplacedMessage()).toHaveCount(0);
			expect(applySuggestionCalls).toBe(1);
			await expect(n8n.ndv.getCodeEditor()).toContainText('item.json.myNewField = 1aaa');

			await n8n.aiAssistant.getApplyCodeDiffButtons().first().click();

			await expect(n8n.ndv.getCodeEditor()).toContainText('item.json.myNewField = 1');
		});

		test('should ignore node execution success and error messages after the node run successfully once', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(aiEnabledWorkflowBaseRequirements);

			let chatRequestCount = 0;
			await n8n.page.route('**/rest/ai/chat', async (route) => {
				chatRequestCount += 1;
				const response =
					chatRequestCount === 1 ? codeDiffSuggestionResponse : nodeExecutionSucceededResponse;
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(response),
				});
			});

			await n8n.canvas.openNode('Code');
			await n8n.ndv.execute();
			await n8n.aiAssistant.getNodeErrorViewAssistantButton().click();

			await n8n.ndv
				.getCodeEditor()
				.fill(
					"// Loop over input items and add a new field called 'myNewField' to the JSON of each one\nfor (const item of $input.all()) {\n  item.json.myNewField = 1;\n}\n\nreturn $input.all();",
				);

			await n8n.ndv.execute();

			await n8n.ndv
				.getCodeEditor()
				.fill(
					"// Loop over input items and add a new field called 'myNewField' to the JSON of each one\nfor (const item of $input.all()) {\n  item.json.myNewField = 1aaaa!;\n}\n\nreturn $input.all();",
				);

			await n8n.ndv.execute();

			await expect(n8n.aiAssistant.getChatMessagesAssistant().nth(2)).toContainText(
				'Code node ran successfully, did my solution help resolve your issue?',
			);
		});
	});
});
