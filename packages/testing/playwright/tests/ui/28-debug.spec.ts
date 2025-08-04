import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';

// Example of using helper functions inside a test
test.describe('Debug mode', () => {
	// Constants to avoid magic strings
	const URLS = {
		FAILING: 'https://foo.bar',
		SUCCESS: 'https://postman-echo.com/get?foo1=bar1&foo2=bar2',
	};

	const NOTIFICATIONS = {
		WORKFLOW_CREATED: 'Workflow successfully created',
		EXECUTION_IMPORTED: 'Execution data imported',
		PROBLEM_IN_NODE: 'Problem in node',
		SUCCESSFUL: 'Successful',
		DATA_NOT_IMPORTED: "Some execution data wasn't imported",
	};

	test.beforeEach(async ({ api, n8n }) => {
		await api.enableFeature('debugInEditor');
		await n8n.goHome();
	});

	// Helper function to create basic workflow
	async function createBasicWorkflow(n8n: n8nPage, url = URLS.FAILING) {
		await n8n.workflows.clickAddWorkflowButton();
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('HTTP Request');
		await n8n.ndv.fillParameterInput('URL', url);
		await n8n.ndv.close();
		await n8n.canvas.clickSaveWorkflowButton();
		await n8n.notifications.waitForNotificationAndClose(NOTIFICATIONS.WORKFLOW_CREATED);
	}

	// Helper function to import execution for debugging
	async function importExecutionForDebugging(n8n: n8nPage) {
		await n8n.canvas.clickExecutionsTab();
		await n8n.executions.clickDebugInEditorButton();
		await n8n.notifications.waitForNotificationAndClose(NOTIFICATIONS.EXECUTION_IMPORTED);
	}

	test('should enter debug mode for failed executions', async ({ n8n }) => {
		await createBasicWorkflow(n8n, URLS.FAILING);
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(NOTIFICATIONS.PROBLEM_IN_NODE);
		await importExecutionForDebugging(n8n);
		expect(n8n.page.url()).toContain('/debug');
	});

	test('should exit debug mode after successful execution', async ({ n8n }) => {
		await createBasicWorkflow(n8n, URLS.FAILING);
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(NOTIFICATIONS.PROBLEM_IN_NODE);
		await importExecutionForDebugging(n8n);

		await n8n.canvas.openNode('HTTP Request');
		await n8n.ndv.fillParameterInput('URL', URLS.SUCCESS);
		await n8n.ndv.close();
		await n8n.canvas.clickSaveWorkflowButton();

		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(NOTIFICATIONS.SUCCESSFUL);
		expect(n8n.page.url()).not.toContain('/debug');
	});

	test('should handle pinned data conflicts during execution import', async ({ n8n }) => {
		await createBasicWorkflow(n8n, URLS.SUCCESS);
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(NOTIFICATIONS.SUCCESSFUL);
		await n8n.canvasComposer.pinNodeData('HTTP Request');

		await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful');

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

	test('should show error for pinned data mismatch', async ({ n8n }) => {
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
});
