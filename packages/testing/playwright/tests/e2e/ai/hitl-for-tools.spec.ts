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

test.use({ capability: 'proxy' });
const hitlForToolsTestConfig = {
	timezoneId: 'America/New_York',
	capability: {
		services: ['proxy'],
		env: {
			N8N_COMMUNITY_PACKAGES_ENABLED: 'false',
		},
	},
} as const;

test.use(hitlForToolsTestConfig);
test.describe('HITL for Tools @capability:proxy', () => {
	test.beforeEach(async ({ n8n, proxyServer }) => {
		await proxyServer.clearAllExpectations();
		await proxyServer.loadExpectations('hitl-for-tools');
		await n8n.canvas.openNewWorkflow();
	});

	test('should add a HITL tool node', async ({ n8n, proxyServer }) => {
		await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

		await addOpenAILanguageModelWithCredentials(n8n, AGENT_NODE_NAME);

		await n8n.canvas.addSupplementalNodeToParent(
			MANUAL_CHAT_TRIGGER_NODE_NAME,
			'ai_tool',
			AGENT_NODE_NAME,
			{ closeNDV: true, subcategory: HITL_TOOL_SUBCATEGORY, exactMatch: true },
		);

		await n8n.canvas.addSupplementalNodeToParent(
			AI_TOOL_CODE_NODE_NAME,
			'ai_tool',
			MANUAL_CHAT_TRIGGER_NODE_NAME,
			{ closeNDV: false },
		);

		await n8n.ndv.getParameterInput('description').locator('textarea').fill('Send email');
		await setEditorText(n8n, 'jsCode', 'return "Email sent";');

		await n8n.ndv.setParameterSwitch('specifyInputSchema', true);
		await setEditorText(n8n, 'jsonSchemaExample', '{"receiver": "",    "body": ""}');

		await n8n.ndv.clickBackToCanvasButton();

		await n8n.canvas.addNode(MANUAL_CHAT_TRIGGER_NODE_NAME, {
			closeNDV: false,
			action: 'Send a message',
			fromNode: AGENT_NODE_NAME,
		});
		await n8n.ndv.openExpressionEditorModal('message');
		await n8n.ndv.fillExpressionEditorModalInput('{{ $json.output }}');
		await n8n.ndv.getExpressionEditorModalOutput().click();
		await n8n.page.keyboard.press('Escape');
		await n8n.ndv.clickBackToCanvasButton();

		await n8n.canvas.openNode(CHAT_TRIGGER_NODE_DISPLAY_NAME);
		await n8n.ndv.addParameterOptionByName('Response mode');
		await n8n.ndv.selectOptionInParameterDropdown('responseMode', 'Using Response Nodes');
		await n8n.ndv.clickBackToCanvasButton();

		await n8n.canvas.clickManualChatButton();
		await n8n.canvas.logsPanel.sendManualChatMessage('Send welcome email to john@gmail.com');
		const approveButton = n8n.page.getByTestId('canvas-chat').getByText('Approve');
		await expect(approveButton).toBeVisible({ timeout: 20000 });
		await approveButton.click({ button: 'middle' });
		await waitForWorkflowSuccess(n8n);
	});
});
