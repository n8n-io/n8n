import {
	aiEnabledRequirements,
	aiEnabledWithSimpleChatRequirements,
} from '../../../config/ai-assistant-fixtures';
import {
	GMAIL_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
} from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe('AI Assistant::enabled', () => {
	test.describe('Credential Help', () => {
		test('should start credential help from node credential', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(aiEnabledWithSimpleChatRequirements);
			await n8n.page.goto('/workflow/new');

			await n8n.canvas.addInitialNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
			await n8n.ndv.clickBackToCanvasButton();
			await n8n.canvas.addNode(GMAIL_NODE_NAME, { action: 'Get many messages', closeNDV: false });

			await n8n.ndv.clickCreateNewCredential();

			await expect(n8n.canvas.credentialModal.getModal()).toBeVisible();

			const assistantButton = n8n.aiAssistant.getCredentialEditAssistantButton().locator('button');
			await expect(assistantButton).toBeVisible();
			await assistantButton.click();

			await expect(n8n.aiAssistant.getChatMessagesUser()).toHaveCount(1);
			await expect(n8n.aiAssistant.getChatMessagesUser().first()).toContainText(
				'How do I set up the credentials for Gmail OAuth2 API?',
			);
			await expect(n8n.aiAssistant.getChatMessagesAssistant().first()).toContainText(
				'Hey, this is an assistant message',
			);
			await expect(assistantButton).toBeDisabled();
		});

		test('should start credential help from credential list', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(aiEnabledWithSimpleChatRequirements);

			await n8n.navigate.toCredentials();

			await n8n.workflows.addResource.credential();
			await n8n.credentials.selectCredentialType('Notion API');

			const assistantButton = n8n.aiAssistant.getCredentialEditAssistantButton().locator('button');
			await expect(assistantButton).toBeVisible();
			await assistantButton.click();

			await expect(n8n.aiAssistant.getChatMessagesUser()).toHaveCount(1);
			await expect(n8n.aiAssistant.getChatMessagesUser().first()).toContainText(
				'How do I set up the credentials for Notion API?',
			);
			await expect(n8n.aiAssistant.getChatMessagesAssistant().first()).toContainText(
				'Hey, this is an assistant message',
			);
			await expect(assistantButton).toBeDisabled();
		});

		test('should not show assistant button if click to connect', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(aiEnabledRequirements);

			await n8n.page.route('**/types/credentials.json', async (route) => {
				const response = await route.fetch();
				const credentials = (await response.json()) as Array<
					{ name?: string } & Record<string, unknown>
				>;
				const index = credentials.findIndex((c) => c.name === 'slackOAuth2Api');
				if (index >= 0) {
					credentials[index] = {
						...credentials[index],
						__overwrittenProperties: ['clientId', 'clientSecret'],
					};
				}
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(credentials),
				});
			});

			await n8n.page.goto('/workflow/new');
			await n8n.canvas.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.addNode('Slack', { action: 'Get a channel' });

			await n8n.ndv.clickCreateNewCredential();

			const authOptions = n8n.canvas.credentialModal.getAuthTypeRadioButtons();
			await authOptions.first().click();

			await expect(n8n.canvas.credentialModal.oauthConnectButton).toHaveCount(1);
			await expect(n8n.canvas.credentialModal.getCredentialInputs()).toHaveCount(2);
			await expect(n8n.aiAssistant.getCredentialEditAssistantButton()).toHaveCount(0);

			await authOptions.nth(1).click();
			await expect(n8n.canvas.credentialModal.getCredentialInputs()).toHaveCount(4);
			await expect(n8n.aiAssistant.getCredentialEditAssistantButton()).toHaveCount(1);
		});

		test('should not show assistant button when click to connect with some fields', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(aiEnabledRequirements);

			await n8n.page.route('**/types/credentials.json', async (route) => {
				const response = await route.fetch();
				const credentials = (await response.json()) as Array<
					{ name?: string } & Record<string, unknown>
				>;
				const index = credentials.findIndex((c) => c.name === 'microsoftOutlookOAuth2Api');
				if (index >= 0) {
					credentials[index] = {
						...credentials[index],
						__overwrittenProperties: [
							'authUrl',
							'accessTokenUrl',
							'clientId',
							'clientSecret',
							'graphApiBaseUrl',
						],
					};
				}
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(credentials),
				});
			});

			await n8n.page.goto('/workflow/new');
			await n8n.canvas.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.addNode('Microsoft Outlook', { action: 'Get a calendar' });

			await n8n.ndv.clickCreateNewCredential();

			await expect(n8n.canvas.credentialModal.oauthConnectButton).toHaveCount(1);
			await expect(n8n.canvas.credentialModal.getCredentialInputs()).toHaveCount(2);
			await expect(n8n.aiAssistant.getCredentialEditAssistantButton()).toHaveCount(0);
		});
	});
});
