import { test, expect, chatHubTestConfig } from './fixtures';

test.use(chatHubTestConfig);

test.describe(
	'Basic conversation',
	{
		annotation: [{ type: 'owner', description: 'Chat' }],
	},
	() => {
		test('new chat with pre-configured credentials', async ({ n8n, anthropicCredential: _ }) => {
			await n8n.navigate.toChatHub();
			await n8n.chatHubChat.dismissWelcomeScreen();

			await expect(n8n.chatHubChat.getGreetingMessage()).toContainText('Start a chat with');
			await expect(n8n.chatHubChat.getModelSelectorButton()).toContainText(/claude/i); // pre-selected

			await n8n.chatHubChat.getChatInput().fill('Hello');
			await n8n.chatHubChat.getSendButton().click();
			await expect(n8n.chatHubChat.getChatMessages().nth(0)).toContainText('Hello'); // user-typed, assert exact
			await n8n.chatHubChat.expectReplyAt(1); // assistant reply streamed in (content is non-deterministic)
			// Assert the auto-titled conversation is listed rather than matching its
			// generated title text, which drifts as fixtures are re-recorded.
			await expect(n8n.chatHubChat.sidebar.getConversations().first()).toBeVisible();
		});

		// Test with a different user to avoid race condition on credentials
		test('new chat without pre-configured credentials @auth:member', async ({
			n8n,
			anthropicApiKey,
		}) => {
			await n8n.navigate.toChatHub();
			await n8n.chatHubChat.dismissWelcomeScreen();

			await expect(n8n.chatHubChat.getGreetingMessage()).toContainText(
				'Select a model to start chatting',
			);

			await n8n.chatHubChat.getModelSelectorButton().click();
			await n8n.page.waitForTimeout(500); // to reliably hover intended menu item
			await n8n.chatHubChat.getVisiblePopoverMenuItem('Anthropic').hover({ force: true });
			await n8n.chatHubChat
				.getVisiblePopoverMenuItem('Configure credentials', { exact: true })
				.click();

			await n8n.canvas.credentialModal.fillField('apiKey', anthropicApiKey);
			await n8n.canvas.credentialModal.save();
			await n8n.canvas.credentialModal.close();

			await expect(n8n.chatHubChat.getModelSelectorButton()).toContainText(/claude/i); // auto-select a model

			await n8n.chatHubChat.getChatInput().fill('Hello from e2e');
			await n8n.chatHubChat.getSendButton().click();
			await expect(n8n.chatHubChat.getChatMessages().nth(0)).toContainText('Hello from e2e'); // user-typed, assert exact
			await n8n.chatHubChat.expectReplyAt(1); // assistant reply streamed in (content is non-deterministic)
			// Assert the auto-titled conversation is listed rather than matching its
			// generated title text, which drifts as fixtures are re-recorded.
			await expect(n8n.chatHubChat.sidebar.getConversations().first()).toBeVisible();
		});
	},
);
