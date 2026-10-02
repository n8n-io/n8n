import { test, expect } from '../../../../../fixtures/base';
import type { n8nPage } from '../../../../../pages/n8nPage';

// Example of using helper functions inside a test
test.describe(
	'Debug mode',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		// Manual Trigger -> `Error` Code node (disabled) -> `Code`. Toggling the `Error`
		// node decides whether a run fails, so no test here depends on the network.
		const FAILING_WORKFLOW = 'Test_workflow_4_executions_view.json';
		const FAILING_WORKFLOW_TRIGGER = "On clicking 'execute'";

		// Constants to avoid magic strings
		const URLS = {
			SUCCESS: 'https://postman-echo.com/get?foo1=bar1&foo2=bar2',
		};

		const NOTIFICATIONS = {
			EXECUTION_IMPORTED: 'Execution data imported',
			PROBLEM_IN_NODE: 'Problem in node',
			SUCCESSFUL: 'Successful',
			DATA_NOT_IMPORTED: "Some execution data wasn't imported",
		};

		test.beforeEach(async ({ n8n }) => {
			await n8n.api.enableFeature('debugInEditor');
		});

		// Helper function to create basic workflow
		async function createBasicWorkflow(n8n: n8nPage, url: string) {
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('HTTP Request');
			await n8n.ndv.fillParameterInput('URL', url);
			await n8n.canvas.waitForSaveWorkflowCompleted();
			await n8n.ndv.close();
		}

		// Helper function to import the last failed execution for debugging
		async function importLastExecutionForDebugging(n8n: n8nPage) {
			await n8n.canvas.clickExecutionsTab();
			// Select the execution explicitly - the view only auto-selects one if the list
			// is already populated when its first fetch resolves, and never retries.
			await expect(n8n.executions.getFailedExecutionItems().first()).toBeVisible();
			await n8n.executions.clickLastExecutionItem();
			await n8n.executions.clickDebugInEditorButton();
			// Wait on the navigation itself rather than asserting on the URL later: the
			// import pins the trigger's data, and the autosave that follows ~1.5s after
			// routes straight back out of /debug.
			await n8n.page.waitForURL(/\/debug/);
			// The route change lands before the import fetches the execution, so give the
			// toast the same headroom the runs get: CI runs one n8n instance for as many
			// workers as there are cores.
			await n8n.notifications.waitForNotificationAndClose(NOTIFICATIONS.EXECUTION_IMPORTED, {
				timeout: 10_000,
			});
		}

		test('should enter debug mode for failed executions', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow(FAILING_WORKFLOW);
			await n8n.canvas.toggleNodeEnabled('Error');
			await expect(n8n.canvas.disabledNodes()).toHaveCount(0);

			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				NOTIFICATIONS.PROBLEM_IN_NODE,
				{ timeout: 10_000 },
			);
			await importLastExecutionForDebugging(n8n);
			// The execution's data is now pinned onto the editor's canvas. Asserted on the
			// badge rather than a one-shot read of every pinned name: the autosave that
			// follows the import re-renders the canvas, so a snapshot taken mid-render can
			// miss the node that was just pinned.
			await expect(n8n.canvas.getNodePinnedStatusIndicator(FAILING_WORKFLOW_TRIGGER)).toBeVisible();
		});

		test('should exit debug mode after successful execution', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow(FAILING_WORKFLOW);
			await n8n.canvas.toggleNodeEnabled('Error');
			await expect(n8n.canvas.disabledNodes()).toHaveCount(0);

			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				NOTIFICATIONS.PROBLEM_IN_NODE,
				{ timeout: 10_000 },
			);
			await importLastExecutionForDebugging(n8n);

			// Disable the failing node again so the next run succeeds
			await n8n.canvas.toggleNodeEnabled('Error');
			await n8n.canvas.waitForSaveWorkflowCompleted();

			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(NOTIFICATIONS.SUCCESSFUL, {
				timeout: 10_000,
			});
			await expect(n8n.page).not.toHaveURL(/\/debug/);
		});

		test('should handle pinned data conflicts during execution import', async ({ n8n }) => {
			await createBasicWorkflow(n8n, URLS.SUCCESS);
			// Generous timeouts: these runs wait on a real request to an external host
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(NOTIFICATIONS.SUCCESSFUL, {
				timeout: 10_000,
			});
			await n8n.canvasComposer.pinNodeData('HTTP Request');

			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(NOTIFICATIONS.SUCCESSFUL, {
				timeout: 10_000,
			});

			// Go to executions and try to copy execution to editor
			await n8n.canvas.clickExecutionsTab();
			await n8n.executions.clickLastExecutionItem();
			await n8n.executions.clickCopyToEditorButton();

			// Test CANCEL dialog
			await n8n.executions.handlePinnedNodesConfirmation('Cancel');

			// Try again and CONFIRM
			await n8n.executions.clickLastExecutionItem();
			await n8n.executions.clickCopyToEditorButton();
			await n8n.executions.handlePinnedNodesConfirmation('Unpin');

			expect(n8n.page.url()).toContain('/debug');

			// Verify pinned status
			const pinnedNodeNames = await n8n.canvas.getPinnedNodeNames();
			expect(pinnedNodeNames).not.toContain('HTTP Request');
			expect(pinnedNodeNames).toContain('When clicking ‘Execute workflow’');
		});

		test.fixme('should show error for pinned data mismatch', async ({ n8n }) => {
			// Create workflow, execute, and pin data
			await createBasicWorkflow(n8n, URLS.SUCCESS);
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(NOTIFICATIONS.SUCCESSFUL);

			await n8n.canvasComposer.pinNodeData('HTTP Request');
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(NOTIFICATIONS.SUCCESSFUL);

			// Delete node to create mismatch
			await n8n.canvas.deleteNodeByName('HTTP Request');

			// Try to copy execution and verify error
			await attemptCopyToEditor(n8n);
			await n8n.notifications.waitForNotificationAndClose(NOTIFICATIONS.DATA_NOT_IMPORTED);
			expect(n8n.page.url()).toContain('/debug');
		});

		async function attemptCopyToEditor(n8n: n8nPage) {
			await n8n.canvas.clickExecutionsTab();
			await n8n.executions.clickLastExecutionItem();
			await n8n.executions.clickCopyToEditorButton();
		}
	},
);
