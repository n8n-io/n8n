import {
	AGENT_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
	AI_MEMORY_REDIS_CHAT_NODE_NAME,
	AI_TOOL_CALCULATOR_NODE_NAME,
	AI_OUTPUT_PARSER_AUTO_FIXING_NODE_NAME,
	AI_TOOL_CODE_NODE_NAME,
	AI_TOOL_WIKIPEDIA_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
} from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';
import type { n8nPage } from '../../../pages/n8nPage';

// Helper functions for common operations
async function addOpenAILanguageModelWithCredentials(
	n8n: n8nPage,
	parentNode: string,
	options: { exactMatch?: boolean; closeNDV?: boolean } = { exactMatch: true, closeNDV: false },
) {
	await n8n.canvas.addSupplementalNodeToParent(
		AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
		'ai_languageModel',
		parentNode,
		options,
	);

	await n8n.credentialsComposer.createFromNdv({
		apiKey: 'abcd',
	});
	await n8n.ndv.clickBackToCanvasButton();
}

async function waitForWorkflowSuccess(n8n: n8nPage, timeout = 3000) {
	await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully', {
		timeout,
	});
}

async function executeChatAndWaitForResponse(n8n: n8nPage, message: string) {
	await n8n.canvas.logsPanel.sendManualChatMessage(message);
	await waitForWorkflowSuccess(n8n);
}

async function verifyChatMessages(n8n: n8nPage, expectedCount: number, inputMessage?: string) {
	const messages = n8n.canvas.getManualChatMessages();
	await expect(messages).toHaveCount(expectedCount);
	if (inputMessage) {
		await expect(messages.first()).toContainText(inputMessage);
	}
	await expect(messages.last()).toBeVisible();
	return messages;
}

async function verifyLogsPanelEntries(n8n: n8nPage, expectedEntries: string[]) {
	await expect(n8n.canvas.logsPanel.getLogEntries().first()).toBeVisible();
	await expect(n8n.canvas.logsPanel.getLogEntries()).toHaveCount(expectedEntries.length);
	for (let i = 0; i < expectedEntries.length; i++) {
		await expect(n8n.canvas.logsPanel.getLogEntries().nth(i)).toHaveText(expectedEntries[i]);
	}
}

async function setupBasicAgentWorkflow(n8n: n8nPage, additionalNodes: string[] = []) {
	await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

	// Add additional nodes if specified
	for (const nodeName of additionalNodes) {
		await n8n.canvas.addSupplementalNodeToParent(nodeName, 'ai_tool', AGENT_NODE_NAME, {
			closeNDV: true,
		});
	}

	// Always add OpenAI Language Model
	await addOpenAILanguageModelWithCredentials(n8n, AGENT_NODE_NAME);
}

