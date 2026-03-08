import {
	simpleAssistantResponse,
	aiEnabledWithCodeSnippetRequirements,
	aiEnabledWithHttpWorkflowRequirements,
} from '../../../config/ai-assistant-fixtures';
import { HTTP_REQUEST_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

type ChatRequestBody = {
	payload?: {
		type?: string;
		text?: string;
		question?: string;
		context?: Record<string, unknown>;
	};
};

test.describe('AI Assistant::enabled', {
	annotation: [
		{ type: 'owner', description: 'AI' },
	],
}, () => {
	test.describe('Support Chat', () => {
		test('assistant returns code snippet', async ({ n8n, setupRequirements }) => {
			await setupRequirements(aiEnabledWithCodeSnippetRequirements);
			await n8n.page.goto('/workflow/new');

			await expect(n8n.aiAssistant.getAskAssistantCanvasActionButton()).toBeVisible();
			await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();

			await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();

			await n8n.aiAssistant.sendMessage('Show me an expression');

			await expect(n8n.aiAssistant.getChatMessagesAll()).toHaveCount(3);
			await expect(n8n.aiAssistant.getChatMessagesUser().first()).toContainText(
				'Show me an expression',
			);
			await expect(n8n.aiAssistant.getChatMessagesAssistant().first()).toContainText(
				'To use expressions in n8n, follow these steps:',
			);
			await expect(n8n.aiAssistant.getChatMessagesAssistant().first()).toContainText('New York');
			await expect(n8n.aiAssistant.getCodeSnippet()).toHaveText('{{$json.body.city}}');
		});

		test('should send current context to support chat', async ({ n8n, setupRequirements }) => {
			await setupRequirements(aiEnabledWithHttpWorkflowRequirements);

			const chatRequests: ChatRequestBody[] = [];
			await n8n.page.route('**/rest/ai/chat', async (route) => {
				const body = route.request().postDataJSON() as ChatRequestBody;
				chatRequests.push(body);
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(simpleAssistantResponse),
				});
			});

			await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();
			await n8n.aiAssistant.sendMessage('What is wrong with this workflow?');

			const supportRequest = chatRequests.find(
				(request) => request.payload?.question === 'What is wrong with this workflow?',
			);
			expect(supportRequest).toBeDefined();
			const supportContext = supportRequest?.payload?.context;
			expect(supportContext).toBeDefined();
			expect(supportContext?.currentView).toBeDefined();
			expect(supportContext?.currentWorkflow).toBeDefined();
		});

		test('should not send workflow context if nothing changed', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(aiEnabledWithHttpWorkflowRequirements);

			const chatRequests: ChatRequestBody[] = [];
			await n8n.page.route('**/rest/ai/chat', async (route) => {
				const body = route.request().postDataJSON() as ChatRequestBody;
				chatRequests.push(body);
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(simpleAssistantResponse),
				});
			});

			await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();

			await n8n.aiAssistant.sendMessage('What is wrong with this workflow?', 'enter-key');
			// Wait for message to be processed
			await expect(n8n.aiAssistant.getChatMessagesAssistant()).toHaveCount(1);

			await n8n.aiAssistant.sendMessage('And now?', 'enter-key');
			await expect(n8n.aiAssistant.getChatMessagesAssistant()).toHaveCount(2);
			const secondRequest = chatRequests.find((request) => request.payload?.text === 'And now?');
			const secondContext = secondRequest?.payload?.context;
			expect(secondContext?.currentWorkflow).toBeUndefined();

			await n8n.canvas.openNode(HTTP_REQUEST_NODE_NAME);
			await n8n.ndv.setParameterInputValue('url', 'https://example.com');
			await n8n.ndv.close();
			await n8n.canvas.clickExecuteWorkflowButton();

			await n8n.aiAssistant.sendMessage('What about now?', 'enter-key');
			await expect(n8n.aiAssistant.getChatMessagesAssistant()).toHaveCount(3);

			const thirdRequest = chatRequests.find(
				(request) => request.payload?.text === 'What about now?',
			);
			const thirdContext = thirdRequest?.payload?.context;
			expect(thirdContext?.currentWorkflow).toBeTruthy();
			expect(thirdContext?.executionData).toBeTruthy();
		});
	});
});
