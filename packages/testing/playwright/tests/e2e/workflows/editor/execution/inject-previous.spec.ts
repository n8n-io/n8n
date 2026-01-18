import { EDIT_FIELDS_SET_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

const NOTIFICATIONS = {
	WORKFLOW_EXECUTED_SUCCESSFULLY: 'Workflow executed successfully',
};

test.describe('Inject previous execution', () => {
	test('can map keys from previous execution', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('NDV-debug-generate-data.json');

		await expect(n8n.canvas.getExecuteWorkflowButton()).toBeVisible();

		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.clickExecuteWorkflowButton();

		await n8n.notifications.waitForNotificationAndClose(
			NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY,
		);

		await n8n.page.reload();

		await n8n.canvas.clickNodePlusEndpoint('DebugHelper');
		await expect(n8n.canvas.nodeCreatorSearchBar()).toBeVisible();
		await n8n.canvas.fillNodeCreatorSearchBar(EDIT_FIELDS_SET_NODE_NAME);
		await n8n.canvas.clickNodeCreatorItemName(EDIT_FIELDS_SET_NODE_NAME);
		await n8n.page.keyboard.press('Escape');

		await n8n.canvas.openNode('Edit Fields');

		expect(await n8n.ndv.getInputPanel().innerText()).toContain(
			'The fields below come from the last successful execution.',
		);

		await expect(n8n.ndv.inputPanel.getSchemaItemText('id')).toBeVisible();
		await expect(n8n.ndv.inputPanel.getSchemaItemText('firstName')).toBeVisible();
	});

	test('can pin data from previous execution', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('NDV-debug-generate-data.json');

		await expect(n8n.canvas.getExecuteWorkflowButton()).toBeVisible();

		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.clickExecuteWorkflowButton();

		await n8n.notifications.waitForNotificationAndClose(
			NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY,
		);

		await n8n.page.reload();
		await n8n.canvas.openNode('DebugHelper');

		await n8n.ndv.getEditPinnedDataButton().click();
		const editor = n8n.ndv.outputPanel.get().locator('[contenteditable="true"]');
		await expect(editor).toContainText('"password":');
		await expect(editor).toContainText('"uid":');
	});
});
