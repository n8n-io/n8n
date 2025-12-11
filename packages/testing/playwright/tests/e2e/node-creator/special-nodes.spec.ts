import { MANUAL_TRIGGER_NODE_DISPLAY_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe('Node Creator Special Nodes', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should correctly append a No Op node when Loop Over Items node is added (from add button)', async ({
		n8n,
	}) => {
		await n8n.canvas.nodeCreator.open();
		await n8n.canvas.nodeCreator.searchFor('Loop Over Items');
		await n8n.canvas.nodeCreator.selectItem('Loop Over Items');
		await n8n.ndv.close();

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(3);
		await expect(n8n.canvas.nodeByName('Loop Over Items')).toBeVisible();
		await expect(n8n.canvas.nodeByName('Replace Me')).toBeVisible();
	});

	test('should correctly append a No Op node when Loop Over Items node is added (from connection)', async ({
		n8n,
	}) => {
		await n8n.canvas.addNode('Manual Trigger');

		await n8n.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
		await n8n.canvas.nodeCreator.searchFor('Loop Over Items');
		await n8n.canvas.nodeCreator.selectItem('Loop Over Items');
		await n8n.ndv.close();

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(3);
		await expect(n8n.canvas.nodeByName('Loop Over Items')).toBeVisible();
		await expect(n8n.canvas.nodeByName('Replace Me')).toBeVisible();
	});

	test('should add a Send and Wait for Response node', async ({ n8n }) => {
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);

		await n8n.canvas.nodeCreator.selectItem('Human in the loop');

		await n8n.canvas.nodeCreator.selectItem('Slack');
		await n8n.ndv.setupHelper.setParameter('operation', 'Send and Wait for Response');
		await n8n.ndv.close();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
	});
});
