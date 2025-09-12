import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	CODE_NODE_NAME,
	HTTP_REQUEST_NODE_NAME,
	CODE_NODE_DISPLAY_NAME,
} from '../../config/constants';
import { test, expect } from '../../fixtures/base';

test.describe('Canvas Actions', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
		await n8n.workflows.clickAddWorkflowButton();
	});

	test('should add first step', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);
	});

	test('should add a connected node using plus endpoint', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
		await n8n.canvas.fillNodeCreatorSearchBar(CODE_NODE_NAME);
		await n8n.page.keyboard.press('Enter');
		await n8n.canvas.clickNodeCreatorItemName(CODE_NODE_DISPLAY_NAME);
		await n8n.page.keyboard.press('Enter');

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);
	});

	test('should add a connected node dragging from node creator', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
		await n8n.canvas.fillNodeCreatorSearchBar(CODE_NODE_NAME);
		await n8n.page.keyboard.press('Enter');
		await n8n.canvas
			.nodeCreatorSubItem(CODE_NODE_DISPLAY_NAME)
			.dragTo(n8n.canvas.canvasPane(), { targetPosition: { x: 100, y: 100 } });

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);
	});

	test('should open a category when trying to drag and drop it on the canvas', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
		await n8n.canvas.fillNodeCreatorSearchBar(CODE_NODE_NAME);

		const categoryItem = n8n.canvas.nodeCreatorActionItems().first();
		await categoryItem.dragTo(n8n.canvas.canvasPane(), {
			targetPosition: { x: 100, y: 100 },
		});

		await expect(n8n.canvas.nodeCreatorCategoryItems()).toHaveCount(1);
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(0);
	});

	test('should add disconnected node if nothing is selected', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.deselectAll();
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(0);
	});

	test('should add node between two connected nodes', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);

		await n8n.canvas.addNodeBetweenNodes(
			MANUAL_TRIGGER_NODE_DISPLAY_NAME,
			CODE_NODE_DISPLAY_NAME,
			HTTP_REQUEST_NODE_NAME,
		);

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(2);
	});

	test('should delete node by pressing keyboard backspace', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		await n8n.page.keyboard.press('Backspace');

		await expect(n8n.canvas.nodeConnections()).toHaveCount(0);
	});

	test('should delete connections by clicking on the delete button', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.deleteConnectionBetweenNodes(
			MANUAL_TRIGGER_NODE_DISPLAY_NAME,
			CODE_NODE_DISPLAY_NAME,
		);

		await expect(n8n.canvas.nodeConnections()).toHaveCount(0);
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
	});

	test.describe('Node hover actions', () => {
		test('should execute node', async ({ n8n }) => {
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.deselectAll();
			await n8n.canvas.executeNode(MANUAL_TRIGGER_NODE_DISPLAY_NAME);

			await expect(
				n8n.notifications.getNotificationByTitle('Node executed successfully'),
			).toHaveCount(1);
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);
			await expect(n8n.canvas.selectedNodes()).toHaveCount(0);
		});

		test('should disable and enable node', async ({ n8n }) => {
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await n8n.canvas.deselectAll();

			const disableButton = n8n.canvas.nodeDisableButton(CODE_NODE_DISPLAY_NAME);
			await disableButton.click();

			await expect(n8n.canvas.disabledNodes()).toHaveCount(1);
			await expect(n8n.canvas.selectedNodes()).toHaveCount(0);

			await disableButton.click();

			await expect(n8n.canvas.disabledNodes()).toHaveCount(0);
			await expect(n8n.canvas.selectedNodes()).toHaveCount(0);
		});

		test('should delete node', async ({ n8n }) => {
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await n8n.canvas.deleteNodeByName(CODE_NODE_DISPLAY_NAME);

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);
			await expect(n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME)).toBeVisible();
		});
	});

	test('should copy selected nodes', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvasComposer.selectAllAndCopy();
		await n8n.canvas.nodeByName(CODE_NODE_DISPLAY_NAME).click();
		await n8n.canvasComposer.copySelectedNodesWithToast();

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
	});

	test('should select/deselect all nodes', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.selectAll();

		await expect(n8n.canvas.selectedNodes()).toHaveCount(2);

		await n8n.canvas.deselectAll();
		await expect(n8n.canvas.selectedNodes()).toHaveCount(0);
	});

	test('should select nodes using arrow keys', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.getCanvasNodes().first().waitFor();
		await n8n.canvas.navigateNodesWithArrows('left');

		const selectedNodes = n8n.canvas.selectedNodes();
		await expect(selectedNodes.first()).toHaveClass(/selected/);

		await n8n.canvas.navigateNodesWithArrows('right');

		await expect(selectedNodes.last()).toHaveClass(/selected/);
	});

	test('should select nodes using shift and arrow keys', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
		await n8n.canvas.getCanvasNodes().first().waitFor();
		await n8n.canvas.extendSelectionWithArrows('left');

		await expect(n8n.canvas.selectedNodes()).toHaveCount(2);
	});
});
