import { chatHubTestConfig, expect, test } from './fixtures';
import { INSTANCE_OWNER_CREDENTIALS } from '../../../config/test-users';
import { ChatHubChatPage } from '../../../pages/ChatHubChatPage';

test.use(chatHubTestConfig);

test.describe('Chat user role @capability:proxy', {
	annotation: [
		{ type: 'owner', description: 'Chat' },
	],
}, () => {
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

		const page = new ChatHubChatPage(n8n.page);

		// Verify global credential is available and pre-selected
		await expect(page.getModelSelectorButton()).toContainText(/claude/i); // pre-selected
		await expect(page.getSelectedCredentialName()).toHaveText('Global Anthropic API key');

		await page.getModelSelectorButton().click();
		await page.getVisiblePopoverMenuItem('Anthropic').click();
		await page.getVisiblePopoverMenuItem('Configure credentials', { exact: true }).click();

		// Verify other credentials are not available and cannot be created
		await page.credModal.getCredentialSelector().click();
		await expect(page.credModal.getCreateButton()).toBeDisabled();
		await expect(page.credModal.getVisiblePopoverOption()).toHaveCount(1);
		await expect(page.credModal.getVisiblePopoverOption().nth(0)).toContainText(
			'Global Anthropic API key',
		);
		await page.credModal.getCloseButton().click();

		// Send chat message
		await page.getChatInput().fill('Hi');
		await page.getSendButton().click();
		await expect(page.getChatMessages().nth(0)).toHaveText('Hi');
		await expect(page.getChatMessages().nth(1)).toContainText('Hi there!');
		await expect(page.getChatMessages()).toHaveCount(2);

		await ownerN8n.api.credentials.deleteCredential(cred.id);
	});
});
