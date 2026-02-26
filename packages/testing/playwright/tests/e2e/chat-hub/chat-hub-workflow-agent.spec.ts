import { expect, test, chatHubTestConfig } from './fixtures';
import { INSTANCE_MEMBER_CREDENTIALS } from '../../../config/test-users';
import { CanvasPage } from '../../../pages/CanvasPage';
import { ChatHubChatPage } from '../../../pages/ChatHubChatPage';
import { ChatHubWorkflowAgentsPage } from '../../../pages/ChatHubWorkflowAgentsPage';
import { NodeDetailsViewPage } from '../../../pages/NodeDetailsViewPage';

test.use(chatHubTestConfig);

test.describe('Workflow agent @capability:proxy', {
	annotation: [
		{ type: 'owner', description: 'Chat' },
	],
}, () => {
	test('manage workflow agents @auth:admin', async ({ n8n, agentWorkflow }) => {
		const agentsPage = new ChatHubWorkflowAgentsPage(n8n.page);
		const chatPage = new ChatHubChatPage(n8n.page);

		// STEP: Navigate to workflow agents page and verify agent is listed
		await n8n.navigate.toChatHubWorkflowAgents();
		await expect(agentsPage.getAgentCards()).toHaveCount(1);
		await expect(agentsPage.getAgentCards().nth(0)).toContainText(agentWorkflow.name);

		// STEP: Click agent card to start conversation
		await agentsPage.getAgentCards().nth(0).click();
		await chatPage.dismissWelcomeScreen();
		await expect(chatPage.getModelSelectorButton()).toContainText(agentWorkflow.name);

		await chatPage.getChatInput().fill('Hello');
		await chatPage.getSendButton().click();
		await expect(chatPage.getChatMessages().last()).toContainText(/Bonjour/i);

		// STEP: Open workflow in new tab and update system prompt
		const tab1 = await chatPage.clickOpenWorkflowButton();
		const canvas = new CanvasPage(tab1);
		const ndv = new NodeDetailsViewPage(tab1);

		await canvas.openNode('AI Agent');
		await ndv.fillParameterInput('System Message', 'Reply in Finnish');
		await ndv.close();
		await canvas.publishWorkflow();
		await tab1.close();

		// STEP: Select the workflow agent for new conversation
		await n8n.navigate.toChatHub();
		await chatPage.getModelSelectorButton().click();
		await n8n.page.waitForTimeout(500);
		await chatPage.getVisiblePopoverMenuItem('Workflow agents').hover({ force: true });
		await chatPage.getVisiblePopoverMenuItem(agentWorkflow.name, { exact: true }).click();

		// STEP: Send message again
		await chatPage.getChatInput().fill('Hello');
		await chatPage.getSendButton().click();
		await expect(chatPage.getChatMessages().last()).toContainText(/Hei|Moi/i);

		// STEP: Open workflow in new tab and disable ChatHub
		const tab2 = await chatPage.clickOpenWorkflowButton();
		const canvas2 = new CanvasPage(tab2);
		const ndv2 = new NodeDetailsViewPage(tab2);

		await canvas2.openNode('When chat message received');
		await ndv2.getParameterSwitch('availableInChat').click();
		await ndv2.close();
		await canvas2.publishWorkflow();
		await tab2.close();
		await n8n.navigate.toChatHubWorkflowAgents();
		await expect(agentsPage.getEmptyText()).toBeVisible();
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
		const ownerWorkflowAgentsPage = new ChatHubWorkflowAgentsPage(n8n.page);
		await n8n.navigate.toChatHubWorkflowAgents();
		await expect(ownerWorkflowAgentsPage.getAgentCards()).toContainText([agentWorkflow.name]);

		// Verify that the agent is not visible to member before sharing
		const memberWorkflowAgentsPage = new ChatHubWorkflowAgentsPage(memberN8n.page);
		await memberN8n.navigate.toChatHubWorkflowAgents();
		await expect(memberWorkflowAgentsPage.getEmptyText()).toBeVisible();

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
		await expect(memberWorkflowAgentsPage.getAgentCards()).toContainText([agentWorkflow.name]);
		await memberWorkflowAgentsPage.getAgentCards().nth(0).click();

		const memberChatPage = new ChatHubChatPage(memberN8n.page);
		await memberChatPage.dismissWelcomeScreen();
		await memberChatPage.getChatInput().fill('Hello');
		await memberChatPage.getSendButton().click();
		await expect(memberChatPage.getChatMessages().last()).toContainText(/Bonjour/i);
	});
});
