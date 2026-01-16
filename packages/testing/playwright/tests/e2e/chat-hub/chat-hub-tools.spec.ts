import { test, expect, chatHubTestConfig } from './fixtures';
import { ChatHubChatPage } from '../../../pages/ChatHubChatPage';

test.use(chatHubTestConfig);

test.describe('Tools usage @capability:proxy', () => {
	test('use web search tool in conversation', async ({
		n8n,
		anthropicCredential: _,
		jinaCredential,
	}) => {
		const page = new ChatHubChatPage(n8n.page);

		await n8n.navigate.toChatHub();
		await expect(page.getModelSelectorButton()).toContainText(/claude/i);

		await page.getToolsButton().click();
		await page.toolsModal.getCredentialSelect('Jina AI').click();
		await page.getVisiblePopoverOption(jinaCredential.name).click();
		await page.toolsModal.getToolSwitch('Jina AI', 'Web Search').click();
		await page.toolsModal.getConfirmButton().click();

		await expect(page.toolsModal.getRoot()).not.toBeVisible();
		await expect(page.getToolsButton()).toHaveText('1 Tool');
		await page.getChatInput().fill('What is n8n?');
		await page.getSendButton().click();

		await expect(page.getChatMessages().nth(0)).toContainText('What is n8n?');
		await expect(page.getChatMessages().nth(1)).toContainText(/automation/i, {
			timeout: 60000, // needed when recording actual request
		});
	});
});
