import fs from 'fs';

import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	SWITCH_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	MERGE_NODE_NAME,
	CODE_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
	CODE_NODE_DISPLAY_NAME,
} from '../../config/constants';
import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';
import { resolveFromRoot } from '../../utils/path-helper';

const DEFAULT_ZOOM_FACTOR = 1;
const ZOOM_IN_X1_FACTOR = 1.25; // Expected zoom after 1 zoom-in click (125%)
const ZOOM_IN_X2_FACTOR = 1.5625; // Expected zoom after 2 zoom-in clicks (156.25%)
const ZOOM_OUT_X1_FACTOR = 0.8; // Expected zoom after 1 zoom-out click (80%)
const ZOOM_OUT_X2_FACTOR = 0.64; // Expected zoom after 2 zoom-out clicks (64%)
const ZOOM_TOLERANCE = 0.2; // Acceptable variance for floating-point zoom comparisons

test.describe('Canvas Node Manipulation and Navigation', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should add switch node and test connections', async ({ n8n }) => {
		const desiredOutputs = 4;
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.addNode(SWITCH_NODE_NAME);

		for (let i = 0; i < desiredOutputs; i++) {
			await n8n.page.getByText('Add Routing Rule').click();
		}

		await n8n.ndv.close();

		for (let i = 0; i < desiredOutputs; i++) {
			await n8n.canvas.clickNodePlusEndpoint(SWITCH_NODE_NAME);
			await expect(n8n.canvas.nodeCreatorSearchBar()).toBeVisible();
			await n8n.canvas.fillNodeCreatorSearchBar(EDIT_FIELDS_SET_NODE_NAME);
			await n8n.canvas.clickNodeCreatorItemName(EDIT_FIELDS_SET_NODE_NAME);
			await n8n.page.keyboard.press('Escape');
			await n8n.canvas.clickZoomToFitButton();
		}

		await n8n.canvas.canvasPane().click({ position: { x: 10, y: 10 } });

		await n8n.canvas.clickNodePlusEndpoint('Edit Fields3');
		await n8n.canvas.fillNodeCreatorSearchBar(SWITCH_NODE_NAME);
		await n8n.canvas.clickNodeCreatorItemName(SWITCH_NODE_NAME);
		await n8n.page.keyboard.press('Escape');

		await n8n.canvas.saveWorkflow();
		await expect(n8n.canvas.getWorkflowSaveButton()).toContainText('Saved');

		await n8n.canvasComposer.reloadAndWaitForCanvas();

		await expect(
			n8n.canvas.connectionBetweenNodes('Edit Fields3', `${SWITCH_NODE_NAME}1`),
		).toBeAttached();

		const editFieldsNodes = ['Edit Fields', 'Edit Fields1', 'Edit Fields2', 'Edit Fields3'];
		for (const nodeName of editFieldsNodes) {
			await expect(n8n.canvas.connectionBetweenNodes(SWITCH_NODE_NAME, nodeName)).toBeAttached();
		}
	});

	test('should add merge node and test connections', async ({ n8n }) => {
		const editFieldsNodeCount = 2;

		const checkConnections = async () => {
			await expect(
				n8n.canvas.connectionBetweenNodes(MANUAL_TRIGGER_NODE_DISPLAY_NAME, 'Edit Fields1').first(),
			).toBeAttached();
			await expect(
				n8n.canvas.connectionBetweenNodes('Edit Fields', MERGE_NODE_NAME).first(),
			).toBeAttached();
			await expect(
				n8n.canvas.connectionBetweenNodes('Edit Fields1', MERGE_NODE_NAME).first(),
			).toBeAttached();
		};

		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();

		for (let i = 0; i < editFieldsNodeCount; i++) {
			await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });
			await n8n.canvas.canvasPane().click({
				position: { x: (i + 1) * 200, y: (i + 1) * 200 },
				// eslint-disable-next-line playwright/no-force-option
				force: true,
			});
		}
		await n8n.canvas.clickZoomToFitButton();

		await n8n.canvas.addNode(MERGE_NODE_NAME, { closeNDV: true });
		await n8n.canvas.clickZoomToFitButton();

		await n8n.canvas.connectNodesByDrag(MANUAL_TRIGGER_NODE_DISPLAY_NAME, 'Edit Fields1', 0, 0);

		await n8n.canvas.connectNodesByDrag('Edit Fields', MERGE_NODE_NAME, 0, 0);

		await n8n.canvas.connectNodesByDrag('Edit Fields1', MERGE_NODE_NAME, 0, 1);

		await checkConnections();

		await n8n.canvas.saveWorkflow();
		await expect(n8n.canvas.getWorkflowSaveButton()).toContainText('Saved');

		await n8n.canvasComposer.reloadAndWaitForCanvas();

		await checkConnections();

		await n8n.canvas.clickExecuteWorkflowButton();
		await expect(n8n.canvas.stopExecutionButton()).toBeHidden();

		await n8n.canvasComposer.reloadAndWaitForCanvas();

		await checkConnections();

		await n8n.canvas.clickExecuteWorkflowButton();
		await expect(n8n.canvas.stopExecutionButton()).toBeHidden();

		await expect(
			n8n.canvas.getConnectionLabelBetweenNodes('Edit Fields1', MERGE_NODE_NAME).first(),
		).toContainText('2 items');
	});

	test('should add nodes and check execution success', async ({ n8n }) => {
		const nodeCount = 3;

		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();

		for (let i = 0; i < nodeCount; i++) {
			await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		}
		await n8n.canvas.clickZoomToFitButton();

		await n8n.canvas.clickExecuteWorkflowButton();
		await expect(n8n.canvas.stopExecutionButton()).toBeHidden();

		await expect(n8n.canvas.getSuccessEdges()).toHaveCount(nodeCount);
		await expect(n8n.canvas.getAllNodeSuccessIndicators()).toHaveCount(nodeCount + 1);
		await expect(n8n.canvas.getCanvasHandlePlusWrapper()).toHaveAttribute(
			'data-plus-type',
			'success',
		);

		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.clickZoomToFitButton();

		await expect(n8n.canvas.getCanvasHandlePlus()).not.toHaveAttribute('data-plus-type', 'success');

		await expect(n8n.canvas.getSuccessEdges()).toHaveCount(nodeCount + 1);
		await expect(n8n.canvas.getAllNodeSuccessIndicators()).toHaveCount(nodeCount + 1);
	});

	test('should delete node using context menu', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.clickZoomToFitButton();

		await n8n.canvas.deleteNodeFromContextMenu(CODE_NODE_DISPLAY_NAME);

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(0);
	});

	test('should delete node using keyboard shortcut', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.nodeByName(CODE_NODE_DISPLAY_NAME).click();
		await n8n.page.keyboard.press('Backspace');

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(0);
	});

	test('should delete node between two connected nodes', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(2);

		await n8n.canvas.nodeByName(CODE_NODE_DISPLAY_NAME).click();
		await n8n.canvas.clickZoomToFitButton();
		await n8n.page.keyboard.press('Backspace');

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);
	});

	test('should delete multiple nodes (context menu or shortcut)', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.hitDeleteAllNodes();

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(0);

		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

		await n8n.canvas.rightClickCanvas();
		await n8n.canvas.getContextMenuItem('select_all').click();
		await n8n.canvas.rightClickCanvas();
		await n8n.canvas.getContextMenuItem('delete').click();

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(0);
	});

	test('should move node', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

		await n8n.canvas.clickZoomToFitButton();

		const pos1 = await n8n.canvas.getNodePosition(CODE_NODE_DISPLAY_NAME);
		await n8n.canvas.dragNodeToRelativePosition(CODE_NODE_DISPLAY_NAME, 50, 150);
		const pos2 = await n8n.canvas.getNodePosition(CODE_NODE_DISPLAY_NAME);

		expect(pos2.x).toBeGreaterThan(pos1.x);
		expect(pos2.y).toBeGreaterThan(pos1.y);
	});
});

