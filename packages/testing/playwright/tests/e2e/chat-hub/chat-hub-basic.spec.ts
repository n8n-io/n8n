import { test, expect, chatHubTestConfig } from './fixtures';

test.use(chatHubTestConfig);

test.describe(
	'Basic conversation @capability:proxy',
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

		test('conversation flow', async ({ n8n, anthropicCredential: _ }) => {
			await n8n.navigate.toChatHub();
			await n8n.chatHubChat.dismissWelcomeScreen();
			await expect(n8n.chatHubChat.getModelSelectorButton()).toContainText(/claude/i); // auto-select a model

			// STEP: send first prompt
			await n8n.chatHubChat.getChatInput().fill('Hi');
			await n8n.chatHubChat.getSendButton().click();
			await expect(n8n.chatHubChat.getChatMessages().nth(0)).toHaveText('Hi'); // user-typed, assert exact
			await n8n.chatHubChat.expectReplyAt(1); // assistant reply streamed in (content is non-deterministic)
			// Message counts are structural (not model content), so they stay exact.
			await expect(n8n.chatHubChat.getChatMessages()).toHaveCount(2);

			// Capture the first assistant reply so alternatives can be compared
			// structurally without hardcoding drift-prone model text.
			const firstReply = await n8n.chatHubChat.getMessageContentAt(1).innerText();

			// STEP: send 2nd prompt
			await n8n.chatHubChat.getChatInput().fill('How are you?');
			await n8n.chatHubChat.getSendButton().click();
			await expect(n8n.chatHubChat.getChatMessages().nth(0)).toContainText('Hi'); // user-typed, assert exact
			await n8n.chatHubChat.expectReplyAt(1);
			await expect(n8n.chatHubChat.getChatMessages().nth(2)).toContainText('How are you?'); // user-typed, assert exact
			await n8n.chatHubChat.expectReplyAt(3);
			await expect(n8n.chatHubChat.getChatMessages()).toHaveCount(4);

			// STEP: regenerate response to first prompt - the alternative must differ
			await n8n.chatHubChat.clickRegenerateButtonAt(1);
			await expect(n8n.chatHubChat.getChatMessages()).toHaveCount(2);
			await expect
				.poll(async () => await n8n.chatHubChat.getMessageContentAt(1).innerText())
				.not.toBe(firstReply);

			// STEP: switch to previous alternative - restores the original reply
			await n8n.chatHubChat.clickPrevAlternativeButtonAt(1);
			await expect(n8n.chatHubChat.getChatMessages()).toHaveCount(4);
			await expect
				.poll(async () => await n8n.chatHubChat.getMessageContentAt(1).innerText())
				.toBe(firstReply);

			// STEP: edit 2nd prompt
			await n8n.chatHubChat.clickEditButtonAt(2);
			await n8n.chatHubChat.getEditorAt(2).fill('Hola');
			await n8n.chatHubChat.getSendButtonAt(2).click();
			await expect(n8n.chatHubChat.getChatMessages().nth(2)).toContainText('Hola'); // user-typed, assert exact
			await n8n.chatHubChat.expectReplyAt(3); // assistant reply streamed in (content is non-deterministic)
			await expect(n8n.chatHubChat.getChatMessages()).toHaveCount(4);

			// STEP: reload page and verify persistence
			await n8n.page.reload();
			await expect(n8n.chatHubChat.getChatMessages()).toHaveCount(4);
			await expect(n8n.chatHubChat.getChatMessages().nth(0)).toContainText('Hi'); // user-typed, assert exact
			await expect
				.poll(async () => await n8n.chatHubChat.getMessageContentAt(1).innerText())
				.toBe(firstReply); // restored alternative persisted across reload
			await expect(n8n.chatHubChat.getChatMessages().nth(2)).toContainText('Hola'); // user-typed, assert exact
			await n8n.chatHubChat.expectReplyAt(3);
		});
	},
);
