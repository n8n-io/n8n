import {
	AGENT_NODE_NAME,
	AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
	AI_TOOL_CODE_NODE_NAME,
	CHAT_TRIGGER_NODE_DISPLAY_NAME,
	HITL_TOOL_SUBCATEGORY,
	MANUAL_CHAT_TRIGGER_NODE_NAME,
} from '../../../config/constants';
import { expect, test } from '../../../fixtures/base';
import type { n8nPage } from '../../../pages/n8nPage';

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

async function setEditorText(n8n: n8nPage, parameterName: string, value: string) {
	const codeEditor = n8n.ndv.getParameterInput(parameterName).locator('.cm-content');
	await codeEditor.click();
	await n8n.page.keyboard.press('ControlOrMeta+a');
	await n8n.page.keyboard.press('Delete');
	await codeEditor.fill(value);
}

async function executeChatAndWaitForResponse(n8n: n8nPage, message: string) {
	await n8n.canvas.logsPanel.sendManualChatMessage(message);
	await waitForWorkflowSuccess(n8n);
}

test.use({ capability: 'proxy' });
test.describe('HITL for Tools @capability:proxy', () => {
	test.beforeEach(async ({ n8n, proxyServer }) => {
		// await proxyServer.clearAllExpectations();
		// await proxyServer.loadExpectations('langchain');
		await n8n.canvas.openNewWorkflow();
	});

	test('should add a HITL tool node', async ({ n8n, proxyServer }) => {
		await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

		await addOpenAILanguageModelWithCredentials(n8n, AGENT_NODE_NAME);

		await n8n.canvas.addSupplementalNodeToParent(
			MANUAL_CHAT_TRIGGER_NODE_NAME,
			'ai_tool',
			AGENT_NODE_NAME,
			{ closeNDV: true, subcategory: HITL_TOOL_SUBCATEGORY },
		);

		await n8n.canvas.addSupplementalNodeToParent(
			AI_TOOL_CODE_NODE_NAME,
			'ai_tool',
			MANUAL_CHAT_TRIGGER_NODE_NAME,
			{ closeNDV: false },
		);

		await n8n.ndv.fillParameterInputByName('description', 'Send email');
		await setEditorText(n8n, 'jsCode', 'return "Email sent";');

		await n8n.ndv.setParameterSwitch('hasOutputParser', true);
		await setEditorText(n8n, 'jsonSchemaExample', '{"receiver": "",    "body": ""}');

		await n8n.ndv.clickBackToCanvasButton();

		await n8n.canvas.addNode(MANUAL_CHAT_TRIGGER_NODE_NAME, {
			closeNDV: false,
			action: 'Send a message',
		});
		await n8n.ndv.openExpressionEditorModal('message');
		await n8n.ndv.fillExpressionEditorModalInput('{{ $json.output }}');
		await n8n.ndv.clickBackToCanvasButton();

		await n8n.canvas.openNode(CHAT_TRIGGER_NODE_DISPLAY_NAME);
		await n8n.ndv.addParameterOptionByName('Response mode');
		await n8n.ndv.selectOptionInParameterDropdown('responseMode', 'Using Response Nodes');
		await n8n.ndv.clickBackToCanvasButton();

		await n8n.canvas.clickManualChatButton();
		await executeChatAndWaitForResponse(n8n, 'Send welcome email to john@gmail.com');
		const approveMessage = n8n.canvas.getManualChatLatestBotMessage();
		const approveButton = approveMessage.getByText('Approve');
		await expect(approveButton).toBeVisible();
		await approveButton.click();

		await proxyServer.recordExpectations('langchain', {
			host: 'api.openai.com', // Filter by OpenAI host
			dedupe: true, // Remove duplicate requests
			transform: (expectation) => {
				// Clean up sensitive data or headers if needed
				const response = expectation.httpResponse as {
					headers?: Record<string, string[]>;
				};

				if (response?.headers) {
					delete response.headers['authorization'];
				}

				return expectation;
			},
		});
	});
});
