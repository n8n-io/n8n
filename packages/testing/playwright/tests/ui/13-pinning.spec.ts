import { test, expect } from '../../fixtures/base';
import type { TestRequirements } from '../../Types';

const NODES = {
	MANUAL_TRIGGER: 'Manual Trigger',
	SCHEDULE_TRIGGER: 'Schedule Trigger',
	WEBHOOK: 'Webhook',
	HTTP_REQUEST: 'HTTP Request',
	PIPEDRIVE: 'Pipedrive',
	EDIT_FIELDS: 'Edit Fields (Set)', // Use the full node name that appears in the Node List, although when it's added to the canvas it's called "Edit Fields"
	CODE: 'Code',
	END: 'End',
};

const webhookTestRequirements: TestRequirements = {
	entry: {
		type: 'imported-workflow',
		workflow: 'Test_workflow_webhook_with_pin_data.json',
	},
};

const pinnedWebhookRequirements: TestRequirements = {
	entry: {
		type: 'imported-workflow',
		workflow: 'Pinned_webhook_node.json',
	},
};

test.describe('Data pinning', () => {
	const maxPinnedDataSize = 16384;

	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
	});

	test.describe('Pin data operations', () => {
		test('should be able to pin node output', async ({ n8n }) => {
			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode(NODES.SCHEDULE_TRIGGER);

			await n8n.ndv.execute();
			await expect(n8n.ndv.getOutputPanel()).toBeVisible();

			const prevValue = await n8n.ndv.getOutputTbodyCell(1, 0).textContent();

			await n8n.ndv.togglePinData();
			await n8n.ndv.close();

			// Execute workflow and verify pinned data persists
			await n8n.canvas.clickExecuteWorkflowButton();
			await n8n.canvas.openNode(NODES.SCHEDULE_TRIGGER);

			await expect(n8n.ndv.getOutputTbodyCell(1, 0)).toHaveText(prevValue ?? '');
		});

		test('should be able to set custom pinned data', async ({ n8n }) => {
			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode(NODES.SCHEDULE_TRIGGER);

			await expect(n8n.ndv.getEditPinnedDataButton()).toBeVisible();
			await expect(n8n.ndv.getPinDataButton()).toBeHidden();

			await n8n.ndv.setPinnedData([{ test: 1 }]);

			await expect(n8n.ndv.getOutputTableRows()).toHaveCount(2);
			await expect(n8n.ndv.getOutputTableHeaders()).toHaveCount(2);
			await expect(n8n.ndv.getOutputTableHeaders().first()).toContainText('test');
			await expect(n8n.ndv.getOutputTbodyCell(1, 0)).toContainText('1');

			await n8n.ndv.close();
			await n8n.canvas.clickSaveWorkflowButton();
			await n8n.canvas.openNode(NODES.SCHEDULE_TRIGGER);

			await expect(n8n.ndv.getOutputTableHeaders().first()).toContainText('test');
			await expect(n8n.ndv.getOutputTbodyCell(1, 0)).toContainText('1');
		});

		test('should display pin data edit button for Webhook node', async ({ n8n }) => {
			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode(NODES.WEBHOOK);

			const runDataHeader = n8n.ndv.getRunDataPaneHeader();
			const editButton = runDataHeader.getByRole('button', { name: 'Edit Output' });
			await expect(editButton).toBeVisible();
		});

		test('should duplicate pinned data when duplicating node', async ({ n8n }) => {
			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode(NODES.SCHEDULE_TRIGGER);
			await n8n.ndv.close();

			await n8n.canvas.addNode(NODES.EDIT_FIELDS);

			await expect(n8n.ndv.getContainer()).toBeVisible();

			await expect(n8n.ndv.getEditPinnedDataButton()).toBeVisible();
			await expect(n8n.ndv.getPinDataButton()).toBeHidden();

			await n8n.ndv.setPinnedData([{ test: 1 }]);
			await n8n.ndv.close();

			await n8n.canvas.duplicateNode('Edit Fields');
			await n8n.canvas.clickSaveWorkflowButton();
			await n8n.canvas.openNode('Edit Fields1');

			await expect(n8n.ndv.getOutputTableHeaders().first()).toContainText('test');
			await expect(n8n.ndv.getOutputTbodyCell(1, 0)).toContainText('1');
		});
	});

	test.describe('Error handling', () => {
		test('should show error when maximum pin data size is exceeded', async ({ n8n }) => {
			await n8n.page.evaluate((maxSize) => {
				(window as { maxPinnedDataSize?: number }).maxPinnedDataSize = maxSize;
			}, maxPinnedDataSize);

			const actualMaxSize = await n8n.page.evaluate(() => {
				return (window as { maxPinnedDataSize?: number }).maxPinnedDataSize;
			});
			expect(actualMaxSize).toBe(maxPinnedDataSize);

			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode(NODES.SCHEDULE_TRIGGER);
			await n8n.ndv.close();

			await n8n.canvas.addNode(NODES.EDIT_FIELDS);

			await expect(n8n.ndv.getContainer()).toBeVisible();
			await expect(n8n.ndv.getEditPinnedDataButton()).toBeVisible();
			await expect(n8n.ndv.getPinDataButton()).toBeHidden();

			const largeData = [{ test: '1'.repeat(maxPinnedDataSize + 1000) }];
			await n8n.ndv.setPinnedData(largeData);

			await expect(
				n8n.notifications.getNotificationByContent(
					'Workflow has reached the maximum allowed pinned data size',
				),
			).toBeVisible();
		});

		test('should show error when pin data JSON is invalid', async ({ n8n }) => {
			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode(NODES.SCHEDULE_TRIGGER);
			await n8n.ndv.close();

			await n8n.canvas.addNode(NODES.EDIT_FIELDS);

			await expect(n8n.ndv.getContainer()).toBeVisible();
			await expect(n8n.ndv.getEditPinnedDataButton()).toBeVisible();
			await expect(n8n.ndv.getPinDataButton()).toBeHidden();

			await n8n.ndv.setPinnedData('[ { "name": "First item", "code": 2dsa }]');

			await expect(
				n8n.notifications.getNotificationByTitle('Unable to save due to invalid JSON'),
			).toBeVisible();
		});
	});

	test.describe('Advanced pinning scenarios', () => {
		test('should be able to reference paired items in node before pinned data', async ({ n8n }) => {
			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode(NODES.MANUAL_TRIGGER);

			await n8n.canvas.addNode(NODES.HTTP_REQUEST);
			await n8n.ndv.setPinnedData([{ http: 123 }]);
			await n8n.ndv.close();

			await n8n.canvas.addNodeWithSubItem(NODES.PIPEDRIVE, 'Create an activity');
			await n8n.ndv.setPinnedData(Array(3).fill({ pipedrive: 123 }));
			await n8n.ndv.close();

			await n8n.canvas.addNode(NODES.EDIT_FIELDS);

			await n8n.ndv.execute();

			await expect(n8n.ndv.getNodeParameters()).toBeVisible();

			await expect(n8n.ndv.getAssignmentCollectionAdd('assignments')).toBeVisible();
			await n8n.ndv.getAssignmentCollectionAdd('assignments').click();
			await n8n.ndv.getAssignmentValue('assignments').getByText('Expression').click();

			const expressionInput = n8n.ndv.getInlineExpressionEditorInput();
			await expressionInput.click();
			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor(`{{ $('${NODES.HTTP_REQUEST}').item`);
			await n8n.page.keyboard.press('Escape');

			const expectedOutput = '[Object: {"json": {"http": 123}, "pairedItem": {"item": 0}}]';
			await expect(n8n.ndv.getParameterInputHint().getByText(expectedOutput)).toBeVisible();
		});

		test('should use pin data in manual webhook executions', async ({ n8n, setupRequirements }) => {
			const result = await setupRequirements(webhookTestRequirements);
			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.getExecuteWorkflowButton()).toHaveText(
				'Waiting for trigger event from Webhook',
			);

			const webhookPath = `/webhook-test/${result?.webhookPath}`;
			const response = await n8n.ndv.makeWebhookRequest(webhookPath);
			expect(response.status()).toBe(200);

			await n8n.canvas.openNode(NODES.END);

			await expect(n8n.ndv.getOutputTableRow(1)).toBeVisible();
			await expect(n8n.ndv.getOutputTableRow(1)).toContainText('pin-overwritten');
		});

		test('should not use pin data in production webhook executions', async ({ api }) => {
			const { webhookPath, workflowId } = await api.workflowApi.importWorkflow(
				'Test_workflow_webhook_with_pin_data.json',
			);

			const webhookResponse = await api.request.get(`/webhook/${webhookPath}`);

			expect(webhookResponse.ok()).toBe(true);

			const execution = await api.workflowApi.waitForExecution(workflowId, 5000);
			expect(execution.status).toBe('success');

			const executionDetails = await api.workflowApi.getExecution(execution.id);
			expect(executionDetails.data).not.toContain('pin-overwritten');
		});

		test('should not show pinned data tooltip', async ({ n8n, setupRequirements }) => {
			await setupRequirements(pinnedWebhookRequirements);
			await n8n.canvas.clickExecuteWorkflowButton();

			await n8n.canvas.getCanvasNodes().first().click();

			const poppers = n8n.ndv.getVisiblePoppers();
			await expect(poppers).toHaveCount(0);
		});
	});
});
