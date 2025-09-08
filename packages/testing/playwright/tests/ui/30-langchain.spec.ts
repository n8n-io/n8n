import type { ExecutionError } from 'n8n-workflow';

import {
	AGENT_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	MANUAL_CHAT_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
	AI_MEMORY_WINDOW_BUFFER_MEMORY_NODE_NAME,
	AI_MEMORY_POSTGRES_NODE_NAME,
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
import { n8nPage } from '../../pages/n8nPage';

test.describe('Langchain Integration', () => {
	test.beforeEach(async ({ n8n }) => {
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
			await n8n.credentialsModal.setValues({
				apiKey: 'sk_test_123',
			});
			await n8n.ndv.clickBackToCanvasButton();

			await n8n.canvas.openNode(BASIC_LLM_CHAIN_NODE_NAME);
			const inputMessage = 'Hello!';
			const outputMessage = 'Hi there! How can I assist you today?';

			await n8n.ndv.execute();
			await runMockWorkflowExecution(n8n.page, {
				trigger: async () => await n8n.canvas.logsPanel.sendManualChatMessage(inputMessage),
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
			await n8n.credentialsModal.setValues({
				apiKey: 'sk_test_123',
			});
			await n8n.ndv.clickBackToCanvasButton();

			await n8n.canvas.openNode(AGENT_NODE_NAME);

			const inputMessage = 'Hello!';
			const outputMessage = 'Hi there! How can I assist you today?';

			await n8n.ndv.execute();
			await runMockWorkflowExecution(n8n.page, {
				trigger: async () => await n8n.canvas.logsPanel.sendManualChatMessage(inputMessage),
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
			await n8n.credentialsModal.setValues({
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
					await n8n.canvas.logsPanel.sendManualChatMessage(inputMessage);
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
			await n8n.credentialsModal.setValues({
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

			await n8n.ndv.execute();

			await runMockWorkflowExecution(n8n.page, {
				trigger: async () => await n8n.canvas.logsPanel.sendManualChatMessage(inputMessage),
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
			await n8n.credentialsModal.setValues({
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

			await n8n.ndv.execute();

			await runMockWorkflowExecution(n8n.page, {
				trigger: async () => await n8n.canvas.logsPanel.sendManualChatMessage(inputMessage),
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

	test.describe('Error Handling and Logs Display', () => {
		// Helper function to set up the agent workflow with Postgres error configuration
		async function setupAgentWorkflowWithPostgresError(n8n: n8nPage) {
			await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

			// Add Calculator Tool (required for OpenAI model)
			await n8n.canvas.addSupplementalNodeToParent(
				AI_TOOL_CALCULATOR_NODE_NAME,
				'ai_tool',
				AGENT_NODE_NAME,
				{ closeNDV: true },
			);

			// Add and configure Postgres Memory
			await n8n.canvas.addSupplementalNodeToParent(
				AI_MEMORY_POSTGRES_NODE_NAME,
				'ai_memory',
				AGENT_NODE_NAME,
				{ closeNDV: false },
			);

			await n8n.ndv.clickCreateNewCredential();
			await n8n.credentialsModal.setValues({
				password: 'testtesttest',
			});

			await n8n.ndv.getParameterInput('sessionIdType').click();
			await n8n.page.getByRole('option', { name: 'Define below' }).click();
			await n8n.ndv.getParameterInput('sessionKey').locator('input').fill('asdasd');

			await n8n.ndv.clickBackToCanvasButton();

			// Add and configure OpenAI Language Model
			await n8n.canvas.addSupplementalNodeToParent(
				AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
				'ai_languageModel',
				AGENT_NODE_NAME,
				{ exactMatch: true, closeNDV: false },
			);

			await n8n.ndv.clickCreateNewCredential();
			await n8n.credentialsModal.setValues({
				apiKey: 'sk_test_123',
			});
			await n8n.ndv.clickBackToCanvasButton();

			await n8n.canvas.clickZoomToFitButton();
		}

		// Helper function to create mock data with Postgres error
		function createPostgresErrorMockData(inputMessage: string, triggerNodeName: string) {
			return [
				createMockNodeExecutionData(triggerNodeName, {
					jsonData: {
						main: { input: inputMessage },
					},
				}),
				createMockNodeExecutionData(AI_MEMORY_POSTGRES_NODE_NAME, {
					jsonData: {
						ai_memory: {
							json: {
								action: 'loadMemoryVariables',
								values: {
									input: inputMessage,
									system_message: 'You are a helpful assistant',
									formatting_instructions:
										'IMPORTANT: Always call `format_final_json_response` to format your final response!',
								},
							},
						},
					},
					inputOverride: {
						ai_memory: [
							[
								{
									json: {
										action: 'loadMemoryVariables',
										values: {
											input: inputMessage,
											system_message: 'You are a helpful assistant',
											formatting_instructions:
												'IMPORTANT: Always call `format_final_json_response` to format your final response!',
										},
									},
								},
							],
						],
					},
					source: [{ previousNode: AGENT_NODE_NAME, previousNodeRun: 0 }],
					error: {
						message: 'Internal error',
						timestamp: 1722591723244,
						name: 'NodeOperationError',
						description: 'Internal error',
						context: {},
						cause: {
							name: 'error',
							message: 'Some error',
						},
					} as ExecutionError,
					metadata: {
						subRun: [
							{
								node: 'Postgres Chat Memory',
								runIndex: 0,
							},
						],
					},
				}),
				createMockNodeExecutionData(AGENT_NODE_NAME, {
					executionStatus: 'error',
					error: {
						level: 'error',
						tags: {
							packageName: 'workflow',
						},
						context: {},
						functionality: 'configuration-node',
						name: 'NodeOperationError',
						timestamp: 1722591723244,
						node: {
							parameters: {
								notice: '',
								sessionIdType: 'fromInput',
								tableName: 'n8n_chat_histories',
							},
							id: '6b9141da-0135-4e9d-94d1-2d658cbf48b5',
							name: 'Postgres Chat Memory',
							type: '@n8n/n8n-nodes-langchain.memoryPostgresChat',
							typeVersion: 1,
							position: [1140, 500],
							credentials: {
								postgres: {
									id: 'RkyZetVpGsSfEAhQ',
									name: 'Postgres account',
								},
							},
						},
						messages: ['database "chat11" does not exist'],
						description: 'Internal error',
						message: 'Internal error',
					} as unknown as ExecutionError,
				}),
			];
		}

		// Helper function to assert logs tab is active
		async function assertLogsTabIsActive(n8n: n8nPage) {
			await expect(n8n.ndv.getOutputDataContainer()).toBeVisible();
			await expect(n8n.ndv.getAiOutputModeToggle()).toBeVisible();

			const radioButtons = n8n.ndv.getAiOutputModeToggle().locator('[role="radio"]');
			await expect(radioButtons).toHaveCount(2);
			await expect(radioButtons.nth(1)).toHaveAttribute('aria-checked', 'true');
		}

		// Helper function to assert error message is visible
		async function assertErrorMessageVisible(n8n: n8nPage) {
			await expect(
				n8n.ndv.getOutputPanel().getByTestId('node-error-message').first(),
			).toBeVisible();
			await expect(
				n8n.ndv.getOutputPanel().getByTestId('node-error-message').first(),
			).toContainText('Error in sub-node');
		}

		test('should open logs tab by default when there was an error', async ({ n8n }) => {
			await setupAgentWorkflowWithPostgresError(n8n);

			const inputMessage = 'Test the code tool';
			const runDataWithError = createPostgresErrorMockData(
				inputMessage,
				MANUAL_CHAT_TRIGGER_NODE_NAME,
			);

			// Execute workflow with chat trigger
			await n8n.canvas.clickManualChatButton();
			await runMockWorkflowExecution(n8n.page, {
				trigger: async () => await n8n.canvas.logsPanel.sendManualChatMessage(inputMessage),
				runData: runDataWithError,
				lastNodeExecuted: AGENT_NODE_NAME,
			});

			// Check that messages and logs are displayed
			const messages = n8n.canvas.getManualChatMessages();
			await expect(messages).toHaveCount(2);
			await expect(messages.first()).toContainText(inputMessage);
			await expect(messages.last()).toContainText('[ERROR: Internal error]');

			await expect(n8n.canvas.getOverviewPanel()).toBeVisible();
			await expect(n8n.canvas.getLogEntries()).toHaveCount(2);
			await expect(n8n.canvas.getSelectedLogEntry()).toHaveText('AI Agent');
			await expect(n8n.canvas.getLogsOutputPanel()).toContainText(AI_MEMORY_POSTGRES_NODE_NAME);

			await n8n.canvas.closeManualChatModal();

			// Open the AI Agent node to see the logs
			await n8n.canvas.openNode(AGENT_NODE_NAME);

			// Assert that logs tab is active and error is displayed
			await assertLogsTabIsActive(n8n);
			await assertErrorMessageVisible(n8n);
		});

		test('should switch to logs tab on error, when NDV is already opened', async ({ n8n }) => {
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

			// Remove the auto-added chat trigger
			await n8n.canvas
				.nodeByName(CHAT_TRIGGER_NODE_DISPLAY_NAME)
				.locator('[data-test-id="delete-node-button"]')
				.click();

			// Set manual trigger to output standard pinned data
			await n8n.canvas.openNode(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			await n8n.ndv.getEditPinnedDataButton().click();
			await n8n.ndv.savePinnedData();
			await n8n.ndv.close();

			// Set up the same workflow components but with manual trigger
			await setupAgentWorkflowWithPostgresError(n8n);

			// Open the AI Agent node
			await n8n.canvas.openNode(AGENT_NODE_NAME);

			const inputMessage = 'Test the code tool';
			const runDataWithError = createPostgresErrorMockData(inputMessage, MANUAL_TRIGGER_NODE_NAME);

			await runMockWorkflowExecution(n8n.page, {
				trigger: async () => await n8n.ndv.execute(),
				runData: runDataWithError,
				lastNodeExecuted: AGENT_NODE_NAME,
			});

			// Assert that logs tab is active and error is displayed
			await assertLogsTabIsActive(n8n);
			await assertErrorMessageVisible(n8n);
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
			await n8n.ndv.execute();

			// Chat modal should now be visible
			await expect(n8n.canvas.getManualChatModal().locator('main')).toBeVisible();

			// Send first message
			await n8n.canvas.logsPanel.sendManualChatMessage('Test');
			await expect(n8n.canvas.getManualChatLatestBotMessage()).toContainText('this_my_field_1');

			// Refresh session
			await n8n.page.getByTestId('refresh-session-button').click();
			await expect(n8n.canvas.getManualChatMessages()).not.toBeAttached();

			// Send another message
			await n8n.canvas.logsPanel.sendManualChatMessage('Another test');
			await expect(n8n.canvas.getManualChatLatestBotMessage()).toContainText('this_my_field_3');
			await expect(n8n.canvas.getManualChatLatestBotMessage()).toContainText('this_my_field_4');
		});
	});
});
