import { MANUAL_TRIGGER_NODE_DISPLAY_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe('Node Creator Navigation', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should open node creator on trigger tab if no trigger is on canvas', async ({ n8n }) => {
		await n8n.canvas.clickCanvasPlusButton();
		await expect(n8n.canvas.nodeCreator.getRoot()).toBeVisible();
		await expect(n8n.canvas.nodeCreator.getTriggerText()).toBeVisible();
	});

	test('should navigate subcategory and return', async ({ n8n }) => {
		await n8n.canvas.nodeCreator.open();

		await n8n.canvas.nodeCreator.navigateToSubcategory('On app event');
		await expect(n8n.canvas.nodeCreator.getActiveSubcategory()).toContainText('On app event');

		await n8n.canvas.nodeCreator.goBackFromSubcategory();
		await expect(n8n.canvas.nodeCreator.getActiveSubcategory()).not.toContainText('On app event');
	});

	test('should search for nodes with various queries', async ({ n8n }) => {
		await n8n.canvas.nodeCreator.open();

		await n8n.canvas.nodeCreator.searchFor('manual');
		await expect(n8n.canvas.nodeCreator.getNodeItems()).toHaveCount(1);

		await n8n.canvas.nodeCreator.clearSearch();
		await n8n.canvas.nodeCreator.searchFor('manual123');
		await expect(n8n.canvas.nodeCreator.getNodeItems()).toHaveCount(0);
		await expect(n8n.canvas.nodeCreator.getNoResults()).toBeVisible();
		await expect(n8n.canvas.nodeCreator.getNoResults()).toContainText("We didn't make that... yet");

		await n8n.canvas.nodeCreator.clearSearch();
		await n8n.canvas.nodeCreator.searchFor('edit image');
		await expect(n8n.canvas.nodeCreator.getNodeItems()).toHaveCount(1);

		await n8n.canvas.nodeCreator.clearSearch();
		await n8n.canvas.nodeCreator.searchFor('this node totally does not exist');
		await expect(n8n.canvas.nodeCreator.getNodeItems()).toHaveCount(0);

		await n8n.canvas.nodeCreator.clearSearch();
		await n8n.canvas.nodeCreator.navigateToSubcategory('On app event');

		await n8n.canvas.nodeCreator.searchFor('edit image');
		await expect(
			n8n.canvas.nodeCreator.getCategoryItem('Results in other categories'),
		).toBeVisible();
		await expect(n8n.canvas.nodeCreator.getNodeItems()).toHaveCount(1);
		await expect(n8n.canvas.nodeCreator.getItem('Edit Image')).toBeVisible();

		await n8n.canvas.nodeCreator.clearSearch();
		await n8n.canvas.nodeCreator.searchFor('edit image123123');
		await expect(n8n.canvas.nodeCreator.getNodeItems()).toHaveCount(0);
	});

	test('should check correct view panels after adding manual trigger', async ({ n8n }) => {
		await n8n.canvas.clickCanvasPlusButton();
		await expect(n8n.canvas.nodeCreator.getTriggerText()).toBeVisible();
		await n8n.canvas.nodeCreator.close();

		await n8n.canvas.addNode('Manual Trigger');
		await expect(n8n.canvas.getCanvasPlusButton()).toBeHidden();

		await n8n.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
		await expect(n8n.canvas.nodeCreator.getNextText()).toBeVisible();
	});
});
