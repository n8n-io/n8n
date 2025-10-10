import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';

const NODE_NAMES = {
	PROCESS_THE_DATA: 'Process The Data',
	START_ON_SCHEDULE: 'Start on Schedule',
	EDIT_FIELDS: 'Edit Fields',
	IF: 'If',
	NO_OP_2: 'NoOp2',
	WEBHOOK: 'Webhook',
	TEST_EXPRESSION: 'Test Expression',
};

const NOTIFICATIONS = {
	WORKFLOW_EXECUTED_SUCCESSFULLY: 'Workflow executed successfully',
	EXECUTION_STOPPED: 'Execution stopped',
	EXECUTION_DELETED: 'Execution deleted',
};

const TIMEOUTS = {
	NODE_SUCCESS_WAIT: 5000,
};

/**
 * Helper function to assert node execution states (success/running indicators)
 */
async function assertNodeExecutionStates(
	n8n: n8nPage,
	checks: Array<{
		nodeName: string;
		success?: 'visible' | 'hidden';
		running?: 'visible' | 'hidden';
	}>,
) {
	for (const check of checks) {
		if (check.success !== undefined) {
			const assertion = check.success === 'visible' ? 'toBeVisible' : 'toBeHidden';
			await expect(n8n.canvas.getNodeSuccessStatusIndicator(check.nodeName))[assertion]();
		}
		if (check.running !== undefined) {
			const assertion = check.running === 'visible' ? 'toBeVisible' : 'toBeHidden';
			await expect(n8n.canvas.getNodeRunningStatusIndicator(check.nodeName))[assertion]();
		}
	}
}

