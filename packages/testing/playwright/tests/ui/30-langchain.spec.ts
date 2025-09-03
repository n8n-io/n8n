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

		await n8n.canvas.addLanguageModelNodeToParent(
			AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
			AGENT_NODE_NAME,
			true,
		);

		await n8n.canvas.clickExecuteWorkflowButton();
		await expect(n8n.canvas.getManualChatModal()).toBeHidden();
	});

	test('should remove test workflow button', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });

		await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });

		await n8n.canvas.addNode(AGENT_NODE_NAME);

		await n8n.canvas.addLanguageModelNodeToParent(
			AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
			AGENT_NODE_NAME,
			true,
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
		await n8n.canvas.addLanguageModelNodeToParent(
			AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
			AGENT_NODE_NAME,
			true,
		);

		await n8n.canvas.addMemoryNodeToParent(
			AI_MEMORY_WINDOW_BUFFER_MEMORY_NODE_NAME,
			AGENT_NODE_NAME,
		);

		await n8n.canvas.addToolNodeToParent(AI_TOOL_CALCULATOR_NODE_NAME, AGENT_NODE_NAME);

		await n8n.canvas.addOutputParserNodeToParent(
			AI_OUTPUT_PARSER_AUTO_FIXING_NODE_NAME,
			AGENT_NODE_NAME,
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
			AI_TOOL_CODE_NODE_NAME,
			AI_TOOL_WIKIPEDIA_NODE_NAME,
		];

		for (const tool of tools) {
			await n8n.canvas.addToolNodeToParent(tool, AGENT_NODE_NAME);
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
		await n8n.canvas.addNode(MANUAL_CHAT_TRIGGER_NODE_NAME);

		await n8n.canvas.addNode(AGENT_NODE_NAME);

		await n8n.canvas.addNode(AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME);

		await expect(
			n8n.canvas.connectionBetweenNodes(CHAT_TRIGGER_NODE_DISPLAY_NAME, AGENT_NODE_NAME),
		).toBeAttached();

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
	});

	// The following scenarios require execution mocking (createMockNodeExecutionData / runMockWorkflowExecution)
	// which are not yet implemented for Playwright. They can be enabled once execution mocking utilities are ported.
	test.skip('should be able to open and execute Basic LLM Chain node (pending execution mocks)', async () => {});
	test.skip('should be able to open and execute Agent node (pending execution mocks)', async () => {});
	test.skip('should add and use Manual Chat Trigger node together with Agent node (pending execution mocks)', async () => {});
	test.skip('should show tool info notice if no existing tools were used during execution (pending execution mocks)', async () => {});
	test.skip('should not show tool info notice if tools were used during execution (pending execution mocks)', async () => {});
	test.skip('should execute up to Node 1 when using partial execution (pending execution mocks)', async () => {});
});
