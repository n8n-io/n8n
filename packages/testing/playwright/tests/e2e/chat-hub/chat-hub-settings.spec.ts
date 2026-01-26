import { chatHubTestConfig, expect, test } from './fixtures';
import { INSTANCE_MEMBER_CREDENTIALS } from '../../../config/test-users';
import { ChatHubChatPage } from '../../../pages/ChatHubChatPage';
import { ChatHubSettingsPage } from '../../../pages/ChatHubSettingsPage';

test.use(chatHubTestConfig);

test.describe('Settings @capability:proxy', () => {
	test('set global credentials for a provider', async ({ n8n, anthropicCredential }) => {
		const page = new ChatHubSettingsPage(n8n.page);

		await n8n.navigate.toChatHubSettings();

		// Open Anthropic settings
		await page.getProviderActionToggle('Anthropic').click();
		await page.getVisiblePopoverMenuItem('Edit provider').click();

		// Configure default credential
		await page.providerModal.getCredentialPicker().click();
		await page.providerModal.getVisiblePopoverOption(anthropicCredential.name).click();

		// Open credential modal and make it globally shared
		await page.providerModal.getEditCredentialButton().click();
		await page.credentialModal.changeTab('Sharing');
		await page.credentialModal.getUsersSelect().click();
		await page.credentialModal.getVisiblePopoverOption('All users and projects').click();
		await page.credentialModal.save();
		await page.credentialModal.close();

		// Save settings
		await page.providerModal.getConfirmButton().click();
		await expect(n8n.notifications.getSuccessNotifications()).toHaveCount(1);

		const memberN8n = await n8n.start.withUser(INSTANCE_MEMBER_CREDENTIALS[0]);
		const chatPage = new ChatHubChatPage(memberN8n.page);

		await memberN8n.navigate.toChatHub();

		await expect(chatPage.getSelectedCredentialName()).toHaveText(anthropicCredential.name);

		await chatPage.getChatInput().fill('Hello');
		await chatPage.getSendButton().click();

		await expect(chatPage.getChatMessages().nth(0)).toContainText('Hello');
		await expect(chatPage.getChatMessages().nth(1)).toContainText(
			'Hello! How can I help you today?',
		);
		await memberN8n.page.close();
	});

	test('restrict available LLM providers and models', async ({
		n8n,
		anthropicCredential,
		anthropicApiKey,
	}) => {
		const page = new ChatHubSettingsPage(n8n.page);

		await n8n.navigate.toChatHubSettings();

		// Open Anthropic settings
		await page.getProviderActionToggle('Anthropic').click();
		await page.getVisiblePopoverMenuItem('Edit provider').click();

		// Anthropic: configure default credential
		await page.providerModal.getCredentialPicker().click();
		await page.providerModal.getVisiblePopoverOption(anthropicCredential.name).click();

		// Anthropic: enable limit models toggle
		await page.providerModal.getLimitModelsToggle().click();

		// Anthropic: select only Claude Opus 4.5
		await page.providerModal.getModelSelector().click();
		await page.providerModal.getVisiblePopoverOption('Claude Opus 4.5').click();

		// Anthropic: save settings
		await page.providerModal.getConfirmButton().click();
		await expect(page.providerModal.getRoot()).not.toBeVisible();

		// Open OpenAI settings
		await page.getProviderActionToggle('OpenAI').click();
		await page.getVisiblePopoverMenuItem('Edit provider').click();

		// OpenAI: disable provider and save
		await expect(page.providerModal.getEnabledToggle()).toBeChecked();
		await page.providerModal.getEnabledToggle().click();
		await page.providerModal.getConfirmButton().click();
		await expect(page.providerModal.getRoot()).not.toBeVisible();

		await n8n.page.close();

		// Log in as member and verify only selected model is available
		const memberN8n = await n8n.start.withUser(INSTANCE_MEMBER_CREDENTIALS[0]);
		const chatPage = new ChatHubChatPage(memberN8n.page);

		const cred = await memberN8n.api.credentials.createCredential({
			name: 'Member API key',
			type: 'anthropicApi',
			data: {
				apiKey: anthropicApiKey,
			},
		});

		await memberN8n.navigate.toChatHub();

		await chatPage.getModelSelectorButton().click();
		await expect(chatPage.getVisiblePopoverMenuItem('Anthropic')).toBeVisible();
		await expect(chatPage.getVisiblePopoverMenuItem('OpenAI')).not.toBeVisible();
		await chatPage.getVisiblePopoverMenuItem('Anthropic').hover({ force: true });

		const anthropicModels = chatPage.getVisiblePopoverMenuItem(/^Claude/);
		await expect(anthropicModels).toHaveText(['Claude Opus 4.5']);

		await memberN8n.api.credentials.deleteCredential(cred.id);
	});
});
