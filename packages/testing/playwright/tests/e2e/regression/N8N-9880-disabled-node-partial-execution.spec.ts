import { expect, test } from '../../../fixtures/base';

/**
 * Regression test for N8N-9880
 *
 * Bug: Partial execution stops at disabled node instead of passing through
 *
 * Expected: When executing "up to" a node after a disabled node,
 * the execution should pass through the disabled node and continue.
 *
 * Actual: Execution stops at the disabled node, leaving subsequent nodes unexecuted.
 */
test.describe(
	'N8N-9880 - Partial execution with disabled nodes',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'issue', description: 'https://linear.app/n8n/issue/N8N-9880' },
		],
	},
	() => {
		test('should pass through disabled node during partial execution', async ({ n8n }) => {
			// ARRANGE - Import workflow with a disabled node in the middle
			await n8n.start.fromImportedWorkflow('N8N-9880-disabled-node-partial-execution.json');
			await n8n.canvas.clickZoomToFitButton();

			// Verify the workflow structure
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(4);
			await expect(n8n.canvas.disabledNodes()).toHaveCount(1);

			// ACT - Execute partial workflow up to the final node
			// This should bypass the disabled node and execute the final node
			await n8n.canvas.executeNode('Final Node');

			// ASSERT - Verify the final node executed successfully
			// The disabled node should be skipped, not block execution
			await expect(n8n.canvas.getNodeSuccessStatusIndicator('Final Node')).toBeVisible();

			// Verify the disabled node was not executed (no output data)
			await n8n.canvas.openNode('Disabled Node');
			await expect(n8n.ndv.getNodeRunSuccessIndicator()).toBeHidden();
			await expect(n8n.ndv.outputPanel.getNoDataContainer()).toBeVisible();
			await n8n.ndv.close();

			// Verify the final node has the expected output
			await n8n.canvas.openNode('Final Node');
			await expect(n8n.ndv.getNodeRunSuccessIndicator()).toBeVisible();
			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toHaveText('test data');
			await n8n.ndv.close();
		});

		test('should pass through multiple consecutive disabled nodes during partial execution', async ({
			n8n,
		}) => {
			// ARRANGE - Create workflow with multiple disabled nodes
			await n8n.navigate.toWorkflow('new');

			// Add manual trigger
			await n8n.nodeCreator.openNodeCreator();
			await n8n.nodeCreator.selectNode('When clicking "Test workflow"');

			// Add first active node
			await n8n.canvas.addNodeToCanvas('Edit Fields', {
				keepNodeCreatorOpen: false,
				withDefaultConnection: true,
			});
			await n8n.canvas.openNode('Edit Fields');
			await n8n.ndv.clickAssignmentCollectionDropArea();
			await n8n.ndv.close();

			// Add first disabled node
			await n8n.canvas.addNodeToCanvas(
				'Edit Fields',
				{ keepNodeCreatorOpen: false, withDefaultConnection: true },
				'Edit Fields',
			);
			await n8n.canvas.getNodeByName('Edit Fields1').click();
			await n8n.canvas.nodeDisableButton('Edit Fields1').click();

			// Add second disabled node
			await n8n.canvas.addNodeToCanvas(
				'Edit Fields',
				{ keepNodeCreatorOpen: false, withDefaultConnection: true },
				'Edit Fields1',
			);
			await n8n.canvas.getNodeByName('Edit Fields2').click();
			await n8n.canvas.nodeDisableButton('Edit Fields2').click();

			// Add final active node
			await n8n.canvas.addNodeToCanvas(
				'Edit Fields',
				{ keepNodeCreatorOpen: false, withDefaultConnection: true },
				'Edit Fields2',
			);

			// Verify setup
			await expect(n8n.canvas.disabledNodes()).toHaveCount(2);

			// ACT - Execute partial workflow up to final node
			await n8n.canvas.executeNode('Edit Fields3');

			// ASSERT - Final node should execute successfully
			await expect(n8n.canvas.getNodeSuccessStatusIndicator('Edit Fields3')).toBeVisible();

			// Both disabled nodes should not be executed
			await expect(n8n.canvas.getNodeSuccessStatusIndicator('Edit Fields1')).toBeHidden();
			await expect(n8n.canvas.getNodeSuccessStatusIndicator('Edit Fields2')).toBeHidden();

			// First node should have executed
			await expect(n8n.canvas.getNodeSuccessStatusIndicator('Edit Fields')).toBeVisible();
		});

		test('should handle disabled node with inputs during partial execution', async ({ n8n }) => {
			// ARRANGE
			await n8n.start.fromImportedWorkflow('N8N-9880-disabled-node-partial-execution.json');
			await n8n.canvas.clickZoomToFitButton();

			// First, execute the full workflow to populate data
			await n8n.canvas.clickExecuteWorkflowButton();

			// Wait for execution to complete
			await expect(n8n.canvas.getNodeSuccessStatusIndicator('First Node')).toBeVisible();

			// Now disable the middle node
			await n8n.canvas.getNodeByName('Disabled Node').click();
			await n8n.canvas.nodeDisableButton('Disabled Node').click();

			// Clear execution data to simulate fresh partial execution
			await n8n.canvas.clearExecutionData();

			// ACT - Execute partial workflow up to final node
			await n8n.canvas.executeNode('Final Node');

			// ASSERT - Final node should execute
			await expect(n8n.canvas.getNodeSuccessStatusIndicator('Final Node')).toBeVisible();

			// Verify disabled node shows no execution
			await n8n.canvas.openNode('Disabled Node');
			await expect(n8n.ndv.getNodeRunSuccessIndicator()).toBeHidden();
			await n8n.ndv.close();

			// The bug from the video: disabled node should NOT show input items
			// without output items when execution bypasses it
			await n8n.canvas.openNode('Final Node');
			await expect(n8n.ndv.getNodeRunSuccessIndicator()).toBeVisible();
		});
	},
);
