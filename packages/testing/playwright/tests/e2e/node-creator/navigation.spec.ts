import { MANUAL_TRIGGER_NODE_DISPLAY_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'Node Creator Navigation',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
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

			// Assert by identity rather than exact count: the node list renders
			// items incrementally per animation frame and, during a view
			// transition, a leaving panel briefly overlaps the entering one, so
			// `toHaveCount(N)` races the render/transition.
			// The manual trigger is listed under its node-type name ("Manual
			// Trigger") in the creator, not its on-canvas label.
			await n8n.canvas.nodeCreator.searchFor('manual');
			await expect(n8n.canvas.nodeCreator.getItem('Manual Trigger')).toBeVisible();

			await n8n.canvas.nodeCreator.clearSearch();
			await n8n.canvas.nodeCreator.searchFor('manual123');
			await expect(n8n.canvas.nodeCreator.getNoResults()).toBeVisible();
			await expect(n8n.canvas.nodeCreator.getNoResults()).toContainText(
				"We didn't make that... yet",
			);
			await expect(n8n.canvas.nodeCreator.getItem('Manual Trigger')).toBeHidden();

			await n8n.canvas.nodeCreator.clearSearch();
			await n8n.canvas.nodeCreator.searchFor('edit image');
			await expect(n8n.canvas.nodeCreator.getItem('Edit Image')).toBeVisible();

			await n8n.canvas.nodeCreator.clearSearch();
			await n8n.canvas.nodeCreator.searchFor('this node totally does not exist');
			await expect(n8n.canvas.nodeCreator.getNoResults()).toBeVisible();

			await n8n.canvas.nodeCreator.clearSearch();
			await n8n.canvas.nodeCreator.navigateToSubcategory('On app event');

			await n8n.canvas.nodeCreator.searchFor('edit image');
			await expect(
				n8n.canvas.nodeCreator.getCategoryItem('Results in other categories'),
			).toBeVisible();
			await expect(n8n.canvas.nodeCreator.getItem('Edit Image')).toBeVisible();

			await n8n.canvas.nodeCreator.clearSearch();
			await n8n.canvas.nodeCreator.searchFor('edit image123123');
			await expect(n8n.canvas.nodeCreator.getNoResults()).toBeVisible();
			await expect(n8n.canvas.nodeCreator.getItem('Edit Image')).toBeHidden();
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
	},
);
