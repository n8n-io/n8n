import { chatHubTestConfig, expect, test } from './fixtures';
import { INSTANCE_OWNER_CREDENTIALS } from '../../../config/test-users';

test.use(chatHubTestConfig);

test.describe(
	'Chat user role @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Chat' }],
	},
	() => {
		test('use chat as chat user @auth:chat', async ({ n8n, anthropicApiKey }) => {
			const ownerN8n = await n8n.start.withUser(INSTANCE_OWNER_CREDENTIALS);

			// Create global credential as owner
			const cred = await ownerN8n.api.credentials.createCredential({
				name: 'Global Anthropic API key',
				type: 'anthropicApi',
				isGlobal: true,
				data: {
					apiKey: anthropicApiKey,
				},
			});

			await n8n.goHome();
			await n8n.page.waitForURL('/home/chat'); // home is chat UI for chat users

			// Verify global credential is available and pre-selected
			await expect(n8n.chatHubChat.getModelSelectorButton()).toContainText(/claude/i); // pre-selected
			await expect(n8n.chatHubChat.getSelectedCredentialName()).toHaveText(
				'Global Anthropic API key',
			);

			await n8n.chatHubChat.getModelSelectorButton().click();
			await n8n.chatHubChat.getVisiblePopoverMenuItem('Anthropic').click();
			await n8n.chatHubChat
				.getVisiblePopoverMenuItem('Configure credentials', { exact: true })
				.click();

			// Verify other credentials are not available and cannot be created
			await n8n.chatHubChat.credModal.getCredentialSelector().click();
			await expect(n8n.chatHubChat.credModal.getCreateButton()).toBeDisabled();
			await expect(n8n.chatHubChat.credModal.getVisiblePopoverOption()).toHaveCount(1);
			await expect(n8n.chatHubChat.credModal.getVisiblePopoverOption().nth(0)).toContainText(
				'Global Anthropic API key',
			);
			await n8n.chatHubChat.credModal.getCloseButton().click();

			// Send chat message
			await n8n.chatHubChat.getChatInput().fill('Hi');
			await n8n.chatHubChat.getSendButton().click();
			await expect(n8n.chatHubChat.getChatMessages().nth(0)).toHaveText('Hi');
			await expect(n8n.chatHubChat.getChatMessages().nth(1)).toContainText('Hi there!');
			await expect(n8n.chatHubChat.getChatMessages()).toHaveCount(2);

			await ownerN8n.api.credentials.deleteCredential(cred.id);
		});
	},
);
