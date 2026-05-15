import { test, expect } from '../../../../../fixtures/base';

const EDIT_FIELDS_NAMES = [
	'Edit Fields0',
	'Edit Fields1',
	'Edit Fields2',
	'Edit Fields3',
	'Edit Fields4',
	'Edit Fields5',
];

test.describe(
	'Subworkflow Extraction',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Subworkflow-extraction-workflow.json');

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(7);
			await n8n.canvas.clickZoomToFitButton();

			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			await n8n.canvas.deselectAll();
		});

		test('does not offer extraction for a single node', async ({ n8n }) => {
			await n8n.canvas.rightClickNode(EDIT_FIELDS_NAMES[0]);

			await expect(n8n.canvas.getContextMenuItem('extract_sub_workflow')).toBeHidden();
		});

		test('should extract all nodes besides trigger, succeed execution, and undo successfully', async ({
			n8n,
		}) => {
			await n8n.canvas.nodeByName(EDIT_FIELDS_NAMES[0]).click();

			await n8n.canvas.extendSelectionWithArrows('right');

			await n8n.canvas.openCanvasContextMenu();
			await n8n.canvas.clickContextMenuAction('extract_sub_workflow');
			await n8n.canvas.convertToSubworkflowModal.waitForModal();
			await n8n.canvas.convertToSubworkflowModal.clickSubmitButton();
			await n8n.canvas.convertToSubworkflowModal.waitForClose();

			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			await n8n.canvas.hitUndo();

			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
		});
	},
);
