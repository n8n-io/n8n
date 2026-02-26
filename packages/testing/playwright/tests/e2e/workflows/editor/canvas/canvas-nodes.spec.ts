import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	SWITCH_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	MERGE_NODE_NAME,
	CODE_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
	CODE_NODE_DISPLAY_NAME,
} from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

test.describe('Canvas Node Manipulation and Navigation', {
	annotation: [
		{ type: 'owner', description: 'Adore' },
	],
}, () => {
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

		await n8n.canvasComposer.waitForWorkflowSaveAndUrl();

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
		await expect(
			n8n.canvas.connectionBetweenNodes(MANUAL_TRIGGER_NODE_DISPLAY_NAME, 'Edit Fields1').first(),
		).toBeAttached();

		await n8n.canvas.connectNodesByDrag('Edit Fields', MERGE_NODE_NAME, 0, 0);
		await expect(
			n8n.canvas.connectionBetweenNodes('Edit Fields', MERGE_NODE_NAME).first(),
		).toBeAttached();

		await n8n.canvas.connectNodesByDrag('Edit Fields1', MERGE_NODE_NAME, 0, 1);
		await expect(
			n8n.canvas.connectionBetweenNodes('Edit Fields1', MERGE_NODE_NAME).first(),
		).toBeAttached();

		await n8n.canvasComposer.waitForWorkflowSaveAndUrl();

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
		).toContainText('1 item');

		await expect(n8n.canvas.getNodeOutputHandle(MERGE_NODE_NAME).first()).toContainText('2 items');
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
		await expect(
			n8n.canvas.getCanvasHandlePlusWrapperByName('Code in JavaScript2'),
		).toHaveAttribute('data-plus-type', 'success');

		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.clickZoomToFitButton();

		await expect(
			n8n.canvas.getCanvasHandlePlusWrapperByName('Code in JavaScript3'),
		).not.toHaveAttribute('data-plus-type', 'success');

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