test.use({ capability: 'proxy' });
test.describe('Langchain Integration @capability:proxy', () => {
	test.beforeEach(async ({ n8n, proxyServer }) => {
		await proxyServer.clearAllExpectations();
		await proxyServer.loadExpectations('langchain');
		await n8n.canvas.openNewWorkflow();
	});

	test.describe('Workflow Execution Behavior', () => {
		test('should not open chat modal', async ({ n8n }) => {
			await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });

			await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

			await n8n.canvas.addSupplementalNodeToParent(
				AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
				'ai_languageModel',
				AGENT_NODE_NAME,
				{ exactMatch: true, closeNDV: true },
			);

			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.getManualChatModal()).toBeHidden();
		});

		test('should remove test workflow button', async ({ n8n }) => {
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });

			await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });

			await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

			await n8n.canvas.addSupplementalNodeToParent(
				AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
				'ai_languageModel',
				AGENT_NODE_NAME,
				{ exactMatch: true, closeNDV: true },
			);

			await n8n.canvas.disableNodeFromContextMenu(SCHEDULE_TRIGGER_NODE_NAME);
			await expect(n8n.canvas.getExecuteWorkflowButton()).toBeHidden();
		});
	});

	test.describe('Node Connection and Configuration', () => {
		test('should add nodes to all Agent node input types', async ({ n8n }) => {
			const agentSubNodes = [
				AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
				AI_MEMORY_REDIS_CHAT_NODE_NAME,
				AI_TOOL_CALCULATOR_NODE_NAME,
				AI_OUTPUT_PARSER_AUTO_FIXING_NODE_NAME,
			];
			await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: false });

			await n8n.ndv.checkParameterCheckboxInputByName('hasOutputParser');
			await n8n.ndv.clickBackToCanvasButton();
			await n8n.canvas.addSupplementalNodeToParent(
				AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
				'ai_languageModel',
				AGENT_NODE_NAME,
				{ exactMatch: true, closeNDV: true },
			);

			await n8n.canvas.addSupplementalNodeToParent(
				AI_MEMORY_REDIS_CHAT_NODE_NAME,
				'ai_memory',
				AGENT_NODE_NAME,
				{ closeNDV: true },
			);

			await n8n.canvas.addSupplementalNodeToParent(
				AI_TOOL_CALCULATOR_NODE_NAME,
				'ai_tool',
				AGENT_NODE_NAME,
				{ closeNDV: true },
			);

			await n8n.canvas.addSupplementalNodeToParent(
				AI_OUTPUT_PARSER_AUTO_FIXING_NODE_NAME,
				'ai_outputParser',
				AGENT_NODE_NAME,
				{ closeNDV: true },
			);
			for (const nodeName of agentSubNodes) {
				await expect(n8n.canvas.connectionBetweenNodes(nodeName, AGENT_NODE_NAME)).toBeAttached();
			}
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2 + agentSubNodes.length); // Chat Trigger + Agent + 4 inputs
		});

		test('should add multiple tool nodes to Agent node tool input type', async ({ n8n }) => {
			await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

			const tools = [
				AI_TOOL_CALCULATOR_NODE_NAME,
				AI_TOOL_CODE_NODE_NAME,
				AI_TOOL_CODE_NODE_NAME,
				AI_TOOL_WIKIPEDIA_NODE_NAME,
			];

			for (const tool of tools) {
				await n8n.canvas.addSupplementalNodeToParent(tool, 'ai_tool', AGENT_NODE_NAME, {
					closeNDV: true,
				});
				await expect(n8n.canvas.connectionBetweenNodes(tool, AGENT_NODE_NAME)).toBeAttached();
			}

			// Chat Trigger + Agent + Tools
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2 + tools.length);
		});
	});

	test.describe('Chat Execution and Interaction', () => {
		test('should be able to open and execute Agent node', async ({ n8n }) => {
			await setupBasicAgentWorkflow(n8n);

			const inputMessage = 'Hello!';
			await n8n.canvas.clickManualChatButton();
			await executeChatAndWaitForResponse(n8n, inputMessage);

			// Verify chat message appears
			await expect(n8n.canvas.getManualChatLatestBotMessage()).toBeVisible();
		});
		test('should add and use Manual Chat Trigger node together with Agent node', async ({
			n8n,
		}) => {
			await setupBasicAgentWorkflow(n8n);

			const inputMessage = 'Hello!';
			await n8n.canvas.clickManualChatButton();
			await executeChatAndWaitForResponse(n8n, inputMessage);

			await verifyChatMessages(n8n, 2, inputMessage);
			await verifyLogsPanelEntries(n8n, [
				'When chat message received',
				'AI Agent',
				'OpenAI Chat Model',
			]);

			await n8n.canvas.closeManualChatModal();
			await expect(n8n.canvas.logsPanel.getLogEntries()).toBeHidden();
			await expect(n8n.canvas.getManualChatInput()).toBeHidden();
		});
	});

	test('should keep the same session when switching tabs', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_chat_partial_execution.json');
		await n8n.canvas.clickZoomToFitButton();

		await n8n.canvas.logsPanel.open();

		// Send a message
		await n8n.canvas.logsPanel.sendManualChatMessage('Test');
		await expect(n8n.canvas.getManualChatLatestBotMessage()).toContainText('this_my_field');

		await n8n.canvas.clickExecutionsTab();

		await n8n.canvas.clickEditorTab();
		await expect(n8n.canvas.getManualChatLatestBotMessage()).toContainText('this_my_field');

		// Refresh session
		await n8n.canvas.logsPanel.refreshSession();
		await expect(n8n.canvas.logsPanel.getManualChatMessages()).not.toBeAttached();
	});
});
