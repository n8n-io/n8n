import { EDIT_FIELDS_SET_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

const NOTIFICATIONS = {
	WORKFLOW_EXECUTED_SUCCESSFULLY: 'Workflow executed successfully',
};

test.describe(
	'Inject previous execution',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		// TODO(CET-309): the last-successful-execution read covers control-plane executions only,
		// so a workflow on engine v2 has no previous execution to inject.
		test('can map keys from previous execution @engine:v2-pending', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('NDV-debug-generate-data.json');

			await expect(n8n.canvas.getExecuteWorkflowButton()).toBeVisible();

			await n8n.canvas.clickZoomToFitButton();
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY,
			);

			await n8n.page.reload();

			await n8n.canvas.clickNodePlusEndpoint('DebugHelper');
			await expect(n8n.canvas.nodeCreatorSearchBar()).toBeVisible();
			await n8n.canvas.fillNodeCreatorSearchBar(EDIT_FIELDS_SET_NODE_NAME);
			await n8n.canvas.clickNodeCreatorItemName(EDIT_FIELDS_SET_NODE_NAME);
			await n8n.page.keyboard.press('Escape');

			await n8n.canvas.openNode('Edit Fields');

			await expect(n8n.ndv.getInputPanel()).toContainText(
				'The fields below come from the last successful execution.',
			);

			await expect(n8n.ndv.inputPanel.getSchemaItemText('id')).toBeVisible();
			await expect(n8n.ndv.inputPanel.getSchemaItemText('firstName')).toBeVisible();
		});

		// TODO(CET-309): same last-successful-execution gap as above.
		test('can pin data from previous execution @engine:v2-pending', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('NDV-debug-generate-data.json');

			await expect(n8n.canvas.getExecuteWorkflowButton()).toBeVisible();

			await n8n.canvas.clickZoomToFitButton();
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY,
			);

			await n8n.page.reload();
			await n8n.canvas.openNode('DebugHelper');

			await n8n.ndv.getEditPinnedDataButton().click();
			const editor = n8n.ndv.outputPanel.getContentEditableEditor();
			await expect(editor).toContainText('"password":');
			await expect(editor).toContainText('"uid":');
		});
	},
);
