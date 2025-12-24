import { test, expect } from '../../../fixtures/base';
import { capabilities } from '../../../fixtures/capabilities';
import type { n8nPage } from '../../../pages/n8nPage';

// Helper functions for common operations
async function waitForWorkflowSuccess(n8n: n8nPage, timeout = 10000) {
	await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully', {
		timeout,
	});
}

test.use({ addContainerCapability: capabilities.proxy });
test.describe('Langchain Integration @capability:proxy', () => {
	test.beforeEach(async ({ n8n, proxyServer }) => {
		await proxyServer.clearAllExpectations();
		await proxyServer.loadExpectations('langchain');
		await n8n.canvas.openNewWorkflow();
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
			await n8n.canvas.logsPanel.refreshSession();
			await expect(n8n.canvas.logsPanel.getManualChatMessages()).not.toBeAttached();

			// Send another message
			await n8n.canvas.logsPanel.sendManualChatMessage('Another test');
			await expect(n8n.canvas.getManualChatLatestBotMessage()).toContainText('this_my_field_3');
			await expect(n8n.canvas.getManualChatLatestBotMessage()).toContainText('this_my_field_4');
		});
	});
});
