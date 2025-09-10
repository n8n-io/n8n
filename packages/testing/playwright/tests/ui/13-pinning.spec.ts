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
	workflow: {
		'Test_workflow_webhook_with_pin_data.json': 'Test',
	},
};

const pinnedWebhookRequirements: TestRequirements = {
	workflow: {
		'Pinned_webhook_node.json': 'Test',
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
			await expect(n8n.ndv.outputPanel.get()).toBeVisible();

			const prevValue = await n8n.ndv.outputPanel.getTbodyCell(0, 0).textContent();

			await n8n.ndv.togglePinData();
			await n8n.ndv.close();

			// Execute workflow and verify pinned data persists
			await n8n.canvas.clickExecuteWorkflowButton();
			await n8n.canvas.openNode(NODES.SCHEDULE_TRIGGER);

			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toHaveText(prevValue ?? '');
		});

		test('should be able to set custom pinned data', async ({ n8n }) => {
			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode(NODES.SCHEDULE_TRIGGER);

			await expect(n8n.ndv.getEditPinnedDataButton()).toBeVisible();
			await expect(n8n.ndv.outputPanel.getPinDataButton()).toBeHidden();

			await n8n.ndv.setPinnedData([{ test: 1 }]);

			await expect(n8n.ndv.outputPanel.getTableRows()).toHaveCount(2);
			await expect(n8n.ndv.outputPanel.getTableHeaders()).toHaveCount(2);
			await expect(n8n.ndv.outputPanel.getTableHeaders().first()).toContainText('test');
			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('1');

			await n8n.ndv.close();
			await n8n.canvas.clickSaveWorkflowButton();
			await n8n.canvas.openNode(NODES.SCHEDULE_TRIGGER);

			await expect(n8n.ndv.outputPanel.getTableHeaders().first()).toContainText('test');
			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('1');
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
			await expect(n8n.ndv.outputPanel.getPinDataButton()).toBeHidden();

			await n8n.ndv.setPinnedData([{ test: 1 }]);
			await n8n.ndv.close();

			await n8n.canvas.duplicateNode('Edit Fields');
			await n8n.canvas.clickSaveWorkflowButton();
			await n8n.canvas.openNode('Edit Fields1');

			await expect(n8n.ndv.outputPanel.getTableHeader(0)).toContainText('test');
			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('1');
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
			await expect(n8n.ndv.outputPanel.getPinDataButton()).toBeHidden();

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
			await expect(n8n.ndv.outputPanel.getPinDataButton()).toBeHidden();

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

			await n8n.canvas.addNode(NODES.PIPEDRIVE, { action: 'Create an activity' });
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
			await setupRequirements(webhookTestRequirements);
			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.getExecuteWorkflowButton()).toHaveText(
				'Waiting for trigger event from Webhook',
			);

			const webhookPath = '/webhook-test/b0d79ddb-df2d-49b1-8555-9fa2b482608f';
			const response = await n8n.ndv.makeWebhookRequest(webhookPath);
			expect(response.status()).toBe(200);

			await n8n.canvas.openNode(NODES.END);

			await expect(n8n.ndv.outputPanel.getTableRow(1)).toBeVisible();
			await expect(n8n.ndv.outputPanel.getTableRow(1)).toContainText('pin-overwritten');
		});

		test('should not use pin data in production webhook executions', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(webhookTestRequirements);
			await expect(n8n.canvas.getWorkflowSaveButton()).toContainText('Saved');
			await n8n.canvas.activateWorkflow();
			const webhookUrl = '/webhook/b0d79ddb-df2d-49b1-8555-9fa2b482608f';
			const response = await n8n.ndv.makeWebhookRequest(webhookUrl);
			expect(response.status(), 'Webhook response is: ' + (await response.text())).toBe(200);

			const responseBody = await response.json();
			expect(responseBody).toEqual({ nodeData: 'pin' });
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
