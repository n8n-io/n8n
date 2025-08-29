import { EDIT_FIELDS_SET_NODE_NAME } from '../../config/constants';
import { test, expect } from '../../fixtures/base';

// This test is skipped due to a bug ADO-4046. The Replace Me node is being put on top of the  Edit Fields node. So it's not visible.
test.skip('CAT-726 Node connectors not rendered when nodes inserted on the canvas', () => {
	test('should correctly append a No Op node when Loop Over Items node is added (from add button)', async ({
		n8n,
	}) => {
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow executed successfully',
		);

		await n8n.canvas.addNodeBetweenNodes(
			'When clicking ‘Execute workflow’',
			'Edit Fields',
			'Loop Over Items (Split in Batches)',
		);

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(4);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(4);

		await expect
			.soft(n8n.canvas.connectionBetweenNodes('Loop Over Items', 'Replace Me'))
			.toBeVisible();
		await expect
			.soft(n8n.canvas.connectionBetweenNodes('Edit Fields', 'Loop Over Items'))
			.toBeVisible();
		await expect
			.soft(n8n.canvas.connectionBetweenNodes('Replace Me', 'Loop Over Items'))
			.toBeVisible();
	});
});
