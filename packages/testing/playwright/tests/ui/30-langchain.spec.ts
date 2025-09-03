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
import { createMockNodeExecutionData, runMockWorkflowExecution } from '../../utils/execution-mocks';
import { createAgentLLMExecutionData } from '../../utils/langchain-test-fixtures';

test.describe('Langchain Integration', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.page.goto('/workflow/new');
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

			await n8n.canvas.disableNode(SCHEDULE_TRIGGER_NODE_NAME);
			await expect(n8n.canvas.getExecuteWorkflowButton()).toBeHidden();
		});
	});

	test.describe('Node Connection and Configuration', () => {
		test('should add nodes to all Agent node input types', async ({ n8n }) => {
			const agentSubNodes = [
				AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
				AI_MEMORY_WINDOW_BUFFER_MEMORY_NODE_NAME,
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
			await runMockWorkflowExecution(n8n.page, {
				trigger: async () => await n8n.canvas.sendManualChatMessage(inputMessage),
				runData: [
					createMockNodeExecutionData(BASIC_LLM_CHAIN_NODE_NAME, {
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
			await runMockWorkflowExecution(n8n.page, {
				trigger: async () => await n8n.canvas.sendManualChatMessage(inputMessage),
				runData: [
					createMockNodeExecutionData(AGENT_NODE_NAME, {
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
		test('should add and use Manual Chat Trigger node together with Agent node', async ({
			n8n,
		}) => {
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
				createMockNodeExecutionData(MANUAL_CHAT_TRIGGER_NODE_NAME, {
					jsonData: {
						main: { input: inputMessage },
					},
				}),
				createMockNodeExecutionData(
					AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
					createAgentLLMExecutionData(
						AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
						AGENT_NODE_NAME,
						outputMessage,
					),
				),
				createMockNodeExecutionData(AGENT_NODE_NAME, {
					jsonData: {
						main: { output: outputMessage },
					},
				}),
			];

			await runMockWorkflowExecution(n8n.page, {
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
	});

	test.describe('Tool Usage Notifications', () => {
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

			await runMockWorkflowExecution(n8n.page, {
				trigger: async () => await n8n.canvas.sendManualChatMessage(inputMessage),
				runData: [
					createMockNodeExecutionData(AGENT_NODE_NAME, {
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
		test('should not show tool info notice if tools were used during execution', async ({
			n8n,
		}) => {
			await n8n.canvas.addNode(MANUAL_CHAT_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: false });
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

			await runMockWorkflowExecution(n8n.page, {
				trigger: async () => await n8n.canvas.sendManualChatMessage(inputMessage),
				runData: [
					createMockNodeExecutionData(AGENT_NODE_NAME, {
						jsonData: {
							main: { output: outputMessage },
						},
						metadata: {
							subRun: [{ node: AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, runIndex: 0 }],
						},
					}),
					createMockNodeExecutionData(AI_TOOL_CALCULATOR_NODE_NAME, {}),
				],
				lastNodeExecuted: AGENT_NODE_NAME,
			});

			await n8n.canvas.closeManualChatModal();
			await n8n.canvas.openNode(AGENT_NODE_NAME);

			await expect(n8n.ndv.getRunDataInfoCallout()).toBeHidden();
		});
	});

	test.describe('Advanced Workflow Features', () => {
		test('should render runItems for sub-nodes and allow switching between them', async ({
			n8n,
		}) => {
			await n8n.start.fromImportedWorkflow('In_memory_vector_store_fake_embeddings.json');
			await n8n.canvas.clickZoomToFitButton();
			await n8n.canvas.deselectAll();

			await n8n.canvas.executeNode('Populate VS');
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			const assertInputOutputTextExists = async (text: string) => {
				await expect(n8n.ndv.getOutputPanel()).toContainText(text);
				await expect(n8n.ndv.getInputPanel()).toContainText(text);
			};

			const assertInputOutputTextNotExists = async (text: string) => {
				await expect(n8n.ndv.getOutputPanel()).not.toContainText(text);
				await expect(n8n.ndv.getInputPanel()).not.toContainText(text);
			};

			await n8n.canvas.openNode('Character Text Splitter');

			await expect(n8n.ndv.getOutputRunSelector()).toBeVisible();
			await expect(n8n.ndv.getInputRunSelector()).toBeVisible();
			await expect(n8n.ndv.getInputRunSelectorInput()).toHaveValue('3 of 3');
			await expect(n8n.ndv.getOutputRunSelectorInput()).toHaveValue('3 of 3');
			await assertInputOutputTextExists('Kyiv');
			await assertInputOutputTextNotExists('Berlin');
			await assertInputOutputTextNotExists('Prague');

			await n8n.ndv.changeOutputRunSelector('2 of 3');
			await assertInputOutputTextExists('Berlin');
			await assertInputOutputTextNotExists('Kyiv');
			await assertInputOutputTextNotExists('Prague');

			await n8n.ndv.changeOutputRunSelector('1 of 3');
			await assertInputOutputTextExists('Prague');
			await assertInputOutputTextNotExists('Berlin');
			await assertInputOutputTextNotExists('Kyiv');

			await n8n.ndv.toggleInputRunLinking();
			await n8n.ndv.changeOutputRunSelector('2 of 3');
			await expect(n8n.ndv.getInputRunSelectorInput()).toHaveValue('1 of 3');
			await expect(n8n.ndv.getOutputRunSelectorInput()).toHaveValue('2 of 3');
			await expect(n8n.ndv.getInputPanel()).toContainText('Prague');
			await expect(n8n.ndv.getInputPanel()).not.toContainText('Berlin');

			await expect(n8n.ndv.getOutputPanel()).toContainText('Berlin');
			await expect(n8n.ndv.getOutputPanel()).not.toContainText('Prague');

			await n8n.ndv.toggleInputRunLinking();
			await expect(n8n.ndv.getInputRunSelectorInput()).toHaveValue('1 of 3');
			await expect(n8n.ndv.getOutputRunSelectorInput()).toHaveValue('1 of 3');
			await assertInputOutputTextExists('Prague');
			await assertInputOutputTextNotExists('Berlin');
			await assertInputOutputTextNotExists('Kyiv');
		});

		test('should execute up to Node 1 when using partial execution', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Test_workflow_chat_partial_execution.json');
			await n8n.canvas.clickZoomToFitButton();

			// Check that chat modal is not initially visible
			await expect(n8n.canvas.getManualChatModal().locator('main')).toBeHidden();

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
});
