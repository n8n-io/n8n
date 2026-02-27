/**
 * Regression test for PAY-4486: Node errors are not cleaned when the actual problem is fixed
 *
 * When a workflow has execution data with errors from a previous run,
 * fixing the problematic node should clear the error indicator.
 * Currently, the error indicator persists even after the node is fixed.
 */

import { test, expect } from '../../../fixtures/base';
import { nanoid } from 'nanoid';

test.describe(
	'PAY-4486: Node error indicator persistence bug',
	{
		annotation: [{ type: 'owner', description: 'Payday' }],
	},
	() => {
		test('should clear error indicator when node configuration is fixed', async ({ n8n }) => {
			const workflowName = `Error Indicator Test ${nanoid()}`;

			// Create a workflow with a Code node that will fail
			await n8n.start.fromBlankCanvas();

			// Add a Manual trigger and a Code node
			await n8n.canvas.addNode('Manual');
			await n8n.canvas.addNode('Code', {
				action: 'Run code',
			});

			// Set the workflow name
			await n8n.canvas.workflowMenu.name.set(workflowName);

			// Configure the Code node with code that will throw an error
			await n8n.canvas.clickNodeByName('Code');
			await n8n.ndv.getters.nodeExecuteButton().waitFor({ state: 'visible' });

			// Set code that will throw an error
			const codeEditor = n8n.ndv.getters.nodeCodeEditorContainer();
			await codeEditor.waitFor({ state: 'visible' });

			// Clear existing code and enter error-throwing code
			await codeEditor.click();
			await n8n.page.keyboard.press('Control+a');
			await n8n.page.keyboard.type('throw new Error("Test error from execution");');

			// Close NDV
			await n8n.ndv.actions.close();

			// Execute the workflow to generate error execution data
			await n8n.canvas.clickExecuteWorkflowButton();

			// Wait for execution to complete and verify error indicator appears
			await expect(n8n.canvas.getNodeIssuesByName('Code')).toBeVisible({
				timeout: 10000,
			});

			// Save the workflow to persist the execution data
			await n8n.canvas.workflowMenu.save();

			// Now fix the node by updating the code to not throw an error
			await n8n.canvas.clickNodeByName('Code');
			await n8n.ndv.getters.nodeExecuteButton().waitFor({ state: 'visible' });

			// Update the code to return valid data
			const codeEditorAgain = n8n.ndv.getters.nodeCodeEditorContainer();
			await codeEditorAgain.waitFor({ state: 'visible' });
			await codeEditorAgain.click();
			await n8n.page.keyboard.press('Control+a');
			await n8n.page.keyboard.type('return [{ json: { fixed: true } }];');

			// Close NDV
			await n8n.ndv.actions.close();

			// BUG: The error indicator should be cleared after fixing the node,
			// but it persists because the old execution data is not cleared
			await expect(n8n.canvas.getNodeIssuesByName('Code')).toBeHidden();
		});

		test('should clear error indicator after successful re-execution', async ({ n8n }) => {
			const workflowName = `Error Indicator Rerun Test ${nanoid()}`;

			// Create a workflow with a node that will fail
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode('Manual');
			await n8n.canvas.addNode('Code', {
				action: 'Run code',
			});

			await n8n.canvas.workflowMenu.name.set(workflowName);

			// Configure the Code node with code that will throw an error
			await n8n.canvas.clickNodeByName('Code');
			await n8n.ndv.getters.nodeExecuteButton().waitFor({ state: 'visible' });

			const codeEditor = n8n.ndv.getters.nodeCodeEditorContainer();
			await codeEditor.waitFor({ state: 'visible' });
			await codeEditor.click();
			await n8n.page.keyboard.press('Control+a');
			await n8n.page.keyboard.type('throw new Error("Test error");');

			await n8n.ndv.actions.close();

			// Execute workflow and verify error
			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.getNodeIssuesByName('Code')).toBeVisible({
				timeout: 10000,
			});

			// Fix the node
			await n8n.canvas.clickNodeByName('Code');
			await n8n.ndv.getters.nodeExecuteButton().waitFor({ state: 'visible' });

			const codeEditorAgain = n8n.ndv.getters.nodeCodeEditorContainer();
			await codeEditorAgain.waitFor({ state: 'visible' });
			await codeEditorAgain.click();
			await n8n.page.keyboard.press('Control+a');
			await n8n.page.keyboard.type('return [{ json: { success: true } }];');

			await n8n.ndv.actions.close();

			// Re-execute the workflow with the fixed code
			await n8n.canvas.clickExecuteWorkflowButton();

			// After successful execution, error indicator should be cleared
			await expect(n8n.canvas.getNodeIssuesByName('Code')).toBeHidden({
				timeout: 10000,
			});

			// Verify success indicator appears instead
			await expect(n8n.canvas.getNodeSuccessStatusIndicator('Code')).toBeVisible();
		});

		test('should not show error indicator when loading workflow with old error data after node is fixed', async ({
			n8n,
			api,
		}) => {
			const workflowName = `Persisted Error Test ${nanoid()}`;

			// Create workflow with error
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode('Manual');
			await n8n.canvas.addNode('Code', {
				action: 'Run code',
			});

			await n8n.canvas.workflowMenu.name.set(workflowName);

			// Add error-throwing code
			await n8n.canvas.clickNodeByName('Code');
			await n8n.ndv.getters.nodeExecuteButton().waitFor({ state: 'visible' });

			const codeEditor = n8n.ndv.getters.nodeCodeEditorContainer();
			await codeEditor.waitFor({ state: 'visible' });
			await codeEditor.click();
			await n8n.page.keyboard.press('Control+a');
			await n8n.page.keyboard.type('throw new Error("Test error");');

			await n8n.ndv.actions.close();

			// Execute and save
			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.getNodeIssuesByName('Code')).toBeVisible({
				timeout: 10000,
			});

			const workflowId = await n8n.canvas.saveWorkflow();

			// Fix the node and save
			await n8n.canvas.clickNodeByName('Code');
			await n8n.ndv.getters.nodeExecuteButton().waitFor({ state: 'visible' });

			const codeEditorFix = n8n.ndv.getters.nodeCodeEditorContainer();
			await codeEditorFix.waitFor({ state: 'visible' });
			await codeEditorFix.click();
			await n8n.page.keyboard.press('Control+a');
			await n8n.page.keyboard.type('return [{ json: { fixed: true } }];');

			await n8n.ndv.actions.close();
			await n8n.canvas.workflowMenu.save();

			// Navigate away and back to the workflow
			await n8n.navigate.toWorkflows();
			await n8n.navigate.to(`/workflow/${workflowId}`);

			// Wait for canvas to load
			await n8n.canvas.getExecuteWorkflowButton().waitFor({ state: 'visible' });

			// BUG: Error indicator persists even though the node is fixed
			// because old execution data is loaded
			await expect(n8n.canvas.getNodeIssuesByName('Code')).toBeHidden();
		});

		test('should clear error indicator when clearing execution data', async ({ n8n }) => {
			const workflowName = `Clear Execution Data Test ${nanoid()}`;

			// Create workflow with error
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode('Manual');
			await n8n.canvas.addNode('Code', {
				action: 'Run code',
			});

			await n8n.canvas.workflowMenu.name.set(workflowName);

			// Add error-throwing code
			await n8n.canvas.clickNodeByName('Code');
			await n8n.ndv.getters.nodeExecuteButton().waitFor({ state: 'visible' });

			const codeEditor = n8n.ndv.getters.nodeCodeEditorContainer();
			await codeEditor.waitFor({ state: 'visible' });
			await codeEditor.click();
			await n8n.page.keyboard.press('Control+a');
			await n8n.page.keyboard.type('throw new Error("Test error");');

			await n8n.ndv.actions.close();

			// Execute workflow to generate error
			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.getNodeIssuesByName('Code')).toBeVisible({
				timeout: 10000,
			});

			// Fix the node configuration
			await n8n.canvas.clickNodeByName('Code');
			await n8n.ndv.getters.nodeExecuteButton().waitFor({ state: 'visible' });

			const codeEditorFix = n8n.ndv.getters.nodeCodeEditorContainer();
			await codeEditorFix.waitFor({ state: 'visible' });
			await codeEditorFix.click();
			await n8n.page.keyboard.press('Control+a');
			await n8n.page.keyboard.type('return [{ json: { fixed: true } }];');

			await n8n.ndv.actions.close();

			// Clear execution data explicitly
			await n8n.canvas.clearExecutionData();

			// After clearing execution data, error indicator should be gone
			await expect(n8n.canvas.getNodeIssuesByName('Code')).toBeHidden();
		});
	},
);
