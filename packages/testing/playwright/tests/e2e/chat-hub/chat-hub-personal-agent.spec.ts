import { test, expect, chatHubTestConfig } from './fixtures';

test.use(chatHubTestConfig);

test.describe(
	'Personal agent @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Chat' }],
	},
	() => {
		test('create personal agent and start conversation @auth:owner', async ({
			n8n,
			anthropicCredential: _,
		}) => {
			await n8n.navigate.toChatHub();
			await n8n.chatHubChat.dismissWelcomeScreen();

			await n8n.chatHubChat.getModelSelectorButton().click();
			await n8n.page.waitForTimeout(500); // to reliably hover intended menu item
			await n8n.chatHubChat.getVisiblePopoverMenuItem('Personal agents').hover({ force: true });
			await n8n.chatHubChat.getVisiblePopoverMenuItem('New Agent', { exact: true }).click();

			await n8n.chatHubChat.personalAgentModal.getNameField().fill('e2e agent');
			await n8n.chatHubChat.personalAgentModal.getDescriptionField().fill('just for testing');
			await n8n.chatHubChat.personalAgentModal.getSystemPromptField().fill('reply in Chinese');

			await n8n.chatHubChat.personalAgentModal.getModelSelectorButton().click();
			await n8n.page.waitForTimeout(500); // to reliably hover intended menu item
			await n8n.chatHubChat.getVisiblePopoverMenuItem('Anthropic').hover({ force: true });
			await n8n.chatHubChat.getVisiblePopoverMenuItem('Claude Opus 4.5', { exact: true }).click();

			await n8n.chatHubChat.personalAgentModal.getSaveButton().click();
			await expect(n8n.chatHubChat.personalAgentModal.getRoot()).not.toBeInViewport(); // wait for modal to close

			await expect(n8n.chatHubChat.getModelSelectorButton()).toContainText('e2e agent');

			await n8n.chatHubChat.getChatInput().fill('Hello');
			await n8n.chatHubChat.getSendButton().click();

			await expect(n8n.chatHubChat.getChatMessages().last()).toContainText('你好');
		});

		test('manage personal agents @auth:admin', async ({ n8n, anthropicCredential: _ }) => {
			await n8n.navigate.toChatHubPersonalAgents();
			await n8n.chatHubPersonalAgents.getNewAgentButton().click();

			// STEP: create an agent
			await n8n.chatHubPersonalAgents.editModal.getNameField().fill('e2e agent');
			await n8n.chatHubPersonalAgents.editModal.getDescriptionField().fill('just for testing');
			await n8n.chatHubPersonalAgents.editModal.getSystemPromptField().fill('reply in Chinese');

			await n8n.chatHubPersonalAgents.editModal.getModelSelectorButton().click();
			await n8n.page.waitForTimeout(500); // to reliably hover intended menu item
			await n8n.chatHubPersonalAgents.editModal
				.getVisiblePopoverMenuItem('Anthropic')
				.hover({ force: true });
			await n8n.chatHubPersonalAgents.editModal
				.getVisiblePopoverMenuItem('Claude Opus 4.5', { exact: true })
				.click();

			await n8n.chatHubPersonalAgents.editModal.getSaveButton().click();
			await expect(n8n.chatHubPersonalAgents.editModal.getRoot()).not.toBeInViewport(); // wait for modal to close
			await expect(n8n.chatHubPersonalAgents.getAgentCards()).toHaveCount(1);
			await expect(n8n.chatHubPersonalAgents.getAgentCards().nth(0)).toContainText('e2e agent');

			// STEP: send message to the created agent
			await n8n.chatHubPersonalAgents.getAgentCards().nth(0).click();
			await n8n.chatHubChat.dismissWelcomeScreen();
			await n8n.chatHubChat.getChatInput().fill('Hello');
			await n8n.chatHubChat.getSendButton().click();
			await expect(n8n.chatHubChat.getChatMessages().last()).toContainText('你好');

			// STEP: update instructions for the agent
			await n8n.chatHubChat.sidebar.getPersonalAgentButton().click();
			await n8n.chatHubPersonalAgents.getEditButtonAt(0).click();
			await n8n.chatHubPersonalAgents.editModal.getSystemPromptField().fill('reply in Japanese');
			await n8n.chatHubPersonalAgents.editModal.getSaveButton().click();
			await expect(n8n.chatHubPersonalAgents.editModal.getRoot()).not.toBeInViewport(); // wait for modal to close

			// STEP: send message to the updated agent
			await n8n.chatHubPersonalAgents.getAgentCards().nth(0).click();
			await n8n.chatHubChat.getChatInput().fill('Hello');
			await n8n.chatHubChat.getSendButton().click();
			await expect(n8n.chatHubChat.getChatMessages().last()).toContainText('こんにちは');

			// STEP: delete the agent
			await n8n.chatHubChat.sidebar.getPersonalAgentButton().click();
			await n8n.chatHubPersonalAgents.getMenuAt(0).click();
			await n8n.chatHubPersonalAgents.getVisiblePopoverMenuItem('Delete').click();
			await n8n.page.getByRole('dialog').getByText('Delete', { exact: true }).click(); // confirmation dialog
			await expect(n8n.chatHubPersonalAgents.getAgentCards()).toHaveCount(0);
		});
	},
);
