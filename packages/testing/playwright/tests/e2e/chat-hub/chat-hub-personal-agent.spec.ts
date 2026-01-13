import { test, expect, chatHubTestConfig } from './fixtures';
import { ChatHubChatPage } from '../../../pages/ChatHubChatPage';
import { ChatHubPersonalAgentsPage } from '../../../pages/ChatHubPersonalAgentsPage';

test.use(chatHubTestConfig);

test.describe('Personal agent @capability:proxy', () => {
	test('create personal agent and start conversation @auth:owner', async ({
		n8n,
		anthropicCredential: _,
	}) => {
		const page = new ChatHubChatPage(n8n.page);

		await n8n.navigate.toChatHub();

		await page.getModelSelectorButton().click();
		await n8n.page.waitForTimeout(500); // to reliably hover intended menu item
		await page.getVisiblePopoverMenuItem('Personal agents').hover({ force: true });
		await page.getVisiblePopoverMenuItem('New Agent', { exact: true }).click();

		await page.personalAgentModal.getNameField().fill('e2e agent');
		await page.personalAgentModal.getDescriptionField().fill('just for testing');
		await page.personalAgentModal.getSystemPromptField().fill('reply in Chinese');

		await page.personalAgentModal.getModelSelectorButton().click();
		await n8n.page.waitForTimeout(500); // to reliably hover intended menu item
		await page.getVisiblePopoverMenuItem('Anthropic').hover({ force: true });
		await page.getVisiblePopoverMenuItem('Claude Opus 4.5', { exact: true }).click();

		await page.personalAgentModal.getSaveButton().click();
		await expect(page.personalAgentModal.getRoot()).not.toBeInViewport(); // wait for modal to close

		await expect(page.getModelSelectorButton()).toContainText('e2e agent');

		await page.getChatInput().fill('Hello');
		await page.getSendButton().click();

		await expect(page.getChatMessages().last()).toContainText('你好');
	});

	test('manage personal agents @auth:admin', async ({ n8n, anthropicCredential: _ }) => {
		const page = new ChatHubPersonalAgentsPage(n8n.page);
		const chatPage = new ChatHubChatPage(n8n.page);

		await n8n.navigate.toChatHubPersonalAgents();
		await page.getNewAgentButton().click();

		// STEP: create an agent
		await page.editModal.getNameField().fill('e2e agent');
		await page.editModal.getDescriptionField().fill('just for testing');
		await page.editModal.getSystemPromptField().fill('reply in Chinese');

		await page.editModal.getModelSelectorButton().click();
		await n8n.page.waitForTimeout(500); // to reliably hover intended menu item
		await page.editModal.getVisiblePopoverMenuItem('Anthropic').hover({ force: true });
		await page.editModal.getVisiblePopoverMenuItem('Claude Opus 4.5', { exact: true }).click();

		await page.editModal.getSaveButton().click();
		await expect(page.editModal.getRoot()).not.toBeInViewport(); // wait for modal to close
		await expect(page.getAgentCards()).toHaveCount(1);
		await expect(page.getAgentCards().nth(0)).toContainText('e2e agent');

		// STEP: send message to the created agent
		await page.getAgentCards().nth(0).click();
		await chatPage.getChatInput().fill('Hello');
		await chatPage.getSendButton().click();
		await expect(chatPage.getChatMessages().last()).toContainText('你好');

		// STEP: update instructions for the agent
		await chatPage.sidebar.getPersonalAgentButton().click();
		await page.getEditButtonAt(0).click();
		await page.editModal.getSystemPromptField().fill('reply in Japanese');
		await page.editModal.getSaveButton().click();
		await expect(page.editModal.getRoot()).not.toBeInViewport(); // wait for modal to close

		// STEP: send message to the updated agent
		await page.getAgentCards().nth(0).click();
		await chatPage.getChatInput().fill('Hello');
		await chatPage.getSendButton().click();
		await expect(chatPage.getChatMessages().last()).toContainText('こんにちは');

		// STEP: delete the agent
		await chatPage.sidebar.getPersonalAgentButton().click();
		await page.getMenuAt(0).click();
		await page.getVisiblePopoverMenuItem('Delete').click();
		await n8n.page.getByRole('dialog').getByText('Delete', { exact: true }).click(); // confirmation dialog
		await expect(page.getAgentCards()).toHaveCount(0);
	});
});
