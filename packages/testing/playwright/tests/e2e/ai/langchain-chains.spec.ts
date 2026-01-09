import {
	AGENT_NODE_NAME,
	AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
	BASIC_LLM_CHAIN_NODE_NAME,
	CHAT_TRIGGER_NODE_DISPLAY_NAME,
	MANUAL_CHAT_TRIGGER_NODE_NAME,
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

test.use({ capability: 'proxy' });
test.describe('Langchain Integration @capability:proxy', () => {
	test.beforeEach(async ({ n8n, proxyServer }) => {
		await proxyServer.clearAllExpectations();
		await proxyServer.loadExpectations('langchain');
		await n8n.canvas.openNewWorkflow();
	});

	test.describe('Auto-add Behavior', () => {
		test('should auto-add chat trigger and basic LLM chain when adding LLM node', async ({
			n8n,
		}) => {
			await n8n.canvas.addNode(AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, { closeNDV: true });

			await expect(
				n8n.canvas.connectionBetweenNodes(
					CHAT_TRIGGER_NODE_DISPLAY_NAME,
					BASIC_LLM_CHAIN_NODE_NAME,
				),
			).toBeAttached();

			await expect(
				n8n.canvas.connectionBetweenNodes(
					AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
					BASIC_LLM_CHAIN_NODE_NAME,
				),
			).toBeAttached();

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
		});

		test('should not auto-add nodes if AI nodes are already present', async ({ n8n }) => {
			await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

			await n8n.canvas.addNode(AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, { closeNDV: true });

			await expect(
				n8n.canvas.connectionBetweenNodes(CHAT_TRIGGER_NODE_DISPLAY_NAME, AGENT_NODE_NAME),
			).toBeAttached();

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
		});

		test('should not auto-add nodes if ChatTrigger is already present', async ({ n8n }) => {
			await n8n.canvas.addNode(MANUAL_CHAT_TRIGGER_NODE_NAME, { closeNDV: true });

			await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

			await n8n.canvas.addNode(AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, { closeNDV: true });

			await expect(
				n8n.canvas.connectionBetweenNodes(CHAT_TRIGGER_NODE_DISPLAY_NAME, AGENT_NODE_NAME),
			).toBeAttached();

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
		});
	});

	test.describe('Chat Execution and Interaction', () => {
		test('should be able to open and execute Basic LLM Chain node', async ({ n8n }) => {
			await n8n.canvas.addNode(BASIC_LLM_CHAIN_NODE_NAME, { closeNDV: true });

			await addOpenAILanguageModelWithCredentials(n8n, BASIC_LLM_CHAIN_NODE_NAME);

			await n8n.canvas.openNode(BASIC_LLM_CHAIN_NODE_NAME);
			const inputMessage = 'Hello!';

			await n8n.ndv.execute();
			await executeChatAndWaitForResponse(n8n, inputMessage);

			// Verify chat message appears
			await expect(n8n.canvas.getManualChatLatestBotMessage()).toBeVisible();
		});
	});
});
