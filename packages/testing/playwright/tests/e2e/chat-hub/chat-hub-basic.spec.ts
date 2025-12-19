import {
	INSTANCE_MEMBER_CREDENTIALS,
	INSTANCE_OWNER_CREDENTIALS,
} from '../../../config/test-users';
import { test, expect } from '../../../fixtures/base';
import { ChatHubChatPage } from '../../../pages/ChatHubChatPage';
import { CredentialModal } from '../../../pages/components/CredentialModal';

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

test.describe('Basic conversation @capability:proxy', () => {
	let anthropicCredentialId: string | undefined;

	test.beforeEach(async ({ n8n, proxyServer }) => {
		await proxyServer.clearAllExpectations();
		await proxyServer.loadExpectations('chat-hub', { strictBodyMatching: true });

		const res = await n8n.api.credentials.createCredential({
			name: 'Anthropic Test',
			type: 'anthropicApi',
			data: {
				apiKey: anthropicApiKey,
			},
		});

		anthropicCredentialId = res.id;
	});

	test.afterEach(async ({ proxyServer }) => {
		if (!process.env.CI && anthropicApiKey !== mockAnthropicApiKey) {
			await proxyServer.recordExpectations('chat-hub', { dedupe: true });
		}
	});

	test('new chat with pre-configured credentials', async ({ n8n }) => {
		const page = new ChatHubChatPage(n8n.page);

		await page.openNewChat();

		await expect(page.getGreetingMessage()).toHaveText(
			`Hello, ${INSTANCE_OWNER_CREDENTIALS.firstName}!`,
		);
		await expect(page.getModelSelectorButton()).toContainText(/claude/i); // pre-selected

		await page.getChatInput().fill('Hello');
		await page.getSendButton().click();
		await expect(page.getChatMessages().nth(0)).toContainText('Hello');
		await expect(page.getChatMessages().nth(1)).toContainText('Hello! How can I help you today?');
		await expect(page.sidebar.getConversations().first()).toHaveAccessibleName(/greeting/i); // verify auto-generated title
	});

	// Test with a different user to avoid race condition on credentials
	test('new chat without pre-configured credentials @auth:member', async ({ n8n }) => {
		const page = new ChatHubChatPage(n8n.page);
		const credModal = new CredentialModal(n8n.page.getByTestId('editCredential-modal'));

		await n8n.api.credentials.deleteCredential(anthropicCredentialId!);

		await page.openNewChat();

		await expect(page.getGreetingMessage()).toHaveText(
			`Hello, ${INSTANCE_MEMBER_CREDENTIALS[0].firstName}!`,
		);

		await page.getModelSelectorButton().click();
		await n8n.page.waitForTimeout(500); // to reliably hover intended menu item
		await n8n.page.getByText('Anthropic').hover({ force: true });
		await n8n.page.locator('.el-sub-menu.is-opened').getByText('Configure credentials').click();

		await credModal.fillField('apiKey', anthropicApiKey);
		await credModal.save();
		await credModal.close();

		await expect(page.getModelSelectorButton()).toContainText(/claude/i); // auto-select a model

		await page.getChatInput().fill('Hello from e2e');
		await page.getSendButton().click();
		await expect(page.getChatMessages().nth(0)).toContainText('Hello from e2e');
		await expect(page.getChatMessages().nth(1)).toContainText('Hello! Welcome! 👋');
		await expect(page.sidebar.getConversations().first()).toHaveAccessibleName(/greeting/i); // verify auto-generated title
	});

	test('conversation flow', async ({ n8n }) => {
		const page = new ChatHubChatPage(n8n.page);

		await page.openNewChat();
		await expect(page.getModelSelectorButton()).toContainText(/claude/i); // auto-select a model

		// STEP: send first prompt
		await page.getChatInput().fill('Hi');
		await page.getSendButton().click();
		await expect(page.getChatMessages().nth(0)).toHaveText('Hi');
		await expect(page.getChatMessages().nth(1)).toContainText('Hi there!');
		await expect(page.getChatMessages()).toHaveCount(2);

		// STEP: send 2nd prompt
		await page.getChatInput().fill('How are you?');
		await page.getSendButton().click();
		await expect(page.getChatMessages().nth(0)).toContainText('Hi');
		await expect(page.getChatMessages().nth(1)).toContainText('Hi there!');
		await expect(page.getChatMessages().nth(2)).toContainText('How are you?');
		await expect(page.getChatMessages().nth(3)).toContainText("I'm doing well");
		await expect(page.getChatMessages()).toHaveCount(4);

		// STEP: regenerate response to first prompt
		await page.getRegenerateButtonAt(1).click();
		await expect(page.getChatMessages().nth(1)).toContainText('Hello!');
		await expect(page.getChatMessages()).toHaveCount(2);

		// STEP: switch to previous alternative
		await page.getPrevAlternativeButtonAt(1).click();
		await expect(page.getChatMessages().nth(1)).toContainText('Hi there!');
		await expect(page.getChatMessages()).toHaveCount(4);

		// STEP: edit 2nd prompt
		await page.getEditButtonAt(2).click();
		await page.getEditorAt(2).fill('Hola');
		await page.getSendButtonAt(2).click();
		await expect(page.getChatMessages().nth(3)).toContainText('¡Hola!');
		await expect(page.getChatMessages()).toHaveCount(4);

		// STEP: reload page and verify persistence
		await n8n.page.reload();
		await expect(page.getChatMessages()).toHaveCount(4);
		await expect(page.getChatMessages().nth(0)).toContainText('Hi');
		await expect(page.getChatMessages().nth(1)).toContainText('Hi there!');
		await expect(page.getChatMessages().nth(2)).toContainText('Hola');
		await expect(page.getChatMessages().nth(3)).toContainText('¡Hola!');
	});
});
