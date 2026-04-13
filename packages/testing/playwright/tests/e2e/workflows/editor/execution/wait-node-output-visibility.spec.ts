import { test, expect } from '../../../../../fixtures/base';

/**
 * Regression test for GHC-7707
 *
 * Bug: Since v2.14.0, when a workflow contains a Wait node, the output data
 * of all preceding nodes is not visible in the execution UI until the entire
 * execution completes.
 *
 * Expected behavior: When a workflow is paused on a Wait node, the output
 * of preceding nodes should be immediately visible in the NDV.
 *
 * Actual behavior: No output is shown until the Wait completes and the full
 * execution finishes.
 *
 * Regression introduced by: commit f025a786 (PR #27066)
 *
 * This test should FAIL until the bug is fixed.
 */
test.describe(
	'Wait node - Output visibility regression',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should show output data of nodes before Wait while Wait is running @mode:sqlite', async ({
			n8n,
		}) => {
			// Setup: Import workflow with Manual → Wait → Set
			await n8n.start.fromImportedWorkflow('Manual_wait_set.json');

			await n8n.canvas.clickZoomToFitButton();

			// Execute the workflow
			await n8n.canvas.clickExecuteWorkflowButton();

			// Wait until the Wait node is in running state
			await expect(n8n.canvas.getNodeRunningStatusIndicator('Wait')).toBeVisible();

			// While Wait is running, open the Manual trigger node in NDV
			await n8n.canvas.openNode('Manual');

			// BUG: This assertion should pass but currently fails
			// The output data should be visible immediately while Wait is running
			// but due to the regression, it's not available until execution completes
			await expect(n8n.ndv.outputPanel.getDataContainer()).toBeVisible();

			// Verify that output actually contains data (not just an empty container)
			// Manual trigger should output 1 item
			await expect(n8n.ndv.outputPanel.getItemsCount()).toContainText('1 item');

			// Close NDV
			await n8n.ndv.clickBackToCanvasButton();

			// Wait for execution to complete
			await expect(n8n.canvas.getNodeSuccessStatusIndicator('Wait')).toBeVisible({
				timeout: 5000,
			});
			await expect(n8n.canvas.getNodeSuccessStatusIndicator('Set')).toBeVisible();
		});

		test('should show output data of intermediate nodes before Wait while Wait is running @mode:sqlite', async ({
			n8n,
		}) => {
			// Create a workflow with more nodes: Manual → Code → Wait → Set
			await n8n.start.fromBlankCanvas();

			// Add Manual trigger
			await n8n.canvas.addInitialNodeToCanvas('Manual Trigger', {
				keepNdvOpen: false,
			});

			// Add Code node after Manual trigger
			await n8n.canvas.addNodeToCanvas('Code', {
				keepNdvOpen: true,
			});

			// Configure Code node to output some data
			await n8n.ndv.fillParameterInput('code', 'return [{ value: "test output" }];');
			await n8n.ndv.clickBackToCanvasButton();

			// Add Wait node
			await n8n.canvas.addNodeToCanvas('Wait', {
				keepNdvOpen: true,
			});

			// Configure Wait for 3 seconds
			await n8n.ndv.fillParameterInput('amount', '3');
			await n8n.ndv.clickBackToCanvasButton();

			// Add Set node
			await n8n.canvas.addNodeToCanvas('Set', {
				keepNdvOpen: false,
			});

			// Execute the workflow
			await n8n.canvas.clickExecuteWorkflowButton();

			// Wait until the Wait node is in running state
			await expect(n8n.canvas.getNodeRunningStatusIndicator('Wait')).toBeVisible();

			// While Wait is running, open the Code node in NDV
			await n8n.canvas.openNode('Code');

			// BUG: This assertion should pass but currently fails
			// The Code node output should be visible while Wait is running
			await expect(n8n.ndv.outputPanel.getDataContainer()).toBeVisible();

			// Verify the output contains our test data
			await expect(n8n.ndv.outputPanel.getItemsCount()).toContainText('1 item');

			// Switch to JSON view to verify the actual data
			await n8n.ndv.outputPanel.switchDisplayMode('json');
			await expect(n8n.ndv.outputPanel.get()).toContainText('test output');

			// Close NDV
			await n8n.ndv.clickBackToCanvasButton();

			// Wait for execution to complete
			await expect(n8n.canvas.getNodeSuccessStatusIndicator('Wait')).toBeVisible({
				timeout: 5000,
			});
			await expect(n8n.canvas.getNodeSuccessStatusIndicator('Set')).toBeVisible();
		});
	},
);
