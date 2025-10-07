import { CODE_NODE_NAME, MANUAL_TRIGGER_NODE_NAME } from '../../config/constants';
import { test, expect } from '../../fixtures/base';

/**
 * Task Runner Capability Tests
 *
 * These tests require the task runner container to be running.
 * Use @capability:task-runner tag to ensure they only run in task runner mode.
 */
test.describe('Task Runner Capability @capability:task-runner', () => {
	test('should execute Javascript with task runner enabled', async ({ n8n }) => {
		await n8n.goHome();
		await n8n.workflows.addResource.workflow();
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow executed successfully',
		);
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
	});

	test('should execute Python with task runner enabled', async ({ n8n }) => {
		await n8n.goHome();
		await n8n.workflows.addResource.workflow();
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in Python (Beta)', closeNDV: true });
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow executed successfully',
		);
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
	});
});
