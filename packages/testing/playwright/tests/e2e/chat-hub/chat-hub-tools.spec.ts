import { test, expect, chatHubTestConfig } from './fixtures';
import { ChatHubChatPage } from '../../../pages/ChatHubChatPage';

test.use(chatHubTestConfig);

test.describe('Tools usage @capability:proxy', {
	annotation: [
		{ type: 'owner', description: 'Chat' },
	],
}, () => {
	test('use web search tool in conversation', async ({
		n8n,
		anthropicCredential: _,
		jinaCredential,
	}) => {
		const page = new ChatHubChatPage(n8n.page);

		await n8n.navigate.toChatHub();
		await page.dismissWelcomeScreen();
		await expect(page.getModelSelectorButton()).toContainText(/claude/i);

		// Open tools manager modal
		await page.getToolsButton().click();
		await expect(page.toolsModal.getRoot()).toBeVisible();

		// Add Jina AI tool from available tools list
		await page.toolsModal.getAddButton('Jina AI').click();

		// Select credential in settings view
		await page.toolsModal.getCredentialSelect().click();
		await page.getVisiblePopoverOption(jinaCredential.name).click();

		// Change Operation from "Read" to "Search"
		await page.toolsModal.getParameterInput('operation').click();
		await page.getVisiblePopoverOption('Search').click();

		// Set search query and simplify to "defined automatically by the model"
		await page.toolsModal.getFromAiOverrideButton('searchQuery').click();
		await page.toolsModal.getFromAiOverrideButton('simplify').click();

		// Save and close
		await page.toolsModal.getSaveButton().click();
		await page.toolsModal.getCloseButton().click();
		await expect(page.toolsModal.getRoot()).toBeHidden();

		// Verify tool is shown
		await expect(page.getToolsButton()).toContainText('Search web in Jina AI');

		// Send message and check response
		await page.getChatInput().fill('What is n8n?');
		await page.getSendButton().click();
		await expect(page.getChatMessages().nth(0)).toContainText('What is n8n?');
		await expect(page.getChatMessages().nth(1)).toContainText(/automation/i, {
			timeout: 60000,
		});
	});
});
