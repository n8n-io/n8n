import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
} from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe('Canvas Node Actions', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
		await n8n.workflows.clickAddWorkflowButton();
	});

	test.describe('Node Search and Add', () => {
		test('should search and add a basic node', async ({ n8n }) => {
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);
			await expect(n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME)).toBeVisible();
		});

		test('should search and add Linear node with action', async ({ n8n }) => {
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.addNode('Linear', { action: 'Create an issue' });

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
			await expect(n8n.canvas.nodeConnections()).toHaveCount(1);
			await expect(n8n.canvas.nodeByName('Create an issue')).toBeVisible();
		});

		test('should search and add Webhook node (no actions)', async ({ n8n }) => {
			await n8n.canvas.addNode('Webhook');

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);
			await expect(n8n.canvas.nodeByName('Webhook')).toBeVisible();
		});

		test('should search and add Jira node with trigger', async ({ n8n }) => {
			await n8n.canvas.addNode('Jira Software', { trigger: 'On issue created' });
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);
			await expect(n8n.canvas.nodeByName('Jira Trigger')).toBeVisible();
		});

		test('should clear search and show all nodes', async ({ n8n }) => {
			await n8n.canvas.clickCanvasPlusButton();
			await n8n.canvas.fillNodeCreatorSearchBar('Linear');
			const searchCount = await n8n.canvas.nodeCreatorNodeItems().count();
			await expect(n8n.canvas.nodeCreatorNodeItems()).toHaveCount(1);

			await n8n.canvas.nodeCreatorSearchBar().clear();
			const nodeCount = await n8n.canvas.nodeCreatorNodeItems().count();
			expect(nodeCount).toBeGreaterThan(searchCount);
		});

		test('should add connected node via plus endpoint', async ({ n8n }) => {
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);

			await n8n.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			await n8n.canvas.fillNodeCreatorSearchBar('Code');
			await n8n.page.keyboard.press('Enter');

			await n8n.canvas.clickNodeCreatorItemName('Code in JavaScript');
			await n8n.page.keyboard.press('Enter');
			await n8n.page.keyboard.press('Escape');

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
			await expect(n8n.canvas.nodeConnections()).toHaveCount(1);
		});

		test('should add disconnected node when nothing selected', async ({ n8n }) => {
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.deselectAll();
			await n8n.canvas.addNode('Code', { action: 'Code in JavaScript', closeNDV: true });
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
			await expect(n8n.canvas.nodeConnections()).toHaveCount(0);
		});
	});

	test.describe('Node Creator Interactions', () => {
		test('should close node creator with escape key', async ({ n8n }) => {
			await n8n.canvas.clickCanvasPlusButton();
			await expect(n8n.canvas.nodeCreatorSearchBar()).toBeVisible();

			await n8n.page.keyboard.press('Escape');
			await expect(n8n.canvas.nodeCreatorSearchBar()).toBeHidden();
		});

		test('should filter nodes by search term', async ({ n8n }) => {
			await n8n.canvas.clickCanvasPlusButton();
			const initialCount = await n8n.canvas.nodeCreatorNodeItems().count();
			await n8n.canvas.fillNodeCreatorSearchBar('HTTP');
			const filteredCount = await n8n.canvas.nodeCreatorNodeItems().count();

			expect(filteredCount).toBeLessThan(initialCount);
			expect(filteredCount).toBeGreaterThan(0);
		});
	});
});
