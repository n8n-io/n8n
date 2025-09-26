import {
	SCHEDULE_TRIGGER_NODE_NAME,
	CODE_NODE_NAME,
	CODE_NODE_DISPLAY_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
} from '../../config/constants';
import { test, expect } from '../../fixtures/base';

test.describe('Undo/Redo', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
		await n8n.workflows.addResource.workflow();
	});

	test('should undo/redo deleting node using context menu', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.clickZoomToFitButton();

		await n8n.canvas.deleteNodeFromContextMenu(CODE_NODE_DISPLAY_NAME);
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(0);

		await n8n.canvas.hitUndo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);

		await n8n.canvas.hitRedo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(0);
	});

	test('should undo/redo deleting node using keyboard shortcut', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.nodeByName(CODE_NODE_DISPLAY_NAME).click();
		await n8n.page.keyboard.press('Backspace');

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(0);

		await n8n.canvas.hitUndo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);

		await n8n.canvas.hitRedo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(0);
	});

	test('should undo/redo deleting node between two connected nodes', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });
		await n8n.canvas.nodeByName(CODE_NODE_DISPLAY_NAME).click();
		await n8n.canvas.clickZoomToFitButton();
		await n8n.page.keyboard.press('Backspace');

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);

		await n8n.canvas.hitUndo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(2);

		await n8n.canvas.hitRedo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);
	});

	test('should undo/redo deleting whole workflow', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.page.keyboard.press('Escape');
		await n8n.page.keyboard.press('Escape');

		await n8n.canvas.hitDeleteAllNodes();

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(0);

		await n8n.page.locator('body').click();

		await n8n.canvas.hitUndo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);

		await n8n.canvas.hitRedo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(0);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(0);
	});
});
