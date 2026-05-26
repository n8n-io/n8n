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

		test('should extract a single node, succeed execution, and undo successfully', async ({
			n8n,
		}) => {
			await n8n.canvas.rightClickNode(EDIT_FIELDS_NAMES[0]);

			await expect(n8n.canvas.getContextMenuItem('extract_sub_workflow')).toBeVisible();
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

		test.describe('disconnected branch extraction (ADO-4679)', () => {
			test.beforeEach(async ({ n8n }) => {
				await n8n.start.fromImportedWorkflow('Subworkflow-extraction-disconnected.json');

				await expect(n8n.canvas.getCanvasNodes()).toHaveCount(4);
				await n8n.canvas.clickZoomToFitButton();
			});

			test('should extract a disconnected branch and connect it properly', async ({ n8n }) => {
				await n8n.canvas.nodeByName('Edit Fields Disconnected 1').click();
				await n8n.canvas.extendSelectionWithArrows('right');

				await n8n.canvas.openCanvasContextMenu();
				await n8n.canvas.clickContextMenuAction('extract_sub_workflow');
				await n8n.canvas.convertToSubworkflowModal.waitForModal();
				await n8n.canvas.convertToSubworkflowModal.clickSubmitButton();
				await n8n.canvas.convertToSubworkflowModal.waitForClose();

				const executeWorkflowNode = n8n.canvas.getCanvasNodes().filter({
					hasText: 'Call My Sub-workflow',
				});
				await expect(executeWorkflowNode).toHaveCount(1);

				await n8n.canvas.nodeByName('Call My Sub-workflow').waitFor({ state: 'visible' });
				await n8n.canvas.connectNodesByDrag(
					"When clicking 'Execute workflow'",
					'Call My Sub-workflow',
				);

				await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
					'Workflow executed successfully',
				);

				await n8n.canvas.openNode('Call My Sub-workflow');
				await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('lal');
				await n8n.ndv.close();
			});
		});
	},
);
