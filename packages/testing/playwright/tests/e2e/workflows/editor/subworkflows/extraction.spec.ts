import { test, expect } from '../../../../../fixtures/base';

const EDIT_FIELDS_NAMES = [
	'Edit Fields0',
	'Edit Fields1',
	'Edit Fields2',
	'Edit Fields3',
	'Edit Fields4',
	'Edit Fields5',
];

test.describe('Subworkflow Extraction', {
	annotation: [
		{ type: 'owner', description: 'Catalysts' },
	],
}, () => {
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
	});

	test.describe('disconnected node extraction (ADO-4679)', () => {
		test.beforeEach(async ({ n8n }) => {
			// Load a workflow with a disconnected node
			await n8n.start.fromImportedWorkflow('Subworkflow-extraction-disconnected.json');

			// Verify we have the trigger, one connected node, and one disconnected node
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
			await n8n.canvas.clickZoomToFitButton();
		});

		test('should extract a disconnected node and connect it properly', async ({ n8n }) => {
			// Test for ADO-4679: Extracting a single disconnected node should:
			// 1. Create Start trigger connected to the node in sub-workflow
			// 2. Allow the Execute Workflow node to be connected to the parent workflow

			// Extract the disconnected node "Edit Fields Disconnected"
			await n8n.canvas.rightClickNode('Edit Fields Disconnected');

			await n8n.canvas.clickContextMenuAction('Convert node to sub-workflow');
			await n8n.canvas.convertToSubworkflowModal.waitForModal();
			await n8n.canvas.convertToSubworkflowModal.clickSubmitButton();
			await n8n.canvas.convertToSubworkflowModal.waitForClose();

			// Verify the Execute Workflow node was created
			const executeWorkflowNode = n8n.canvas.getCanvasNodes().filter({
				hasText: 'Call My Sub-workflow',
			});
			await expect(executeWorkflowNode).toHaveCount(1);

			// Wait for the node to be fully rendered with its input handle
			await n8n.canvas.nodeByName('Call My Sub-workflow').waitFor({ state: 'visible' });

			// Now connect the Execute Workflow node to the trigger manually
			await n8n.canvas.connectNodesByDrag(
				"When clicking 'Execute workflow'",
				'Call My Sub-workflow',
			);

			// Execute and verify the data transformation happened
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			// Open the Execute Workflow node to check the output
			await n8n.canvas.openNode('Call My Sub-workflow');

			// Edit Fields Disconnected has the expression: $json.x + 'al'
			// Input 'l' should produce output 'lal'
			// This proves the Start node was connected to Edit Fields Disconnected in the sub-workflow
			// If the bug exists, the node wouldn't execute and there would be no output
			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('lal');

			await n8n.ndv.close();
		});
	});
});
