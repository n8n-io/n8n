import { test, expect, chatHubTestConfig } from './fixtures';

test.use(chatHubTestConfig);

test.describe(
	'Tools usage @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Chat' }],
	},
	() => {
		test('use web search tool in conversation', async ({
			n8n,
			anthropicCredential: _,
			jinaCredential,
		}) => {
			await n8n.navigate.toChatHub();
			await n8n.chatHubChat.dismissWelcomeScreen();
			await expect(n8n.chatHubChat.getModelSelectorButton()).toContainText(/claude/i);

			// Open tools manager modal
			await n8n.chatHubChat.getToolsButton().click();
			await expect(n8n.chatHubChat.toolsModal.getRoot()).toBeVisible();

			// Add Jina AI tool from available tools list
			await n8n.chatHubChat.toolsModal.getAddButton('Jina AI').click();

			// Select credential in settings view
			await n8n.chatHubChat.toolsModal.getCredentialSelect().click();
			await n8n.chatHubChat.getVisiblePopoverOption(jinaCredential.name).click();

			// Change Operation from "Read" to "Search"
			await n8n.chatHubChat.toolsModal.getParameterInput('operation').click();
			await n8n.chatHubChat.getVisiblePopoverOption('Search').click();

			// Set search query and simplify to "defined automatically by the model"
			await n8n.chatHubChat.toolsModal.getFromAiOverrideButton('searchQuery').click();
			await n8n.chatHubChat.toolsModal.getFromAiOverrideButton('simplify').click();

			// Save and close
			await n8n.chatHubChat.toolsModal.getSaveButton().click();
			await n8n.chatHubChat.toolsModal.getCloseButton().click();
			await expect(n8n.chatHubChat.toolsModal.getRoot()).toBeHidden();

			// Verify tool is shown
			await expect(n8n.chatHubChat.getToolsButton()).toContainText('Search web in Jina AI');

			// Send message and check response
			await n8n.chatHubChat.getChatInput().fill('What is n8n?');
			await n8n.chatHubChat.getSendButton().click();
			await expect(n8n.chatHubChat.getChatMessages().nth(0)).toContainText('What is n8n?');
			await expect(n8n.chatHubChat.getChatMessages().nth(1)).toContainText(/automation/i, {
				timeout: 60000,
			});
		});
	},
);