test.describe('Execution', () => {
	test('should test manual workflow', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Manual_wait_set.json');

		await expect(n8n.canvas.getExecuteWorkflowButton()).toBeVisible();
		await expect(n8n.canvas.clearExecutionDataButton()).toBeHidden();
		await expect(n8n.canvas.stopExecutionButton()).toBeHidden();
		await expect(n8n.canvas.stopExecutionWaitingForWebhookButton()).toBeHidden();

		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.clickExecuteWorkflowButton();

		await expect(n8n.canvas.getExecuteWorkflowButtonSpinner()).toBeVisible();
		await expect(n8n.canvas.clearExecutionDataButton()).toBeHidden();
		await expect(n8n.canvas.stopExecutionButton()).toBeVisible();
		await expect(n8n.canvas.stopExecutionWaitingForWebhookButton()).toBeHidden();

		await assertNodeExecutionStates(n8n, [
			{ nodeName: 'Manual', success: 'visible' },
			{ nodeName: 'Wait', success: 'hidden', running: 'visible' },
			{ nodeName: 'Set', success: 'hidden' },
		]);

		await assertNodeExecutionStates(n8n, [
			{ nodeName: 'Manual', success: 'visible' },
			{ nodeName: 'Wait', success: 'visible' },
			{ nodeName: 'Set', success: 'visible' },
		]);

		await expect(n8n.canvas.getNodeSuccessStatusIndicator('Wait')).toBeVisible({
			timeout: TIMEOUTS.NODE_SUCCESS_WAIT,
		});

		await n8n.notifications.waitForNotificationAndClose(
			NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY,
		);

		await expect(n8n.canvas.clearExecutionDataButton()).toBeVisible();
		await n8n.canvas.clearExecutionData();
		await expect(n8n.canvas.clearExecutionDataButton()).toBeHidden();
	});

	test('should test manual workflow stop', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Manual_wait_set.json');

		await expect(n8n.canvas.getExecuteWorkflowButton()).toBeVisible();
		await expect(n8n.canvas.clearExecutionDataButton()).toBeHidden();
		await expect(n8n.canvas.stopExecutionButton()).toBeHidden();
		await expect(n8n.canvas.stopExecutionWaitingForWebhookButton()).toBeHidden();

		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.clickExecuteWorkflowButton();

		await expect(n8n.canvas.getExecuteWorkflowButtonSpinner()).toBeVisible();
		await expect(n8n.canvas.clearExecutionDataButton()).toBeHidden();
		await expect(n8n.canvas.stopExecutionButton()).toBeVisible();
		await expect(n8n.canvas.stopExecutionWaitingForWebhookButton()).toBeHidden();

		await assertNodeExecutionStates(n8n, [
			{ nodeName: 'Manual', success: 'visible' },
			{ nodeName: 'Wait', running: 'visible' },
		]);

		await n8n.canvas.stopExecutionButton().click();

		await n8n.notifications.waitForNotificationAndClose(NOTIFICATIONS.EXECUTION_STOPPED);

		await assertNodeExecutionStates(n8n, [
			{ nodeName: 'Manual', success: 'visible' },
			{ nodeName: 'Wait', running: 'hidden' },
			{ nodeName: 'Set', success: 'hidden' },
		]);

		await expect(n8n.canvas.clearExecutionDataButton()).toBeVisible();
		await n8n.canvas.clearExecutionData();
		await expect(n8n.canvas.clearExecutionDataButton()).toBeHidden();
	});

	test('should test webhook workflow', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Webhook_wait_set.json');

		await expect(n8n.canvas.getExecuteWorkflowButton()).toBeVisible();
		await expect(n8n.canvas.clearExecutionDataButton()).toBeHidden();
		await expect(n8n.canvas.stopExecutionButton()).toBeHidden();
		await expect(n8n.canvas.stopExecutionWaitingForWebhookButton()).toBeHidden();

		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.clickExecuteWorkflowButton();

		await expect(n8n.canvas.getExecuteWorkflowButtonSpinner()).toBeVisible();
		await expect(n8n.canvas.clearExecutionDataButton()).toBeHidden();
		await expect(n8n.canvas.stopExecutionButton()).toBeHidden();
		await expect(n8n.canvas.stopExecutionWaitingForWebhookButton()).toBeVisible();

		await n8n.canvas.openNode('Webhook');
		await n8n.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
		await n8n.page.getByTestId('copy-input').click();
		await n8n.ndv.clickBackToCanvasButton();

		const webhookUrl = await n8n.page.evaluate(() => navigator.clipboard.readText());
		const response = await n8n.page.request.get(webhookUrl);
		expect(response.status()).toBe(200);

		await assertNodeExecutionStates(n8n, [
			{ nodeName: 'Webhook', success: 'visible' },
			{ nodeName: 'Wait', success: 'hidden', running: 'visible' },
			{ nodeName: 'Set', success: 'hidden' },
		]);

		await expect(n8n.canvas.getNodeSuccessStatusIndicator('Wait')).toBeVisible({
			timeout: TIMEOUTS.NODE_SUCCESS_WAIT,
		});
		await assertNodeExecutionStates(n8n, [
			{ nodeName: 'Webhook', success: 'visible' },
			{ nodeName: 'Wait', success: 'visible' },
			{ nodeName: 'Set', success: 'visible' },
		]);

		await n8n.notifications.waitForNotificationAndClose(
			NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY,
		);

		await expect(n8n.canvas.clearExecutionDataButton()).toBeVisible();
		await n8n.canvas.clearExecutionData();
		await expect(n8n.canvas.clearExecutionDataButton()).toBeHidden();
	});

	test('should execute workflow from specific trigger nodes independently', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Two_schedule_triggers.json');

		await n8n.canvas.clickZoomToFitButton();
		await expect(n8n.canvas.getExecuteWorkflowButton('Trigger A')).toHaveCSS('opacity', '0');
		await expect(n8n.canvas.getExecuteWorkflowButton('Trigger B')).toHaveCSS('opacity', '0');

		await n8n.canvas.nodeByName('Trigger A').hover();
		await expect(n8n.canvas.getExecuteWorkflowButton('Trigger A')).toHaveCSS('opacity', '1');
		await expect(n8n.canvas.getExecuteWorkflowButton('Trigger B')).toHaveCSS('opacity', '0');
		await n8n.canvas.clickExecuteWorkflowButton('Trigger A');

		await n8n.notifications.waitForNotificationAndClose(
			NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY,
		);
		await n8n.canvas.openNode('Edit Fields');
		await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('Trigger A');

		await n8n.ndv.clickBackToCanvasButton();
		await expect(n8n.ndv.getContainer()).toBeHidden();

		await n8n.canvas.nodeByName('Trigger B').hover();
		await expect(n8n.canvas.getExecuteWorkflowButton('Trigger A')).toHaveCSS('opacity', '0');
		await expect(n8n.canvas.getExecuteWorkflowButton('Trigger B')).toHaveCSS('opacity', '1');
		await n8n.canvas.clickExecuteWorkflowButton('Trigger B');

		await n8n.notifications.waitForNotificationAndClose(
			NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY,
		);
		await n8n.canvas.openNode('Edit Fields');
		await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('Trigger B');
	});

	test.describe('execution preview', () => {
		test('when deleting the last execution, it should show empty state', async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addInitialNodeToCanvas('Manual Trigger');
			await n8n.canvas.clickExecuteWorkflowButton();

			await n8n.notifications.waitForNotification(NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY);

			await n8n.canvas.openExecutions();

			await n8n.executions.deleteExecutionInPreview();

			await expect(n8n.executions.getSuccessfulExecutionItems()).toHaveCount(0);
			await n8n.notifications.waitForNotificationAndClose(NOTIFICATIONS.EXECUTION_DELETED);
		});
	});

	/**
	 * @TODO New Canvas: Different classes for pinned states on edges and nodes
	 */
	// eslint-disable-next-line n8n-local-rules/no-skipped-tests
	test.describe.skip('connections should be colored differently for pinned data', () => {
		test('when executing the workflow', async () => {
			// Not yet migrated - waiting for New Canvas implementation
		});

		test('when executing a node', async () => {
			// Not yet migrated - waiting for New Canvas implementation
		});

		test('when connecting pinned node by output drag and drop', async () => {
			// Not yet migrated - waiting for New Canvas implementation
		});

		test('when connecting pinned node after adding an unconnected node', async () => {
			// Not yet migrated - waiting for New Canvas implementation
		});
	});

	test('should send proper payload for node rerun', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Multiple_trigger_node_rerun.json');
		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.clickExecuteWorkflowButton();
		await expect(n8n.canvas.clearExecutionDataButton()).toBeVisible();

		const payload = await n8n.executionsComposer.executeNodeAndCapturePayload(
			NODE_NAMES.PROCESS_THE_DATA,
		);

		expect(payload).toHaveProperty('runData');
		expect(payload.runData).toBeInstanceOf(Object);
		expect(payload.runData).toEqual({
			[NODE_NAMES.START_ON_SCHEDULE]: expect.any(Array),
			[NODE_NAMES.EDIT_FIELDS]: expect.any(Array),
			[NODE_NAMES.PROCESS_THE_DATA]: expect.any(Array),
		});
	});

	test('should send proper payload for manual node run', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Check_manual_node_run_for_pinned_and_rundata.json');
		await n8n.canvas.clickZoomToFitButton();

		const firstPayload = await n8n.executionsComposer.executeNodeAndCapturePayload(NODE_NAMES.IF);

		expect(firstPayload).not.toHaveProperty('runData');
		expect(firstPayload).toHaveProperty('workflowData');
		expect(firstPayload.workflowData).toBeInstanceOf(Object);
		expect(firstPayload.workflowData).toHaveProperty('pinData');
		expect(firstPayload.workflowData.pinData).toBeInstanceOf(Object);
		expect(firstPayload.workflowData.pinData).toEqual({
			[NODE_NAMES.WEBHOOK]: expect.anything(),
		});

		await expect(n8n.canvas.clearExecutionDataButton()).toBeVisible();

		const secondPayload = await n8n.executionsComposer.executeNodeAndCapturePayload(
			NODE_NAMES.NO_OP_2,
		);

		expect(secondPayload).toHaveProperty('runData');
		expect(secondPayload.runData).toBeInstanceOf(Object);
		expect(secondPayload).toHaveProperty('workflowData');
		expect(secondPayload.workflowData).toBeInstanceOf(Object);
		expect(secondPayload.workflowData).toHaveProperty('pinData');
		expect(secondPayload.workflowData.pinData).toBeInstanceOf(Object);

		expect(secondPayload.runData).toEqual({
			[NODE_NAMES.IF]: expect.any(Array),
			[NODE_NAMES.WEBHOOK]: expect.any(Array),
		});

		expect(secondPayload.workflowData.pinData).toEqual({
			[NODE_NAMES.WEBHOOK]: expect.anything(),
		});
	});

	test('should successfully execute partial executions with nodes attached to the second output', async ({
		n8n,
	}) => {
		await n8n.start.fromImportedWorkflow('Test_Workflow_pairedItem_incomplete_manual_bug.json');
		await n8n.canvas.clickZoomToFitButton();

		const workflowRunPromise = n8n.page.waitForRequest(
			(request) =>
				request.url().includes('/rest/workflows/') &&
				request.url().includes('/run') &&
				request.method() === 'POST',
		);

		await n8n.canvas.clickExecuteWorkflowButton();
		await n8n.canvas.executeNode(NODE_NAMES.TEST_EXPRESSION);
		await workflowRunPromise;

		await expect(n8n.notifications.getErrorNotifications()).toHaveCount(0);
	});

	test('should execute workflow partially up to the node that has issues', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow(
			'Test_workflow_partial_execution_with_missing_credentials.json',
		);

		const workflowRunPromise = n8n.page.waitForRequest(
			(request) =>
				request.url().includes('/rest/workflows/') &&
				request.url().includes('/run') &&
				request.method() === 'POST',
		);

		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.clickExecuteWorkflowButton();

		await workflowRunPromise;

		await assertNodeExecutionStates(n8n, [
			{ nodeName: 'DebugHelper', success: 'visible' },
			{ nodeName: 'Filter', success: 'visible' },
		]);

		await expect(n8n.notifications.getErrorNotifications()).toContainText(
			/Problem in node.*Telegram/,
		);
	});

	test('Paired items should be correctly mapped after passed through the merge node with more than two inputs', async ({
		n8n,
	}) => {
		await n8n.start.fromImportedWorkflow('merge_node_inputs_paired_items.json');

		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.clickExecuteWorkflowButton();

		await n8n.notifications.waitForNotificationAndClose(
			NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY,
		);

		await expect(n8n.canvas.getNodeSuccessStatusIndicator('Edit Fields')).toBeVisible();

		await n8n.canvas.openNode('Edit Fields');
		await n8n.ndv.outputPanel.switchDisplayMode('json');
		await expect(n8n.ndv.outputPanel.get()).toContainText('Branch 1 Value');
		await expect(n8n.ndv.outputPanel.get()).toContainText('Branch 2 Value');
		await expect(n8n.ndv.outputPanel.get()).toContainText('Branch 3 Value');
	});
});
