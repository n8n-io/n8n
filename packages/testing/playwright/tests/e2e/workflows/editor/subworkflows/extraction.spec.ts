import { test, expect } from '../../../../../fixtures/base';

const EDIT_FIELDS_NAMES = [
	'Edit Fields0',
	'Edit Fields1',
	'Edit Fields2',
	'Edit Fields3',
	'Edit Fields4',
	'Edit Fields5',
];

test.describe('Subworkflow Extraction', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Subworkflow-extraction-workflow.json');

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(7);
		await n8n.canvas.clickZoomToFitButton();

		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow executed successfully',
		);

		await n8n.canvas.deselectAll();
	});

	test.describe('can extract a valid selection and still execute the workflow', () => {
		test('should extract a node and succeed execution, and then undo and succeed executions', async ({
			n8n,
		}) => {
			for (const name of EDIT_FIELDS_NAMES) {
				await n8n.canvas.rightClickNode(name);

				await n8n.canvas.clickContextMenuAction('Convert node to sub-workflow');
				await n8n.canvas.convertToSubworkflowModal.waitForModal();
				await n8n.canvas.convertToSubworkflowModal.clickSubmitButton();
				await n8n.canvas.convertToSubworkflowModal.waitForClose();

				await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
					'Workflow executed successfully',
				);
			}

			for (let i = 0; i < EDIT_FIELDS_NAMES.length; i++) {
				await n8n.canvas.hitUndo();

				await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
					'Workflow executed successfully',
				);
			}
		});

		test('should extract all nodes besides trigger and succeed execution', async ({ n8n }) => {
			await n8n.canvas.nodeByName(EDIT_FIELDS_NAMES[0]).click();

			await n8n.canvas.extendSelectionWithArrows('right');

			await n8n.canvas.openCanvasContextMenu();
			await n8n.canvas.clickContextMenuAction('Convert 6 nodes to sub-workflow');
			await n8n.canvas.convertToSubworkflowModal.waitForModal();
			await n8n.canvas.convertToSubworkflowModal.clickSubmitButton();
			await n8n.canvas.convertToSubworkflowModal.waitForClose();

			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
		});

		test('should extract a disconnected node and connect it properly (ADO-4679)', async ({
			n8n,
		}) => {
			// Test for ADO-4679: Extracting a single disconnected node should:
			await n8n.canvas.rightClickNode(EDIT_FIELDS_NAMES[1]);

			await n8n.canvas.clickContextMenuAction('Convert node to sub-workflow');
			await n8n.canvas.convertToSubworkflowModal.waitForModal();
			await n8n.canvas.convertToSubworkflowModal.clickSubmitButton();
			await n8n.canvas.convertToSubworkflowModal.waitForClose();

			const executeWorkflowNode = n8n.canvas.getCanvasNodes().filter({
				hasText: 'My Sub-workflow',
			});
			await expect(executeWorkflowNode).toHaveCount(1);

			await n8n.canvas.connectNodesByDrag("When clicking 'Execute workflow'", 'My Sub-workflow');

			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			await n8n.canvas.openNode('My Sub-workflow');

			// Edit Fields1 has the expression: $json.x + 'a' + $('When clicking 'Execute workflow'').item.json.x
			// Input 'l' should produce output containing 'la' + 'l' = 'lal'
			// This proves the Start node was connected to Edit Fields1 in the sub-workflow
			// If the bug exists, the node wouldn't execute and there would be no output
			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('lal');

			await n8n.ndv.close();
		});
	});
});
