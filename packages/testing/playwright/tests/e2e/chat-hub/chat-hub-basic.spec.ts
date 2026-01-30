import { test, expect, chatHubTestConfig } from './fixtures';
import { ChatHubChatPage } from '../../../pages/ChatHubChatPage';
import { CredentialModal } from '../../../pages/components/CredentialModal';

test.use(chatHubTestConfig);

test.describe('Basic conversation @capability:proxy', () => {
	test('new chat with pre-configured credentials', async ({ n8n, anthropicCredential: _ }) => {
		const page = new ChatHubChatPage(n8n.page);

		await n8n.navigate.toChatHub();
		await page.dismissWelcomeScreen();

		await expect(page.getGreetingMessage()).toContainText('Start a chat with');
		await expect(page.getModelSelectorButton()).toContainText(/claude/i); // pre-selected

		await page.getChatInput().fill('Hello');
		await page.getSendButton().click();
		await expect(page.getChatMessages().nth(0)).toContainText('Hello');
		await expect(page.getChatMessages().nth(1)).toContainText('Hello! How can I help you today?');
		await expect(page.sidebar.getConversations().first()).toHaveAccessibleName(/greeting/i); // verify auto-generated title
	});

	// Test with a different user to avoid race condition on credentials
	test('new chat without pre-configured credentials @auth:member', async ({
		n8n,
		anthropicApiKey,
	}) => {
		const page = new ChatHubChatPage(n8n.page);
		const credModal = new CredentialModal(n8n.page.getByTestId('editCredential-modal'));

		await n8n.navigate.toChatHub();
		await page.dismissWelcomeScreen();

		await expect(page.getGreetingMessage()).toContainText('Select a model to start chatting');

		await page.getModelSelectorButton().click();
		await n8n.page.waitForTimeout(500); // to reliably hover intended menu item
		await page.getVisiblePopoverMenuItem('Anthropic').hover({ force: true });
		await page.getVisiblePopoverMenuItem('Configure credentials', { exact: true }).click();

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

	test('conversation flow', async ({ n8n, anthropicCredential: _ }) => {
		const page = new ChatHubChatPage(n8n.page);

		await n8n.navigate.toChatHub();
		await page.dismissWelcomeScreen();
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
		await page.clickRegenerateButtonAt(1);
		await expect(page.getChatMessages().nth(1)).toContainText('Hello!');
		await expect(page.getChatMessages()).toHaveCount(2);

		// STEP: switch to previous alternative
		await page.clickPrevAlternativeButtonAt(1);
		await expect(page.getChatMessages().nth(1)).toContainText('Hi there!');
		await expect(page.getChatMessages()).toHaveCount(4);

		// STEP: edit 2nd prompt
		await page.clickEditButtonAt(2);
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
