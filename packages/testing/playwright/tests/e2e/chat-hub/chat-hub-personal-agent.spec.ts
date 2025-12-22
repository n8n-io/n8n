import { expect, test } from '../../../fixtures/base';
import { ChatHubChatPage } from '../../../pages/ChatHubChatPage';
import { ChatHubPersonalAgentsPage } from '../../../pages/ChatHubPersonalAgentsPage';

const mockAnthropicApiKey = 'mock-anthropic-api-key';
const anthropicApiKey =
	process.env.ANTHROPIC_API_KEY /* for recording requests while development */ ??
	mockAnthropicApiKey;

test.use({
	timezoneId: 'America/New_York',
	addContainerCapability: {
		proxyServerEnabled: true,
	},
});

test.describe('Personal agent @capability:proxy', () => {
	test.beforeEach(async ({ n8n, proxyServer }) => {
		await proxyServer.clearAllExpectations();
		await proxyServer.loadExpectations('chat-hub', { strictBodyMatching: true });

		await n8n.api.credentials.createCredential({
			name: 'Anthropic Test',
			type: 'anthropicApi',
			data: {
				apiKey: anthropicApiKey,
			},
		});
	});

	test.afterEach(async ({ proxyServer }) => {
		if (!process.env.CI && anthropicApiKey !== mockAnthropicApiKey) {
			await proxyServer.recordExpectations('chat-hub', { dedupe: true });
		}
	});

	test('create personal agent and start conversation @auth:owner', async ({ n8n }) => {
		const page = new ChatHubChatPage(n8n.page);

		await page.openNewChat();

		await page.getModelSelectorButton().click();
		await n8n.page.waitForTimeout(500); // to reliably hover intended menu item
		await n8n.page.getByRole('menuitem').getByText('Personal agents').hover({ force: true });
		await n8n.page.locator('.el-sub-menu.is-opened').getByText('New Agent').click();

		await page.personalAgentModal.getNameField().fill('e2e agent');
		await page.personalAgentModal.getDescriptionField().fill('just for testing');
		await page.personalAgentModal.getSystemPromptField().fill('reply in Chinese');

		await page.personalAgentModal.getModelSelectorButton().click();
		await n8n.page.waitForTimeout(500); // to reliably hover intended menu item
		await n8n.page
			.getByRole('menuitem')
			.getByText('Anthropic', { exact: true })
			.hover({ force: true });
		await n8n.page.locator('.el-sub-menu.is-opened').getByText('Claude Opus 4.5').click();

		await page.personalAgentModal.getSaveButton().click();
		await expect(page.personalAgentModal.getRoot()).not.toBeInViewport(); // wait for modal to close

		await expect(page.getModelSelectorButton()).toContainText('e2e agent');

		await page.getChatInput().fill('Hello');
		await page.getSendButton().click();

		await expect(page.getChatMessages().last()).toContainText('你好');
	});

	test('manage personal agents @auth:admin', async ({ n8n }) => {
		const agentsPage = new ChatHubPersonalAgentsPage(n8n.page);
		const chatPage = new ChatHubChatPage(n8n.page);

		await agentsPage.open();
		await agentsPage.getNewAgentButton().click();

		// STEP: create an agent
		await agentsPage.personalAgentModal.getNameField().fill('e2e agent');
		await agentsPage.personalAgentModal.getDescriptionField().fill('just for testing');
		await agentsPage.personalAgentModal.getSystemPromptField().fill('reply in Chinese');

		await agentsPage.personalAgentModal.getModelSelectorButton().click();
		await n8n.page.waitForTimeout(500); // to reliably hover intended menu item
		await n8n.page
			.getByRole('menuitem')
			.getByText('Anthropic', { exact: true })
			.hover({ force: true });
		await n8n.page.locator('.el-sub-menu.is-opened').getByText('Claude Opus 4.5').click();

		await agentsPage.personalAgentModal.getSaveButton().click();
		await expect(agentsPage.personalAgentModal.getRoot()).not.toBeInViewport(); // wait for modal to close
		await expect(agentsPage.getAgentCards()).toHaveCount(1);
		await expect(agentsPage.getAgentCards().nth(0)).toContainText('e2e agent');

		// STEP: send message to the created agent
		await agentsPage.getAgentCards().nth(0).click();
		await chatPage.getChatInput().fill('Hello');
		await chatPage.getSendButton().click();
		await expect(chatPage.getChatMessages().last()).toContainText('你好');

		// STEP: update instructions for the agent
		await chatPage.sidebar.getPersonalAgentButton().click();
		await agentsPage.getEditButtonAt(0).click();
		await agentsPage.personalAgentModal.getSystemPromptField().fill('reply in Japanese');
		await agentsPage.personalAgentModal.getSaveButton().click();
		await expect(agentsPage.personalAgentModal.getRoot()).not.toBeInViewport(); // wait for modal to close

		// STEP: send message to the updated agent
		await agentsPage.getAgentCards().nth(0).click();
		await chatPage.getChatInput().fill('Hello');
		await chatPage.getSendButton().click();
		await expect(chatPage.getChatMessages().last()).toContainText('こんにちは');

		// STEP: delete the agent
		await chatPage.sidebar.getPersonalAgentButton().click();
		await agentsPage.getMenuAt(0).click();
		await n8n.page.getByRole('menuitem').getByText('Delete').click();
		await n8n.page.getByRole('dialog').getByText('Delete', { exact: true }).click(); // confirmation dialog
		await expect(agentsPage.getAgentCards()).toHaveCount(0);
	});
});