test.describe('Canvas Zoom Functionality', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	const expectZoomLevel = async (n8n: n8nPage, expectedFactor: number) => {
		const actual = await n8n.canvas.getCanvasZoomLevel();
		expect(actual).toBeGreaterThanOrEqual(expectedFactor - ZOOM_TOLERANCE);
		expect(actual).toBeLessThanOrEqual(expectedFactor + ZOOM_TOLERANCE);
	};

	test('should zoom in', async ({ n8n }) => {
		await expect(n8n.canvas.getZoomInButton()).toBeVisible();

		const initialZoom = await n8n.canvas.getCanvasZoomLevel();

		await n8n.canvas.clickZoomInButton();
		await expectZoomLevel(n8n, initialZoom * ZOOM_IN_X1_FACTOR);

		await n8n.canvas.clickZoomInButton();
		await expectZoomLevel(n8n, initialZoom * ZOOM_IN_X2_FACTOR);
	});

	test('should zoom out', async ({ n8n }) => {
		await n8n.canvas.clickZoomOutButton();
		await expectZoomLevel(n8n, ZOOM_OUT_X1_FACTOR);

		await n8n.canvas.clickZoomOutButton();
		const finalZoom = await n8n.canvas.getCanvasZoomLevel();
		expect(finalZoom).toBeGreaterThanOrEqual(ZOOM_OUT_X2_FACTOR - ZOOM_TOLERANCE);
		expect(finalZoom).toBeLessThanOrEqual(ZOOM_OUT_X2_FACTOR + ZOOM_TOLERANCE);
	});

	test('should reset zoom', async ({ n8n }) => {
		await expect(n8n.canvas.getResetZoomButton()).not.toBeAttached();

		await n8n.canvas.clickZoomInButton();

		await expect(n8n.canvas.getResetZoomButton()).toBeVisible();
		await n8n.canvas.getResetZoomButton().click();

		await expectZoomLevel(n8n, DEFAULT_ZOOM_FACTOR);
	});

	test('should zoom to fit', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

		await n8n.canvas.clickZoomOutButton();
		await n8n.canvas.clickZoomOutButton();

		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

		await n8n.canvas.clickZoomInButton();
		await n8n.canvas.clickZoomInButton();

		await expect(n8n.canvas.getCanvasNodes().last()).not.toBeInViewport();

		await n8n.canvas.clickZoomToFitButton();

		await expect(n8n.canvas.getCanvasNodes().last()).toBeInViewport();
	});

	test('should disable node (context menu or shortcut)', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.getCanvasNodes().last().click();
		await n8n.page.keyboard.press('d');
		await expect(n8n.canvas.disabledNodes()).toHaveCount(1);

		await n8n.canvas.disableNodeFromContextMenu(CODE_NODE_DISPLAY_NAME);
		await expect(n8n.canvas.disabledNodes()).toHaveCount(0);
	});

	test('should disable multiple nodes (context menu or shortcut)', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript' });
		await n8n.page.keyboard.press('Escape');
		await n8n.page.keyboard.press('Escape');

		await n8n.canvas.selectAll();
		await n8n.page.keyboard.press('d');
		await expect(n8n.canvas.disabledNodes()).toHaveCount(2);
		await n8n.page.keyboard.press('d');
		await expect(n8n.canvas.disabledNodes()).toHaveCount(0);
		await n8n.canvas.deselectAll();
		await n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		await n8n.page.keyboard.press('d');
		await expect(n8n.canvas.disabledNodes()).toHaveCount(1);
		await n8n.canvas.selectAll();
		await n8n.page.keyboard.press('d');
		await expect(n8n.canvas.disabledNodes()).toHaveCount(2);

		await n8n.canvas.selectAll();
		await n8n.canvas.rightClickCanvas();
		await n8n.canvas.getContextMenuItem('toggle_activation').click();
		await expect(n8n.canvas.disabledNodes()).toHaveCount(0);
		await n8n.canvas.rightClickCanvas();
		await n8n.canvas.getContextMenuItem('toggle_activation').click();
		await expect(n8n.canvas.disabledNodes()).toHaveCount(2);
		await n8n.canvas.deselectAll();
		await n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		await n8n.canvas.rightClickCanvas();
		await n8n.canvas.getContextMenuItem('toggle_activation').click();
		await expect(n8n.canvas.disabledNodes()).toHaveCount(1);
		await n8n.canvas.selectAll();
		await n8n.canvas.rightClickCanvas();
		await n8n.canvas.getContextMenuItem('toggle_activation').click();
		await expect(n8n.canvas.disabledNodes()).toHaveCount(2);
	});

	test('should rename node (context menu or shortcut)', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvasComposer.renameNodeViaShortcut(CODE_NODE_DISPLAY_NAME, 'Something else');
		await expect(n8n.canvas.nodeByName('Something else')).toBeAttached();

		await n8n.canvas.rightClickNode('Something else');
		await n8n.canvas.getContextMenuItem('rename').click();
		await expect(n8n.canvas.getRenamePrompt()).toBeVisible();
		await n8n.page.keyboard.type('Something different');
		await n8n.page.keyboard.press('Enter');
		await expect(n8n.canvas.nodeByName('Something different')).toBeAttached();
	});

	test('should not allow empty strings for node names', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.getCanvasNodes().last().click();
		await n8n.page.keyboard.press('F2');
		await expect(n8n.canvas.getRenamePrompt()).toBeVisible();
		await n8n.page.keyboard.press('Backspace');
		await n8n.page.keyboard.press('Enter');
		await expect(n8n.canvas.getRenamePrompt()).toContainText('Invalid Name');
	});

	test('should duplicate nodes (context menu or shortcut)', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.duplicateNode(CODE_NODE_DISPLAY_NAME);
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);

		await n8n.canvas.selectAll();
		await n8n.page.keyboard.press('ControlOrMeta+d');
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(5);
	});

	test('should preserve connections after rename & node-view switch', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.clickExecuteWorkflowButton();

		await expect(
			n8n.notifications.getNotificationByTitleOrContent('Workflow executed successfully'),
		).toBeVisible();
		await n8n.notifications.closeNotificationByText('Workflow executed successfully');

		await n8n.canvas.openExecutions();
		await expect(n8n.executions.getSuccessfulExecutionItems()).toHaveCount(1);

		await n8n.canvas.clickEditorTab();

		await n8n.canvas.openExecutions();
		await expect(n8n.executions.getSuccessfulExecutionItems()).toHaveCount(1);

		await n8n.canvas.clickEditorTab();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);

		await n8n.canvasComposer.renameNodeViaShortcut(CODE_NODE_DISPLAY_NAME, 'Something else');
		await expect(n8n.canvas.nodeByName('Something else')).toBeAttached();

		await n8n.canvas.saveWorkflow();
		await expect(n8n.canvas.getWorkflowSaveButton()).toContainText('Saved');

		await n8n.canvasComposer.reloadAndWaitForCanvas();

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);
	});

	test('should remove unknown credentials on pasting workflow', async ({ n8n }) => {
		const workflowJson = fs.readFileSync(
			resolveFromRoot('workflows', 'workflow-with-unknown-credentials.json'),
			'utf-8',
		);

		await n8n.canvas.canvasPane().click();

		await n8n.clipboard.paste(workflowJson);
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);

		await n8n.canvas.nodeByName('n8n').hover();
		await n8n.canvas.nodeByName('n8n').getByTestId('overflow-node-button').click();
		await n8n.page.getByTestId('context-menu-item-open').click();

		await expect(n8n.ndv.getNodesWithIssues()).toHaveCount(1);
	});

	test.skip('should open and close the about modal on keyboard shortcut', async ({ n8n }) => {
		await n8n.sideBar.openAboutModalViaShortcut();
		await expect(n8n.sideBar.getAboutModal()).toBeVisible();
		await n8n.sideBar.closeAboutModal();
	});
});
