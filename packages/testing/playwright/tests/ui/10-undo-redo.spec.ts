import fs from 'fs';

import {
	SCHEDULE_TRIGGER_NODE_NAME,
	CODE_NODE_NAME,
	CODE_NODE_DISPLAY_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
} from '../../config/constants';
import { test, expect } from '../../fixtures/base';
import { resolveFromRoot } from '../../utils/path-helper';

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
		await n8n.canvas.clickZoomToFitButton();
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

		await n8n.canvas.hitUndo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);

		await n8n.canvas.hitRedo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(0);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(0);
	});

	test('should undo/redo moving nodes', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();

		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

		await n8n.canvas.clickZoomToFitButton();

		const codeNodeName = CODE_NODE_DISPLAY_NAME;

		const initialPosition = await n8n.canvas.getNodePosition(codeNodeName);

		await n8n.canvas.dragNodeToRelativePosition(codeNodeName, 50, 150);

		const newPosition = await n8n.canvas.getNodePosition(codeNodeName);
		expect(newPosition.x).toBeGreaterThan(initialPosition.x);
		expect(newPosition.y).toBeGreaterThan(initialPosition.y);

		await n8n.canvas.hitUndo();
		const undoPosition = await n8n.canvas.getNodePosition(codeNodeName);
		expect(undoPosition.x).toBeCloseTo(initialPosition.x, 1);
		expect(undoPosition.y).toBeCloseTo(initialPosition.y, 1);

		await n8n.canvas.hitRedo();
		const redoPosition = await n8n.canvas.getNodePosition(codeNodeName);
		expect(redoPosition.x).toBeGreaterThan(initialPosition.x);
		expect(redoPosition.y).toBeGreaterThan(initialPosition.y);
	});

	test('should undo/redo deleting a connection using context menu', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

		await n8n.canvas.deleteConnectionBetweenNodes(
			SCHEDULE_TRIGGER_NODE_NAME,
			CODE_NODE_DISPLAY_NAME,
		);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(0);

		await n8n.canvas.hitUndo();
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);

		await n8n.canvas.hitRedo();
		await expect(n8n.canvas.nodeConnections()).toHaveCount(0);
	});

	test('should undo/redo disabling a node using context menu', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

		await n8n.canvas.disableNodeFromContextMenu(CODE_NODE_DISPLAY_NAME);
		await expect(n8n.canvas.disabledNodes()).toHaveCount(1);

		await n8n.canvas.hitUndo();
		await expect(n8n.canvas.disabledNodes()).toHaveCount(0);

		await n8n.canvas.hitRedo();
		await expect(n8n.canvas.disabledNodes()).toHaveCount(1);
	});

	test('should undo/redo disabling a node using keyboard shortcut', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.getCanvasNodes().last().click();
		await n8n.page.keyboard.press('d');

		await expect(n8n.canvas.disabledNodes()).toHaveCount(1);

		await n8n.canvas.hitUndo();
		await expect(n8n.canvas.disabledNodes()).toHaveCount(0);

		await n8n.canvas.hitRedo();
		await expect(n8n.canvas.disabledNodes()).toHaveCount(1);
	});

	test('should undo/redo disabling multiple nodes', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.page.keyboard.press('Escape');
		await n8n.page.keyboard.press('Escape');

		await n8n.canvas.selectAll();
		await n8n.page.keyboard.press('d');

		await expect(n8n.canvas.disabledNodes()).toHaveCount(2);

		await n8n.canvas.hitUndo();
		await expect(n8n.canvas.disabledNodes()).toHaveCount(0);

		await n8n.canvas.hitRedo();
		await expect(n8n.canvas.disabledNodes()).toHaveCount(2);
	});

	test('should undo/redo duplicating a node', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

		await n8n.canvas.duplicateNode(CODE_NODE_DISPLAY_NAME);

		await n8n.canvas.hitUndo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);

		await n8n.canvas.hitRedo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
	});

	test('should undo/redo pasting nodes', async ({ n8n }) => {
		const workflowJson = fs.readFileSync(
			resolveFromRoot('workflows', 'Test_workflow-actions_paste-data.json'),
			'utf-8',
		);

		await n8n.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

		await n8n.page.evaluate(async (data) => {
			await navigator.clipboard.writeText(data);
		}, workflowJson);

		await n8n.canvas.canvasPane().click();
		await n8n.canvas.hitPaste();
		await n8n.canvas.clickZoomToFitButton();

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(5);

		await n8n.canvas.hitUndo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(0);

		await n8n.canvas.hitRedo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(5);
	});

	test('should be able to copy and paste pinned data nodes in workflows with dynamic Switch node', async ({
		n8n,
	}) => {
		const workflowJson = fs.readFileSync(
			resolveFromRoot('workflows', 'Test_workflow_form_switch.json'),
			'utf-8',
		);

		await n8n.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

		await n8n.page.evaluate(async (data) => {
			await navigator.clipboard.writeText(data);
		}, workflowJson);

		await n8n.canvas.canvasPane().click();
		await n8n.canvas.hitPaste();
		await n8n.canvas.clickZoomToFitButton();

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);
		await expect(n8n.canvas.getNodeInputHandles('Switch')).toHaveCount(1);

		// Wait for clipboard paste throttling
		await n8n.page.waitForTimeout(1000);

		await n8n.page.evaluate(async (data) => {
			await navigator.clipboard.writeText(data);
		}, workflowJson);

		await n8n.canvas.canvasPane().click();
		await n8n.canvas.hitPaste();

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(4);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(2);

		await n8n.canvas.hitUndo();

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);
		await expect(n8n.canvas.getNodeInputHandles('Switch')).toHaveCount(1);
	});

	test('should not undo/redo when NDV or a modal is open', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);

		await n8n.canvas.hitUndo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);
		await n8n.ndv.clickBackToCanvasButton();

		await n8n.sideBar.clickAboutMenuItem();
		await expect(n8n.sideBar.getAboutModal()).toBeVisible();
		await n8n.canvas.hitUndo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);
		await n8n.sideBar.closeAboutModal();

		await n8n.canvas.hitUndo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(0);
	});

	test('should not undo/redo when NDV or a prompt is open', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.clickWorkflowMenu();
		await n8n.canvas.clickImportFromURL();

		await n8n.canvas.getImportURLInput().click();
		await n8n.canvas.hitUndo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);

		await n8n.canvas.clickCancelImportURL();
		await n8n.canvas.hitUndo();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(0);
	});
});
