import { nanoid } from 'nanoid';

import {
	CODE_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
} from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

/**
 * Regression test for N8N-9942
 * Bug: Code node error blocks workflow publication after fix
 *
 * When a code node has an execution error (not a configuration error) and then
 * the code is fixed, the workflow should be publishable without needing to clear
 * execution history. Currently, the publish button remains disabled until execution
 * is cleared.
 */
test.describe(
	'Publish workflow after code node error fix',
	{
		annotation: [{ type: 'owner', description: 'Engineering' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
		});

		test('should allow publishing workflow after fixing code node execution error', async ({
			n8n,
		}) => {
			// Related to: https://linear.app/n8n/issue/N8N-9942
			// Step 1: Create a workflow with a Schedule Trigger and Code node
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript' });

			// Step 2: Add code that will cause a runtime execution error
			const errorMessage = `Test error ${nanoid()}`;
			await n8n.ndv.getCodeEditor().fill(`throw new Error('${errorMessage}');`);
			await n8n.canvas.waitForSaveWorkflowCompleted();
			await n8n.ndv.close();

			// Step 3: Execute the workflow and verify it fails
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Problem in node');

			// Step 4: Fix the code in the code node (remove the error)
			await n8n.canvas.openNode('Code in JavaScript');
			await n8n.ndv.getCodeEditor().fill(`return $input.all();`);
			await n8n.canvas.waitForSaveWorkflowCompleted();
			await n8n.ndv.close();

			// Step 5: Workflow should now be publishable
			// The error was an execution error, not a configuration error
			// Expected: publish button should be enabled
			// Actual (bug): publish button remains disabled
			await expect(n8n.canvas.getOpenPublishModalButton()).toBeEnabled();

			// Step 6: Publish the workflow successfully
			await n8n.canvas.publishWorkflow();
			await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();
		});

		test('should allow publishing workflow after clearing execution data (current workaround)', async ({
			n8n,
		}) => {
			// Related to: https://linear.app/n8n/issue/N8N-9942
			// This test shows the current workaround behavior

			// Step 1: Create a workflow with a Schedule Trigger and Code node
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript' });

			// Step 2: Add code that will cause a runtime execution error
			const errorMessage = `Test error ${nanoid()}`;
			await n8n.ndv.getCodeEditor().fill(`throw new Error('${errorMessage}');`);
			await n8n.canvas.waitForSaveWorkflowCompleted();
			await n8n.ndv.close();

			// Step 3: Execute the workflow and verify it fails
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Problem in node');

			// Step 4: Fix the code in the code node (remove the error)
			await n8n.canvas.openNode('Code in JavaScript');
			await n8n.ndv.getCodeEditor().fill(`return $input.all();`);
			await n8n.canvas.waitForSaveWorkflowCompleted();
			await n8n.ndv.close();

			// Step 5: Current state - publish button is disabled (bug)
			await expect(n8n.canvas.getOpenPublishModalButton()).toBeDisabled();

			// Step 6: Clear execution data (workaround)
			await n8n.canvas.clearExecutionData();

			// Step 7: Now the workflow can be published
			await expect(n8n.canvas.getOpenPublishModalButton()).toBeEnabled();
			await n8n.canvas.publishWorkflow();
			await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();
		});

		test('should distinguish between configuration errors and execution errors', async ({
			n8n,
		}) => {
			// Related to: https://linear.app/n8n/issue/N8N-9942
			// This test verifies that configuration errors (missing required fields)
			// should still block publishing, while execution errors should not

			// Step 1: Create a workflow with Schedule Trigger and Code node
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript' });

			// Step 2: Add valid code - workflow should be publishable
			await n8n.ndv.getCodeEditor().fill(`return $input.all();`);
			await n8n.canvas.waitForSaveWorkflowCompleted();
			await n8n.ndv.close();

			// Step 3: Workflow should be publishable (no configuration errors)
			await expect(n8n.canvas.getOpenPublishModalButton()).toBeEnabled();

			// Step 4: Execute with code that will fail
			await n8n.canvas.openNode('Code in JavaScript');
			const errorMessage = `Test error ${nanoid()}`;
			await n8n.ndv.getCodeEditor().fill(`throw new Error('${errorMessage}');`);
			await n8n.canvas.waitForSaveWorkflowCompleted();
			await n8n.ndv.close();

			await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Problem in node');

			// Step 5: After execution error, publish button should still be enabled
			// (execution errors should not block publishing)
			// Expected: publish button enabled
			// Actual (bug): publish button disabled
			await expect(n8n.canvas.getOpenPublishModalButton()).toBeEnabled();
		});
	},
);
