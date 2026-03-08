import {
	AGENT_NODE_NAME,
	AI_TOOL_CALCULATOR_NODE_NAME,
	AI_MEMORY_POSTGRES_NODE_NAME,
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

async function verifyChatMessages(n8n: n8nPage, expectedCount: number, inputMessage?: string) {
	const messages = n8n.canvas.getManualChatMessages();
	await expect(messages).toHaveCount(expectedCount);
	if (inputMessage) {
		await expect(messages.first()).toContainText(inputMessage);
	}
	await expect(messages.last()).toBeVisible();
	return messages;
}

test.use({ capability: 'proxy' });
test.describe('Langchain Integration @capability:proxy', {
	annotation: [
		{ type: 'owner', description: 'AI' },
	],
}, () => {
	test.beforeEach(async ({ n8n, services }) => {
		await services.proxy.clearAllExpectations();
		await services.proxy.loadExpectations('langchain');
		await n8n.canvas.openNewWorkflow();
	});

	// Create a ticket for this for AI team to fix
	test.describe('Error Handling and Logs Display @fixme', () => {
		test.fixme();

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
});
