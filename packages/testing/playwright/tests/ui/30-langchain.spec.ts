import {
	AGENT_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	MANUAL_CHAT_TRIGGER_NODE_NAME,
	AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
	AI_MEMORY_WINDOW_BUFFER_MEMORY_NODE_NAME,
	AI_TOOL_CALCULATOR_NODE_NAME,
	AI_OUTPUT_PARSER_AUTO_FIXING_NODE_NAME,
	AI_TOOL_CODE_NODE_NAME,
	AI_TOOL_WIKIPEDIA_NODE_NAME,
	BASIC_LLM_CHAIN_NODE_NAME,
	CHAT_TRIGGER_NODE_DISPLAY_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
} from '../../config/constants';
import { test, expect } from '../../fixtures/base';

test.describe('Langchain Integration', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.page.goto('/workflow/new');
	});

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

		await n8n.canvas.disableNode(SCHEDULE_TRIGGER_NODE_NAME);
		await expect(n8n.canvas.getExecuteWorkflowButton()).toBeHidden();
	});

	test('should add nodes to all Agent node input types', async ({ n8n }) => {
		const agentSubNodes = [
			AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
			AI_MEMORY_WINDOW_BUFFER_MEMORY_NODE_NAME,
			AI_TOOL_CALCULATOR_NODE_NAME,
			AI_OUTPUT_PARSER_AUTO_FIXING_NODE_NAME,
		];
		await n8n.canvas.addNode(AGENT_NODE_NAME);

		await n8n.ndv.checkParameterCheckboxInputByName('hasOutputParser');
		await n8n.ndv.clickBackToCanvasButton();
		await n8n.canvas.addSupplementalNodeToParent(
			AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
			'ai_languageModel',
			AGENT_NODE_NAME,
			{ exactMatch: true, closeNDV: true },
		);

		await n8n.canvas.addSupplementalNodeToParent(
			AI_MEMORY_WINDOW_BUFFER_MEMORY_NODE_NAME,
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
		agentSubNodes.forEach(async (nodeName) => {
			await expect(n8n.canvas.connectionBetweenNodes(nodeName, AGENT_NODE_NAME)).toBeAttached();
		});
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

	test('should auto-add chat trigger and basic LLM chain when adding LLM node', async ({ n8n }) => {
		await n8n.canvas.addNode(AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, { closeNDV: true });

		await expect(
			n8n.canvas.connectionBetweenNodes(CHAT_TRIGGER_NODE_DISPLAY_NAME, BASIC_LLM_CHAIN_NODE_NAME),
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

	test('should be able to open and execute Basic LLM Chain node', async ({ n8n }) => {
		await n8n.canvas.addNode(BASIC_LLM_CHAIN_NODE_NAME, { closeNDV: true });

		await n8n.canvas.addSupplementalNodeToParent(
			AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
			'ai_languageModel',
			BASIC_LLM_CHAIN_NODE_NAME,
			{ exactMatch: true, closeNDV: false },
		);

		await n8n.ndv.clickCreateNewCredential();
		await n8n.ndv.setCredentialValues({
			apiKey: 'sk_test_123',
		});
		await n8n.ndv.clickBackToCanvasButton();

		await n8n.canvas.openNode(BASIC_LLM_CHAIN_NODE_NAME);
		const inputMessage = 'Hello!';
		const outputMessage = 'Hi there! How can I assist you today?';

		await n8n.ndv.clickExecuteNode();
		await n8n.canvas.mockWorkflowExecution({
			trigger: async () => await n8n.canvas.sendManualChatMessage(inputMessage),
			runData: [
				n8n.canvas.createMockNodeExecutionData(BASIC_LLM_CHAIN_NODE_NAME, {
					jsonData: {
						main: { output: outputMessage },
					},
					metadata: {
						subRun: [{ node: AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, runIndex: 0 }],
					},
				}),
			],
			lastNodeExecuted: BASIC_LLM_CHAIN_NODE_NAME,
		});

		await expect(n8n.canvas.getManualChatLatestBotMessage()).toContainText(outputMessage);
	});
	test('should be able to open and execute Agent node', async ({ n8n }) => {
		await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

		await n8n.canvas.addSupplementalNodeToParent(
			AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
			'ai_languageModel',
			AGENT_NODE_NAME,
			{ exactMatch: true, closeNDV: false },
		);

		await n8n.ndv.clickCreateNewCredential();
		await n8n.ndv.setCredentialValues({
			apiKey: 'sk_test_123',
		});
		await n8n.ndv.clickBackToCanvasButton();

		await n8n.canvas.openNode(AGENT_NODE_NAME);

		const inputMessage = 'Hello!';
		const outputMessage = 'Hi there! How can I assist you today?';

		await n8n.ndv.clickExecuteNode();
		await n8n.canvas.mockWorkflowExecution({
			trigger: async () => await n8n.canvas.sendManualChatMessage(inputMessage),
			runData: [
				n8n.canvas.createMockNodeExecutionData(AGENT_NODE_NAME, {
					jsonData: {
						main: { output: outputMessage },
					},
					metadata: {
						subRun: [{ node: AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, runIndex: 0 }],
					},
				}),
			],
			lastNodeExecuted: AGENT_NODE_NAME,
		});

		await expect(n8n.canvas.getManualChatLatestBotMessage()).toContainText(outputMessage);
	});
	test('should add and use Manual Chat Trigger node together with Agent node', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_CHAT_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

		await n8n.canvas.addSupplementalNodeToParent(
			AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
			'ai_languageModel',
			AGENT_NODE_NAME,
			{ exactMatch: true, closeNDV: false },
		);

		await n8n.ndv.clickCreateNewCredential();
		await n8n.ndv.setCredentialValues({
			apiKey: 'sk_test_123',
		});
		await n8n.ndv.clickBackToCanvasButton();

		await n8n.canvas.clickManualChatButton();

		const inputMessage = 'Hello!';
		const outputMessage = 'Hi there! How can I assist you today?';
		const runData = [
			n8n.canvas.createMockNodeExecutionData(MANUAL_CHAT_TRIGGER_NODE_NAME, {
				jsonData: {
					main: { input: inputMessage },
				},
			}),
			n8n.canvas.createMockNodeExecutionData(AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, {
				jsonData: {
					ai_languageModel: {
						response: {
							generations: [
								{
									text: `{
	"action": "Final Answer",
	"action_input": "${outputMessage}"
}`,
									message: {
										lc: 1,
										type: 'constructor',
										id: ['langchain', 'schema', 'AIMessage'],
										kwargs: {
											content: `{
	"action": "Final Answer",
	"action_input": "${outputMessage}"
}`,
											additional_kwargs: {},
										},
									},
									generationInfo: { finish_reason: 'stop' },
								},
							],
							llmOutput: {
								tokenUsage: {
									completionTokens: 26,
									promptTokens: 519,
									totalTokens: 545,
								},
							},
						},
					},
				},
				metadata: {
					subRun: [{ node: AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, runIndex: 0 }],
				},
				source: [{ previousNode: AGENT_NODE_NAME, previousNodeRun: 0 }],
				inputOverride: {
					ai_languageModel: [
						[
							{
								json: {
									messages: [
										{
											lc: 1,
											type: 'constructor',
											id: ['langchain', 'schema', 'SystemMessage'],
											kwargs: {
												content:
													'Assistant is a large language model trained by OpenAI.\n\nAssistant is designed to be able to assist with a wide range of tasks, from answering simple questions to providing in-depth explanations and discussions on a wide range of topics. As a language model, Assistant is able to generate human-like text based on the input it receives, allowing it to engage in natural-sounding conversations and provide responses that are coherent and relevant to the topic at hand.\n\nAssistant is constantly learning and improving, and its capabilities are constantly evolving. It is able to process and understand large amounts of text, and can use this knowledge to provide accurate and informative responses to a wide range of questions. Additionally, Assistant is able to generate its own text based on the input it receives, allowing it to engage in discussions and provide explanations and descriptions on a wide range of topics.\n\nOverall, Assistant is a powerful system that can help with a wide range of tasks and provide valuable insights and information on a wide range of topics. Whether you need help with a specific question or just want to have a conversation about a particular topic, Assistant is here to assist. However, above all else, all responses must adhere to the format of RESPONSE FORMAT INSTRUCTIONS.',
												additional_kwargs: {},
											},
										},
										{
											lc: 1,
											type: 'constructor',
											id: ['langchain', 'schema', 'HumanMessage'],
											kwargs: {
												content:
													'TOOLS\n------\nAssistant can ask the user to use tools to look up information that may be helpful in answering the users original question. The tools the human can use are:\n\n\n\nRESPONSE FORMAT INSTRUCTIONS\n----------------------------\n\nOutput a JSON markdown code snippet containing a valid JSON object in one of two formats:\n\n**Option 1:**\nUse this if you want the human to use a tool.\nMarkdown code snippet formatted in the following schema:\n\n```json\n{\n    "action": string, // The action to take. Must be one of []\n    "action_input": string // The input to the action. May be a stringified object.\n}\n```\n\n**Option #2:**\nUse this if you want to respond directly and conversationally to the human. Markdown code snippet formatted in the following schema:\n\n```json\n{\n    "action": "Final Answer",\n    "action_input": string // You should put what you want to return to use here and make sure to use valid json newline characters.\n}\n```\n\nFor both options, remember to always include the surrounding markdown code snippet delimiters (begin with "```json" and end with "```")!\n\n\nUSER\'S INPUT\n--------------------\nHere is the user\'s input (remember to respond with a markdown code snippet of a json blob with a single action, and NOTHING else):\n\nHello!',
												additional_kwargs: {},
											},
										},
									],
									options: { stop: ['Observation:'], promptIndex: 0 },
								},
							},
						],
					],
				},
			}),
			n8n.canvas.createMockNodeExecutionData(AGENT_NODE_NAME, {
				jsonData: {
					main: { output: 'Hi there! How can I assist you today?' },
				},
			}),
		];

		await n8n.canvas.mockWorkflowExecution({
			trigger: async () => {
				await n8n.canvas.sendManualChatMessage(inputMessage);
			},
			runData,
			lastNodeExecuted: AGENT_NODE_NAME,
		});

		const messages = n8n.canvas.getManualChatMessages();
		await expect(messages).toHaveCount(2);
		await expect(messages.first()).toContainText(inputMessage);
		await expect(messages.last()).toContainText(outputMessage);

		await expect(n8n.canvas.getOverviewPanel()).toBeVisible();
		await expect(n8n.canvas.getLogEntries()).toHaveCount(2);
		await expect(n8n.canvas.getLogEntries().nth(0)).toHaveText('AI Agent');
		await expect(n8n.canvas.getLogEntries().nth(1)).toHaveText('OpenAI Chat Model');

		await n8n.canvas.closeManualChatModal();
		await expect(n8n.canvas.getOverviewPanelBody()).toBeHidden();
		await expect(n8n.canvas.getManualChatInput()).toBeHidden();
	});
	test('should show tool info notice if no existing tools were used during execution', async ({
		n8n,
	}) => {
		await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

		await n8n.canvas.addSupplementalNodeToParent(
			AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
			'ai_languageModel',
			AGENT_NODE_NAME,
			{ exactMatch: true, closeNDV: false },
		);

		await n8n.ndv.clickCreateNewCredential();
		await n8n.ndv.setCredentialValues({
			apiKey: 'sk_test_123',
		});
		await n8n.ndv.clickBackToCanvasButton();

		await n8n.canvas.addSupplementalNodeToParent(
			AI_TOOL_CALCULATOR_NODE_NAME,
			'ai_tool',
			AGENT_NODE_NAME,
			{ closeNDV: true },
		);
		await n8n.canvas.openNode(AGENT_NODE_NAME);

		const inputMessage = 'Hello!';
		const outputMessage = 'Hi there! How can I assist you today?';

		await n8n.ndv.clickExecuteNode();

		await n8n.canvas.mockWorkflowExecution({
			trigger: async () => await n8n.canvas.sendManualChatMessage(inputMessage),
			runData: [
				n8n.canvas.createMockNodeExecutionData(AGENT_NODE_NAME, {
					jsonData: {
						main: { output: outputMessage },
					},
					metadata: {
						subRun: [{ node: AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, runIndex: 0 }],
					},
				}),
			],
			lastNodeExecuted: AGENT_NODE_NAME,
		});
		await n8n.canvas.closeManualChatModal();
		await n8n.canvas.openNode(AGENT_NODE_NAME);

		await expect(n8n.ndv.getRunDataInfoCallout()).toBeVisible();
	});
	test('should not show tool info notice if tools were used during execution', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_CHAT_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(AGENT_NODE_NAME);
		await expect(n8n.ndv.getRunDataInfoCallout()).toBeHidden();
		await n8n.ndv.clickBackToCanvasButton();

		await n8n.canvas.addSupplementalNodeToParent(
			AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
			'ai_languageModel',
			AGENT_NODE_NAME,
			{ exactMatch: true, closeNDV: false },
		);

		await n8n.ndv.clickCreateNewCredential();
		await n8n.ndv.setCredentialValues({
			apiKey: 'sk_test_123',
		});
		await n8n.ndv.clickBackToCanvasButton();

		await n8n.canvas.addSupplementalNodeToParent(
			AI_TOOL_CALCULATOR_NODE_NAME,
			'ai_tool',
			AGENT_NODE_NAME,
			{ closeNDV: true },
		);
		await n8n.canvas.openNode(AGENT_NODE_NAME);

		await expect(n8n.ndv.getRunDataInfoCallout()).toBeHidden();

		const inputMessage = 'Hello!';
		const outputMessage = 'Hi there! How can I assist you today?';

		await n8n.ndv.clickExecuteNode();

		await n8n.canvas.mockWorkflowExecution({
			trigger: async () => await n8n.canvas.sendManualChatMessage(inputMessage),
			runData: [
				n8n.canvas.createMockNodeExecutionData(AGENT_NODE_NAME, {
					jsonData: {
						main: { output: outputMessage },
					},
					metadata: {
						subRun: [{ node: AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, runIndex: 0 }],
					},
				}),
				n8n.canvas.createMockNodeExecutionData(AI_TOOL_CALCULATOR_NODE_NAME, {}),
			],
			lastNodeExecuted: AGENT_NODE_NAME,
		});

		await n8n.canvas.closeManualChatModal();
		await n8n.canvas.openNode(AGENT_NODE_NAME);
		// This waits to ensure the output panel is rendered
		n8n.ndv.getOutputPanelTable();

		await expect(n8n.ndv.getRunDataInfoCallout()).toBeHidden();
	});
	test('should execute up to Node 1 when using partial execution', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_chat_partial_execution.json');
		await n8n.canvas.clickZoomToFitButton();

		// Check that chat modal is not initially visible
		await expect(n8n.canvas.getManualChatModal().locator('main')).not.toBeVisible();

		// Open Node 1 and execute it
		await n8n.canvas.openNode('Node 1');
		await n8n.ndv.clickExecuteNode();

		// Chat modal should now be visible
		await expect(n8n.canvas.getManualChatModal().locator('main')).toBeVisible();

		// Send first message
		await n8n.canvas.sendManualChatMessage('Test');
		await expect(n8n.canvas.getManualChatLatestBotMessage()).toContainText('this_my_field_1');

		// Refresh session
		await n8n.page.getByTestId('refresh-session-button').click();
		await expect(n8n.canvas.getManualChatMessages()).not.toBeAttached();

		// Send another message
		await n8n.canvas.sendManualChatMessage('Another test');
		await expect(n8n.canvas.getManualChatLatestBotMessage()).toContainText('this_my_field_3');
		await expect(n8n.canvas.getManualChatLatestBotMessage()).toContainText('this_my_field_4');
	});
});
