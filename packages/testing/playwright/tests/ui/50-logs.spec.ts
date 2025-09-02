import { test, expect } from '../../fixtures/base';

// Node name constants
const NODES = {
	MANUAL_TRIGGER: "When clicking 'Execute workflow'",
	CODE: 'Code',
	LOOP_OVER_ITEMS: 'Loop Over Items',
	WAIT: 'Wait',
	CODE1: 'Code1',
	SCHEDULE_TRIGGER: 'Schedule Trigger',
	EDIT_FIELDS: 'Edit Fields',
	IF: 'If',
	WAIT_NODE: 'Wait node',
};

test.describe('Logs', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
	});

	test('should populate logs as manual execution progresses', async ({
		n8n,
		setupRequirements,
	}) => {
		await setupRequirements({
			workflow: {
				'Workflow_loop.json': 'Loop Test Workflow',
			},
		});

		await n8n.canvas.clickZoomToFitButton();
		await n8n.logs.openLogsPanel();
		await expect(n8n.logs.getLogEntries()).toHaveCount(0);

		await n8n.canvas.clickExecuteWorkflowButton();
		await expect(n8n.logs.getOverviewStatus().filter({ hasText: 'Running' })).toBeVisible();

		await expect(n8n.logs.getLogEntries()).toHaveCount(4);
		await expect(n8n.logs.getLogEntries().nth(0)).toContainText('Execute workflow');
		await expect(n8n.logs.getLogEntries().nth(1)).toContainText(NODES.CODE);
		await expect(n8n.logs.getLogEntries().nth(2)).toContainText(NODES.LOOP_OVER_ITEMS);
		await expect(n8n.logs.getLogEntries().nth(3)).toContainText(NODES.WAIT);

		await expect(n8n.logs.getLogEntries()).toHaveCount(6);
		await expect(n8n.logs.getLogEntries().nth(4)).toContainText(NODES.LOOP_OVER_ITEMS);
		await expect(n8n.logs.getLogEntries().nth(5)).toContainText(NODES.WAIT);

		await expect(n8n.logs.getLogEntries()).toHaveCount(8);
		await expect(n8n.logs.getLogEntries().nth(6)).toContainText(NODES.LOOP_OVER_ITEMS);
		await expect(n8n.logs.getLogEntries().nth(7)).toContainText(NODES.WAIT);

		await expect(n8n.logs.getLogEntries()).toHaveCount(10);
		await expect(n8n.logs.getLogEntries().nth(8)).toContainText(NODES.LOOP_OVER_ITEMS);
		await expect(n8n.logs.getLogEntries().nth(9)).toContainText(NODES.CODE1);
		await expect(
			n8n.logs.getOverviewStatus().filter({ hasText: /Error in [\d.]+s/ }),
		).toBeVisible();
		await expect(n8n.logs.getSelectedLogEntry()).toContainText(NODES.CODE1); // Errored node is automatically selected
		await expect(n8n.logs.getNodeErrorMessageHeader()).toContainText('test!!! [line 1]');
		await expect(n8n.canvas.getNodeIssuesByName(NODES.CODE1)).toBeVisible();

		await n8n.logs.pressClearExecutionButton();
		await expect(n8n.logs.getLogEntries()).toHaveCount(0);
		await expect(n8n.canvas.getNodeIssuesByName(NODES.CODE1)).not.toBeVisible();
	});

	test('should allow to trigger partial execution', async ({ n8n, setupRequirements }) => {
		await setupRequirements({
			workflow: {
				'Workflow_if.json': 'If Test Workflow',
			},
		});

		await n8n.canvas.clickZoomToFitButton();
		await n8n.logs.openLogsPanel();

		await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful');
		await expect(n8n.logs.getLogEntries()).toHaveCount(6);
		await expect(n8n.logs.getLogEntries().nth(0)).toContainText(NODES.SCHEDULE_TRIGGER);
		await expect(n8n.logs.getLogEntries().nth(1)).toContainText(NODES.CODE);
		await expect(n8n.logs.getLogEntries().nth(2)).toContainText(NODES.EDIT_FIELDS);
		await expect(n8n.logs.getLogEntries().nth(3)).toContainText(NODES.IF);
		await expect(n8n.logs.getLogEntries().nth(4)).toContainText(NODES.EDIT_FIELDS);
		await expect(n8n.logs.getLogEntries().nth(5)).toContainText(NODES.EDIT_FIELDS);

		await n8n.logs.clickTriggerPartialExecutionAtRow(3);
		await expect(n8n.logs.getLogEntries()).toHaveCount(3);
		await expect(n8n.logs.getLogEntries().nth(0)).toContainText(NODES.SCHEDULE_TRIGGER);
		await expect(n8n.logs.getLogEntries().nth(1)).toContainText(NODES.CODE);
		await expect(n8n.logs.getLogEntries().nth(2)).toContainText(NODES.IF);
	});

	// TODO: make it possible to test workflows with AI model end-to-end
	test.skip('should show input and output data in the selected display mode', async ({ n8n }) => {
		// TODO: Add chat workflow requirements when AI functionality is ready
		// await setupRequirements(chatWorkflowRequirements);

		await n8n.canvas.clickZoomToFitButton();
		await n8n.logs.openLogsPanel();

		// Note: This test requires manual chat functionality which may need to be implemented
		// in the Playwright page objects for full migration
		// await chat.sendManualChatMessage('Hi!');
		// await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful');

		await expect(n8n.logs.getLogEntries().nth(2)).toHaveText('E2E Chat Model');
		await n8n.logs.getLogEntries().nth(2).click();

		await expect(n8n.logs.getOutputPanel()).toContainText('Hello from e2e model!!!');
		await n8n.logs.setOutputDisplayMode('table');
		await expect(n8n.logs.getOutputTbodyCell(1, 0)).toContainText(
			'text:Hello from **e2e** model!!!',
		);
		await expect(n8n.logs.getOutputTbodyCell(1, 1)).toContainText('completionTokens:20');
		await n8n.logs.setOutputDisplayMode('schema');
		await expect(n8n.logs.getOutputPanel()).toContainText('generations[0]');
		await expect(n8n.logs.getOutputPanel()).toContainText('Hello from **e2e** model!!!');
		await n8n.logs.setOutputDisplayMode('json');
		await expect(n8n.logs.getOutputPanel()).toContainText('[{"response": {"generations": [');

		await n8n.logs.toggleInputPanel();
		await expect(n8n.logs.getInputPanel()).toContainText('Human: Hi!');
		await n8n.logs.setInputDisplayMode('table');
		await expect(n8n.logs.getInputTbodyCell(1, 0)).toContainText('0:Human: Hi!');
		await n8n.logs.setInputDisplayMode('schema');
		await expect(n8n.logs.getInputPanel()).toContainText('messages[0]');
		await expect(n8n.logs.getInputPanel()).toContainText('Human: Hi!');
		await n8n.logs.setInputDisplayMode('json');
		await expect(n8n.logs.getInputPanel()).toContainText('[{"messages": ["Human: Hi!"],');
	});

	test('should show input and output data of correct run index and branch', async ({
		n8n,
		setupRequirements,
	}) => {
		await setupRequirements({
			workflow: {
				'Workflow_if.json': 'If Test Workflow',
			},
		});

		await n8n.canvas.clickZoomToFitButton();
		await n8n.logs.openLogsPanel();
		await n8n.canvas.clickExecuteWorkflowButton();

		await n8n.logs.clickLogEntryAtRow(2); // Run #1 of 'Edit Fields' node; input is 'Code' node
		await n8n.logs.toggleInputPanel();
		await n8n.logs.setInputDisplayMode('table');
		await expect(n8n.logs.getInputTableRows()).toHaveCount(11);
		await expect(n8n.logs.getInputTbodyCell(1, 0)).toContainText('0');
		await expect(n8n.logs.getInputTbodyCell(10, 0)).toContainText('9');
		await n8n.logs.clickOpenNdvAtRow(2);
		await n8n.ndv.switchInputMode('Table');
		await expect(n8n.ndv.getInputSelect()).toHaveValue('Code ');
		await expect(n8n.ndv.getInputTableRows()).toHaveCount(11);
		await expect(n8n.ndv.getInputTbodyCell(1, 0)).toContainText('0');
		await expect(n8n.ndv.getInputTbodyCell(10, 0)).toContainText('9');
		await expect(n8n.ndv.getOutputRunSelectorInput()).toHaveValue('1 of 3 (10 items)');

		await n8n.ndv.clickBackToCanvasButton();

		await n8n.logs.clickLogEntryAtRow(4); // Run #2 of 'Edit Fields' node; input is false branch of 'If' node
		await expect(n8n.logs.getInputTableRows()).toHaveCount(6);
		await expect(n8n.logs.getInputTbodyCell(1, 0)).toContainText('5');
		await expect(n8n.logs.getInputTbodyCell(5, 0)).toContainText('9');
		await n8n.logs.clickOpenNdvAtRow(4);
		await expect(n8n.ndv.getInputSelect()).toHaveValue('If ');
		await expect(n8n.ndv.getInputTableRows()).toHaveCount(6);
		await expect(n8n.ndv.getInputTbodyCell(1, 0)).toContainText('5');
		await expect(n8n.ndv.getInputTbodyCell(5, 0)).toContainText('9');
		await expect(n8n.ndv.getOutputRunSelectorInput()).toHaveValue('2 of 3 (5 items)');

		await n8n.ndv.clickBackToCanvasButton();

		await n8n.logs.clickLogEntryAtRow(5); // Run #3 of 'Edit Fields' node; input is true branch of 'If' node
		await expect(n8n.logs.getInputTableRows()).toHaveCount(6);
		await expect(n8n.logs.getInputTbodyCell(1, 0)).toContainText('0');
		await expect(n8n.logs.getInputTbodyCell(5, 0)).toContainText('4');
		await n8n.logs.clickOpenNdvAtRow(5);
		await expect(n8n.ndv.getInputSelect()).toHaveValue('If ');
		await expect(n8n.ndv.getInputTableRows()).toHaveCount(6);
		await expect(n8n.ndv.getInputTbodyCell(1, 0)).toContainText('0');
		await expect(n8n.ndv.getInputTbodyCell(5, 0)).toContainText('4');
		await expect(n8n.ndv.getOutputRunSelectorInput()).toHaveValue('3 of 3 (5 items)');
	});

	test('should keep populated logs unchanged when workflow get edits after the execution', async ({
		n8n,
		setupRequirements,
	}) => {
		await setupRequirements({
			workflow: {
				'Workflow_if.json': 'If Test Workflow',
			},
		});

		await n8n.canvas.clickZoomToFitButton();
		await n8n.logs.openLogsPanel();

		await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful');
		await expect(n8n.logs.getLogEntries()).toHaveCount(6);
		await n8n.canvas.disableNode(NODES.EDIT_FIELDS);
		await expect(n8n.logs.getLogEntries()).toHaveCount(6);
		await n8n.canvas.deleteNode(NODES.EDIT_FIELDS);
		await expect(n8n.logs.getLogEntries()).toHaveCount(6);
	});

	// TODO: make it possible to test workflows with AI model end-to-end
	test.skip('should show logs for a past execution', async ({ n8n }) => {
		// TODO: Add chat workflow requirements when AI functionality is ready
		// await setupRequirements(chatWorkflowRequirements);

		await n8n.canvas.clickZoomToFitButton();
		await n8n.logs.openLogsPanel();

		// Note: This test requires manual chat functionality and executions page methods
		// that need to be implemented in the Playwright page objects for full migration

		// TODO: Implement the following when AI functionality is ready:
		// await chat.sendManualChatMessage('Hi!');
		// await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful');
		// await n8n.canvas.openExecutions();
		// await n8n.executions.toggleAutoRefresh();
		// await expect(n8n.executions.getManualChatMessages().nth(0)).toContainText('Hi!');
		// await expect(n8n.executions.getManualChatMessages().nth(1)).toContainText('Hello from e2e model!!!');
		// await expect(n8n.executions.getLogsOverviewStatus().filter({ hasText: /Success in [\d\.]+m?s/ })).toBeVisible();
		// await expect(n8n.executions.getLogEntries()).toHaveCount(3);
		// await expect(n8n.executions.getLogEntries().nth(0)).toContainText('When chat message received');
		// await expect(n8n.executions.getLogEntries().nth(1)).toContainText('AI Agent');
		// await expect(n8n.executions.getLogEntries().nth(2)).toContainText('E2E Chat Model');
	});

	test('should show logs for a workflow with a node that waits for webhook', async ({
		n8n,
		setupRequirements,
	}) => {
		await setupRequirements({
			workflow: {
				'Workflow_wait_for_webhook.json': 'Webhook Test Workflow',
			},
		});

		// Click canvas to deselect nodes
		await n8n.page.locator('[data-test-id="canvas"]').click();
		await n8n.canvas.clickZoomToFitButton();
		await n8n.logs.openLogsPanel();

		await n8n.canvas.clickExecuteWorkflowButton();

		// Wait for nodes to show spinner and waiting state
		await expect(n8n.canvas.getNodesWithSpinner()).toHaveCount(1);
		await expect(n8n.canvas.getWaitingNodes()).toHaveCount(1);
		await expect(n8n.logs.getLogEntries()).toHaveCount(2);
		await expect(n8n.logs.getLogEntries().nth(1)).toContainText(NODES.WAIT_NODE);

		await n8n.canvas.openNode(NODES.WAIT_NODE);
		const webhookUrl = await n8n.ndv.getOutputDataContainer().locator('a').getAttribute('href');
		await n8n.ndv.clickBackToCanvasButton();

		// Trigger the webhook
		if (webhookUrl) {
			const response = await n8n.page.request.get(webhookUrl);
			expect(response.status()).toBe(200);
		}

		await expect(n8n.canvas.getNodesWithSpinner()).not.toBeVisible();
		await expect(n8n.canvas.getWaitingNodes()).not.toBeVisible();
		await expect(
			n8n.logs.getOverviewStatus().filter({ hasText: /Success in [\d\.]+m?s/ }),
		).toBeVisible();
		await n8n.logs.getLogEntries().nth(1).click(); // click selected row to deselect
		await expect(n8n.logs.getLogEntries()).toHaveCount(2);
		await expect(n8n.logs.getLogEntries().nth(1)).toContainText(NODES.WAIT_NODE);
	});
});
