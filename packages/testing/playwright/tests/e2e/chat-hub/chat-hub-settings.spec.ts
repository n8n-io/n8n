import { chatHubTestConfig, expect, test } from './fixtures';
import { INSTANCE_MEMBER_CREDENTIALS } from '../../../config/test-users';

test.use(chatHubTestConfig);

test.describe(
	'Settings @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Chat' }],
	},
	() => {
		test('set global credentials for a provider', async ({ n8n, anthropicCredential }) => {
			await n8n.navigate.toChatHubSettings();

			// Open Anthropic settings
			await n8n.chatHubSettings.getProviderActionToggle('Anthropic').click();
			await n8n.chatHubSettings.getVisiblePopoverMenuItem('Edit provider').click();

			// Configure default credential
			await n8n.chatHubSettings.providerModal.getCredentialPicker().click();
			await n8n.chatHubSettings.providerModal
				.getVisiblePopoverOption(anthropicCredential.name)
				.click();

			// Open credential modal and make it globally shared
			await n8n.chatHubSettings.providerModal.getEditCredentialButton().click();
			await n8n.chatHubSettings.credentialModal.changeTab('Sharing');
			await n8n.chatHubSettings.credentialModal.getUsersSelect().click();
			await n8n.chatHubSettings.credentialModal
				.getVisiblePopoverOption('All users and projects')
				.click();
			await n8n.chatHubSettings.credentialModal.save();
			await n8n.chatHubSettings.credentialModal.close();

			// Save settings
			await n8n.chatHubSettings.providerModal.getConfirmButton().click();
			await expect(n8n.notifications.getSuccessNotifications()).toHaveCount(1);

			const memberN8n = await n8n.start.withUser(INSTANCE_MEMBER_CREDENTIALS[0]);

			await memberN8n.navigate.toChatHub();
			await memberN8n.chatHubChat.dismissWelcomeScreen();

			await expect(memberN8n.chatHubChat.getSelectedCredentialName()).toHaveText(
				anthropicCredential.name,
			);

			await memberN8n.chatHubChat.getChatInput().fill('Hello');
			await memberN8n.chatHubChat.getSendButton().click();

			await expect(memberN8n.chatHubChat.getChatMessages().nth(0)).toContainText('Hello');
			await expect(memberN8n.chatHubChat.getChatMessages().nth(1)).toContainText(
				'Hello! How can I help you today?',
			);
			await memberN8n.page.close();
		});

		test('restrict available LLM providers and models', async ({
			n8n,
			anthropicCredential,
			anthropicApiKey,
		}) => {
			await n8n.navigate.toChatHubSettings();

			// Open Anthropic settings
			await n8n.chatHubSettings.getProviderActionToggle('Anthropic').click();
			await n8n.chatHubSettings.getVisiblePopoverMenuItem('Edit provider').click();

			// Anthropic: configure default credential
			await n8n.chatHubSettings.providerModal.getCredentialPicker().click();
			await n8n.chatHubSettings.providerModal
				.getVisiblePopoverOption(anthropicCredential.name)
				.click();

			// Anthropic: enable limit models toggle
			await n8n.chatHubSettings.providerModal.getLimitModelsToggle().click();

			// Anthropic: select only Claude Opus 4.5
			await n8n.chatHubSettings.providerModal.getModelSelector().click();
			await n8n.chatHubSettings.providerModal.getVisiblePopoverOption('Claude Opus 4.5').click();

			// Anthropic: save settings
			await n8n.chatHubSettings.providerModal.getConfirmButton().click();
			await expect(n8n.chatHubSettings.providerModal.getRoot()).toBeHidden();

			// Open OpenAI settings
			await n8n.chatHubSettings.getProviderActionToggle('OpenAI').click();
			await n8n.chatHubSettings.getVisiblePopoverMenuItem('Edit provider').click();

			// OpenAI: disable provider and save
			await expect(n8n.chatHubSettings.providerModal.getEnabledToggle()).toBeChecked();
			await n8n.chatHubSettings.providerModal.getEnabledToggle().click();
			await n8n.chatHubSettings.providerModal.getConfirmButton().click();
			await expect(n8n.chatHubSettings.providerModal.getRoot()).toBeHidden();

			await n8n.page.close();

			// Log in as member and verify only selected model is available
			const memberN8n = await n8n.start.withUser(INSTANCE_MEMBER_CREDENTIALS[0]);

			const cred = await memberN8n.api.credentials.createCredential({
				name: 'Member API key',
				type: 'anthropicApi',
				data: {
					apiKey: anthropicApiKey,
				},
			});

			await memberN8n.navigate.toChatHub();
			await memberN8n.chatHubChat.dismissWelcomeScreen();

			await memberN8n.chatHubChat.getModelSelectorButton().click();
			await expect(memberN8n.chatHubChat.getVisiblePopoverMenuItem('Anthropic')).toBeVisible();
			await expect(memberN8n.chatHubChat.getVisiblePopoverMenuItem('OpenAI')).toBeHidden();
			await memberN8n.chatHubChat.getVisiblePopoverMenuItem('Anthropic').hover({ force: true });

			const anthropicModels = memberN8n.chatHubChat.getVisiblePopoverMenuItem(/^Claude/);
			await expect(anthropicModels).toHaveText(['Claude Opus 4.5']);

			await memberN8n.api.credentials.deleteCredential(cred.id);
		});
	},
);
