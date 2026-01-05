import {
	AGENT_NODE_NAME,
	AI_TOOL_CALCULATOR_NODE_NAME,
	AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
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

test.use({
	addContainerCapability: {
		proxyServerEnabled: true,
	},
});
test.describe('Langchain Integration @capability:proxy', () => {
	test.beforeEach(async ({ n8n, proxyServer }) => {
		await proxyServer.clearAllExpectations();
		await proxyServer.loadExpectations('langchain');
		await n8n.canvas.openNewWorkflow();
	});

	// @AI team to look at this
	// eslint-disable-next-line playwright/no-skipped-test
	test.skip('Tool Usage Notifications', () => {
		test('should show tool info notice if no existing tools were used during execution', async ({
			n8n,
		}) => {
			await setupBasicAgentWorkflow(n8n, [AI_TOOL_CALCULATOR_NODE_NAME]);
			await n8n.canvas.openNode(AGENT_NODE_NAME);

			const inputMessage = 'Hello!';
			await n8n.ndv.execute();
			await executeChatAndWaitForResponse(n8n, inputMessage);

			await n8n.canvas.closeManualChatModal();
			await n8n.canvas.openNode(AGENT_NODE_NAME);

			await expect(n8n.ndv.getRunDataInfoCallout()).toBeVisible();
		});
		test('should not show tool info notice if tools were used during execution', async ({
			n8n,
		}) => {
			await n8n.canvas.addNode(MANUAL_CHAT_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: false });
			await expect(n8n.ndv.getRunDataInfoCallout()).toBeHidden();
			await n8n.ndv.clickBackToCanvasButton();

			await addOpenAILanguageModelWithCredentials(n8n, AGENT_NODE_NAME);

			await n8n.canvas.addSupplementalNodeToParent(
				AI_TOOL_CALCULATOR_NODE_NAME,
				'ai_tool',
				AGENT_NODE_NAME,
				{ closeNDV: true },
			);

			const inputMessage = 'What is 1000 * 10?';
			await n8n.canvas.clickManualChatButton();
			await executeChatAndWaitForResponse(n8n, inputMessage);

			await n8n.canvas.closeManualChatModal();
			await n8n.canvas.openNode(AGENT_NODE_NAME);

			await expect(n8n.ndv.getRunDataInfoCallout()).toBeHidden();
		});
	});
});
