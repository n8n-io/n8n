import { nanoid } from 'nanoid';

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

async function setEditorText(n8n: n8nPage, parameterName: string, value: string) {
	const codeEditor = n8n.ndv.getParameterEditor(parameterName);
	await codeEditor.click();
	await n8n.page.keyboard.press('ControlOrMeta+a');
	await n8n.page.keyboard.press('Delete');
	await codeEditor.fill(value);
}

const ANTHROPIC_RESPONSE = {
	id: 'msg_hitl_visibility',
	type: 'message',
	role: 'assistant',
	model: 'claude-sonnet-4-5-20250929',
	content: [{ type: 'text', text: 'Here is my answer.' }],
	stop_reason: 'end_turn',
	stop_sequence: null,
	usage: { input_tokens: 10, output_tokens: 5 },
};

interface AnthropicMessagesRequest {
	tools?: Array<{ name?: string }>;
}

interface OpenAIResponsesRequest {
	input?: Array<{ type?: string; output?: string; call_id?: string }>;
}

const hitlForToolsTestConfig = {
	capability: {
		services: ['proxy'],
		env: {
			N8N_COMMUNITY_PACKAGES_ENABLED: 'false',
		},
	},
} as const;

test.use(hitlForToolsTestConfig);
test.describe(
	'HITL for Tools @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'AI' }],
	},
	() => {
		test.beforeEach(async ({ n8n, services }) => {
			await services.proxy.clearAllExpectations();
			await services.proxy.loadExpectations('hitl-for-tools');
			await n8n.canvas.openNewWorkflow();
		});

		test('should add a HITL node between Agent and Tool node', async ({ n8n }) => {
			await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

			await addOpenAILanguageModelWithCredentials(n8n, AGENT_NODE_NAME);

			await n8n.canvas.addSupplementalNodeToParent(
				AI_TOOL_CODE_NODE_NAME,
				'ai_tool',
				AGENT_NODE_NAME,
				{ closeNDV: true },
			);

			await n8n.canvas.dragNodeToRelativePosition(AI_TOOL_CODE_NODE_NAME, 100, 50);

			const specificConnection = n8n.canvas.connectionBetweenNodes(
				AI_TOOL_CODE_NODE_NAME,
				AGENT_NODE_NAME,
			);
			await expect(specificConnection).toBeVisible();
			// eslint-disable-next-line playwright/no-force-option
			await specificConnection.hover({ force: true });

			const addNodeButton = n8n.canvas.getAddConnectionButtonBetweenNodes(
				AI_TOOL_CODE_NODE_NAME,
				AGENT_NODE_NAME,
			);
			await expect(addNodeButton).toBeVisible();
			await addNodeButton.click();
			await n8n.canvas.clickNodeCreatorItemName(MANUAL_CHAT_TRIGGER_NODE_NAME);
			await n8n.page.keyboard.press('Escape');

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(5);
			await expect(n8n.canvas.nodeConnections()).toHaveCount(4);
		});

		test('should add a HITL tool node and run it', async ({ n8n }) => {
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

			await n8n.ndv.getParameterTextarea('description').fill('Send email');
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
			const approveButton = n8n.canvas.manualChat.getApproveButton();
			await expect(approveButton).toBeVisible({ timeout: 15000 });
			await approveButton.click({ button: 'middle' });

			// Approving resumes the run, the tool executes, and the Chat node posts the
			// agent's answer back. A chat run on an unsaved workflow shows no
			// execution-success toast, so that reply is the completion signal.
			await expect(n8n.canvas.getManualChatLatestBotMessage()).toContainText(
				'sent the welcome email to john@gmail.com',
				{ timeout: 15000 },
			);
		});

		// Regression test for the community forum issue AI-2656: after clicking
		// Approve on a tool gated behind a Human Review node, the tool must actually
		// execute and its real result must be returned to the agent. The bug returns
		// the Human Review approval object (e.g. { approved: true }) to the agent
		// instead of the gated tool's result, so the agent never sees the tool output
		// and loops until it hits max iterations.
		// https://community.n8n.io/t/human-review-before-ai-tool-works-in-n8n-2-6-0-but-does-not-execute-the-tool-in-2-27-5-hitl/304110/1
		test('should return the real tool result to the agent after approval, not the approval object', async ({
			n8n,
			services,
		}) => {
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

			// The gated tool returns a distinctive result we can assert reached the agent.
			await n8n.ndv.getParameterTextarea('description').fill('Send email');
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
			const approveButton = n8n.canvas.manualChat.getApproveButton();
			await expect(approveButton).toBeVisible({ timeout: 15000 });
			await approveButton.click({ button: 'middle' });

			// After approval, the agent sends the model a follow-up request that carries
			// the gated tool's result back as a `function_call_output`. Inspect what the
			// agent actually sent to the model to verify the tool result — not the Human
			// Review approval payload — reached it.
			const getToolOutputs = async () =>
				(await services.proxy.getAllRequestsMade())
					.filter((request) => request.httpRequest?.path === '/v1/responses')
					.flatMap((request) => {
						const input =
							(request.httpRequest?.body as { json?: OpenAIResponsesRequest })?.json?.input ?? [];
						return input.filter((item) => item?.type === 'function_call_output');
					});

			await expect
				.poll(async () => (await getToolOutputs()).length, { timeout: 30_000 })
				.toBeGreaterThan(0);

			const combinedOutput = (await getToolOutputs()).map((item) => item.output ?? '').join('\n');

			// The agent must receive the gated tool's real result...
			expect(combinedOutput).toContain('Email sent');
			// ...and never the raw Human Review approval object.
			expect(combinedOutput).not.toContain('approved');
		});

		// The duplicated-module bug this guards against only reproduces in the packaged image (container mode)
		test('agent should send HITL-wrapped tools to the model on the first turn, before approval', async ({
			n8n,
			api,
			services,
		}) => {
			// Mock Anthropic so the agent completes one turn; only the request matters
			await services.proxy.createExpectation({
				httpRequest: { method: 'POST', path: '/v1/messages' },
				httpResponse: {
					statusCode: 200,
					headers: { 'Content-Type': ['application/json'] },
					body: JSON.stringify(ANTHROPIC_RESPONSE),
				},
			});

			const credential = await api.credentials.createCredential({
				name: `Anthropic account ${nanoid()}`,
				type: 'anthropicApi',
				data: { apiKey: 'test-key' },
			});

			const imported = await api.workflows.importWorkflowFromFile('hitl-wrapped-tool.json', {
				transform: (workflow) => {
					const modelNode = workflow.nodes?.find((node) => node.name === 'Anthropic Chat Model');
					if (!modelNode) throw new Error('Anthropic Chat Model node not found in fixture');
					modelNode.credentials = { anthropicApi: { id: credential.id, name: credential.name } };
					return workflow;
				},
			});
			await n8n.start.fromExistingWorkflow(imported.workflowId);

			await n8n.canvas.clickManualChatButton();
			await n8n.canvas.logsPanel.sendManualChatMessage('What tools do you have access to?');

			const getMessagesRequests = async () =>
				(await services.proxy.getAllRequestsMade()).filter(
					(request) => request.httpRequest?.path === '/v1/messages',
				);

			await expect
				.poll(async () => (await getMessagesRequests()).length, { timeout: 30_000 })
				.toBeGreaterThan(0);

			const body = (await getMessagesRequests())[0]?.httpRequest?.body as {
				json?: AnthropicMessagesRequest;
			};
			const toolNames = (body?.json?.tools ?? []).map((tool) => tool.name);

			expect(toolNames).toContain('Direct_Tool');
			expect(toolNames).toContain('Get_secret_message');
		});
	},
);
