import {
	AGENT_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	MANUAL_CHAT_TRIGGER_NODE_NAME,
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
import type { n8nPage } from '../../pages/n8nPage';

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

			await addOpenAILanguageModelWithCredentials(n8n, BASIC_LLM_CHAIN_NODE_NAME);

			await n8n.canvas.openNode(BASIC_LLM_CHAIN_NODE_NAME);
			const inputMessage = 'Hello!';

			await n8n.ndv.execute();
			await executeChatAndWaitForResponse(n8n, inputMessage);

			// Verify chat message appears
			await expect(n8n.canvas.getManualChatLatestBotMessage()).toBeVisible();
		});
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

	test.describe('Tool Usage Notifications', () => {
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

	// Create a ticket for this for AI team to fix
	// eslint-disable-next-line playwright/no-skipped-test
	test.skip('Error Handling and Logs Display', () => {
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

			await n8n.credentialsComposer.createFromNdv({
				password: 'testtesttest',
			});

			await n8n.ndv.getParameterInput('sessionIdType').click();
			await n8n.page.getByRole('option', { name: 'Define below' }).click();
			await n8n.ndv.getParameterInput('sessionKey').locator('input').fill('asdasd');
			await n8n.ndv.clickBackToCanvasButton();

			// Add and configure OpenAI Language Model
			await addOpenAILanguageModelWithCredentials(n8n, AGENT_NODE_NAME);

			await n8n.canvas.clickZoomToFitButton();
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

			// Execute workflow with chat trigger
			await n8n.canvas.clickManualChatButton();
			await executeChatAndWaitForResponse(n8n, inputMessage);

			// Check that messages and logs are displayed
			const messages = await verifyChatMessages(n8n, 2, inputMessage);
			await expect(messages.last()).toContainText(
				'[ERROR: The service refused the connection - perhaps it is offline]',
			);

			await expect(n8n.canvas.logsPanel.getLogEntries().first()).toBeVisible();
			await expect(n8n.canvas.logsPanel.getLogEntries()).toHaveCount(3);
			await expect(n8n.canvas.logsPanel.getSelectedLogEntry()).toHaveText('AI Agent');
			await expect(n8n.canvas.logsPanel.outputPanel.get()).toContainText(
				AI_MEMORY_POSTGRES_NODE_NAME,
			);

			await n8n.canvas.closeManualChatModal();

			// Open the AI Agent node to see the logs
			await n8n.canvas.openNode(AGENT_NODE_NAME);

			// Assert that logs tab is active and error is displayed
			await assertLogsTabIsActive(n8n);
			await assertErrorMessageVisible(n8n);
		});

		test('should switch to logs tab on error, when NDV is already opened', async ({ n8n }) => {
			// Remove the auto-added chat trigger
			await n8n.canvas.addNode(MANUAL_CHAT_TRIGGER_NODE_NAME, { closeNDV: false });

			// Set manual trigger to output standard pinned data
			await n8n.ndv.getEditPinnedDataButton().click();
			await n8n.ndv.savePinnedData();
			await n8n.ndv.close();

			// Set up the same workflow components but with manual trigger
			await setupAgentWorkflowWithPostgresError(n8n);

			// Open the AI Agent node
			await n8n.canvas.openNode(AGENT_NODE_NAME);
			await n8n.ndv.getParameterInput('promptType').click();
			await n8n.page.getByRole('option', { name: 'Define below' }).click();
			await n8n.ndv.getParameterInput('text').locator('textarea').fill('Some text');
			await n8n.ndv.execute();
			await waitForWorkflowSuccess(n8n);

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
			await waitForWorkflowSuccess(n8n);

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
		await n8n.page.getByTestId('refresh-session-button').click();
		await expect(n8n.canvas.getManualChatMessages()).not.toBeAttached();
	});
});
