import { expect, test, chatHubTestConfig } from './fixtures';
import { INSTANCE_MEMBER_CREDENTIALS } from '../../../config/test-users';
import { n8nPage } from '../../../pages/n8nPage';

test.use(chatHubTestConfig);

test.describe(
	'Workflow agent @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Chat' }],
	},
	() => {
		test('manage workflow agents @auth:admin', async ({ n8n, agentWorkflow }) => {
			// STEP: Navigate to workflow agents page and verify agent is listed
			await n8n.navigate.toChatHubWorkflowAgents();
			await expect(n8n.chatHubWorkflowAgents.getAgentCards()).toHaveCount(1);
			await expect(n8n.chatHubWorkflowAgents.getAgentCards().nth(0)).toContainText(
				agentWorkflow.name,
			);

			// STEP: Click agent card to start conversation
			await n8n.chatHubWorkflowAgents.getAgentCards().nth(0).click();
			await n8n.chatHubChat.dismissWelcomeScreen();
			await expect(n8n.chatHubChat.getModelSelectorButton()).toContainText(agentWorkflow.name);

			await n8n.chatHubChat.getChatInput().fill('Hello');
			await n8n.chatHubChat.getSendButton().click();
			await expect(n8n.chatHubChat.getChatMessages().last()).toContainText(/Bonjour/i);

			// STEP: Open workflow in new tab and update system prompt
			const tab1Page = await n8n.chatHubChat.clickOpenWorkflowButton();
			const tab1 = new n8nPage(tab1Page);

			await tab1.canvas.openNode('AI Agent');
			await tab1.ndv.fillParameterInput('System Message', 'Reply in Finnish');
			await tab1.ndv.close();
			await tab1.canvas.publishWorkflow();
			await tab1Page.close();

			// STEP: Select the workflow agent for new conversation
			await n8n.navigate.toChatHub();
			await n8n.chatHubChat.getModelSelectorButton().click();
			await n8n.page.waitForTimeout(500);
			await n8n.chatHubChat.getVisiblePopoverMenuItem('Workflow agents').hover({ force: true });
			await n8n.chatHubChat.getVisiblePopoverMenuItem(agentWorkflow.name, { exact: true }).click();

			// STEP: Send message again
			await n8n.chatHubChat.getChatInput().fill('Hello');
			await n8n.chatHubChat.getSendButton().click();
			await expect(n8n.chatHubChat.getChatMessages().last()).toContainText(/Hei|Moi/i);

			// STEP: Open workflow in new tab and disable ChatHub
			const tab2Page = await n8n.chatHubChat.clickOpenWorkflowButton();
			const tab2 = new n8nPage(tab2Page);

			await tab2.canvas.openNode('When chat message received');
			await tab2.ndv.getParameterSwitch('availableInChat').click();
			await tab2.ndv.close();
			await tab2.canvas.publishWorkflow();
			await tab2Page.close();
			await n8n.navigate.toChatHubWorkflowAgents();
			await expect(n8n.chatHubWorkflowAgents.getEmptyText()).toBeVisible();
		});

		test('sharing workflow agent with project chat user', async ({
			n8n,
			anthropicCredential,
			agentWorkflow,
			project,
		}) => {
			const memberN8n = await n8n.start.withUser(INSTANCE_MEMBER_CREDENTIALS[0]);
			const memberEmail = INSTANCE_MEMBER_CREDENTIALS[0].email;

			// Transfer workflow and credential to it
			await n8n.api.credentials.transferCredential(anthropicCredential.id, project.id);
			await n8n.api.workflows.transfer(agentWorkflow.id, project.id);

			// Verify that the agent is visible to owner
			await n8n.navigate.toChatHubWorkflowAgents();
			await expect(n8n.chatHubWorkflowAgents.getAgentCards()).toContainText([agentWorkflow.name]);

			// Verify that the agent is not visible to member before sharing
			await memberN8n.navigate.toChatHubWorkflowAgents();
			await expect(memberN8n.chatHubWorkflowAgents.getEmptyText()).toBeVisible();

			// Add member user to the project with project chat user role
			await n8n.navigate.toProjectSettings(project.id);
			await n8n.projectSettings.getMembersSearchInput().click();
			await n8n.projectSettings.getVisiblePopoverOption(memberEmail).click();
			await expect(n8n.projectSettings.getMembersTable()).toContainText(memberEmail);
			await n8n.projectSettings.getRoleDropdownFor(memberEmail).click();
			await n8n.projectSettings.getVisiblePopoverOption('Project Chat User').click();
			await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();

			// Verify that the agent is visible and usable to member after sharing
			await memberN8n.page.reload();
			await expect(memberN8n.chatHubWorkflowAgents.getAgentCards()).toContainText([
				agentWorkflow.name,
			]);
			await memberN8n.chatHubWorkflowAgents.getAgentCards().nth(0).click();

			await memberN8n.chatHubChat.dismissWelcomeScreen();
			await memberN8n.chatHubChat.getChatInput().fill('Hello');
			await memberN8n.chatHubChat.getSendButton().click();
			await expect(memberN8n.chatHubChat.getChatMessages().last()).toContainText(/Bonjour/i);
		});
	},
);
