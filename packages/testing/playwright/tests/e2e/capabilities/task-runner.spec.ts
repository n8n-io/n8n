import { CODE_NODE_NAME, MANUAL_TRIGGER_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

/**
 * Task Runner Tests
 *
 * Task runner is always enabled in all container stacks.
 * These tests verify code execution functionality.
 */
test.describe('Task Runner', {
	annotation: [
		{ type: 'owner', description: 'Catalysts' },
	],
}, () => {
	test('should execute Javascript with task runner enabled', async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow executed successfully',
		);
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
	});

	test('should execute Python with task runner enabled', async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.addNode(CODE_NODE_NAME, {
			action: 'Code in Python',
			closeNDV: true,
		});
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow executed successfully',
		);
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
	});
});
