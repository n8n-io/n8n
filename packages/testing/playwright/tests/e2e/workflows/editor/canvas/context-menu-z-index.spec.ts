import { test, expect } from '../../../../../fixtures/base';
import { MANUAL_TRIGGER_NODE_NAME } from '../../../../../config/constants';

/**
 * Regression test for N8N-9899: Canvas context menu goes under the tabs
 *
 * Bug: The canvas context menu (z-index: 10) renders underneath the
 * Edit/Executions/Evaluations tabs (z-index: 100) when opened near the
 * top of the canvas.
 *
 * Expected: Context menu should be visible above all other UI elements
 * including the tabs.
 */
test.describe(
	'Canvas Context Menu Z-Index',
	{
		annotation: [{ type: 'issue', description: 'N8N-9899' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
			// Add a node to enable context menu on canvas
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		});

		test('context menu should appear above workflow tabs', async ({ n8n }) => {
			// Right-click near the top of the canvas where tabs are located
			// This should open the context menu in a position that would overlap
			// with the Edit/Executions/Evaluations tabs
			const canvasPane = n8n.canvas.canvasPane();

			// Click at the top area of canvas (near where tabs would be)
			await canvasPane.click({
				button: 'right',
				position: { x: 400, y: 20 }
			});

			// Context menu should be visible
			const contextMenu = n8n.page.getByTestId('context-menu');
			await expect(contextMenu).toBeVisible();

			// Get the computed z-index of context menu
			const contextMenuZIndex = await contextMenu.evaluate((el) => {
				return window.getComputedStyle(el.parentElement!).zIndex;
			});

			// Get the z-index of the tab bar container
			const tabBarContainer = n8n.page.locator('.tab-bar-container');
			const tabBarZIndex = await tabBarContainer.evaluate((el) => {
				return window.getComputedStyle(el).zIndex;
			});

			// Context menu should have a higher z-index than the tabs
			// Currently FAILS: contextMenuZIndex = '10', tabBarZIndex = '100'
			expect(
				parseInt(contextMenuZIndex),
				`Context menu z-index (${contextMenuZIndex}) should be higher than tabs z-index (${tabBarZIndex})`
			).toBeGreaterThan(parseInt(tabBarZIndex));
		});

		test('node context menu should appear above workflow tabs', async ({ n8n }) => {
			// Right-click on a node to open node context menu
			await n8n.canvas.rightClickNode(MANUAL_TRIGGER_NODE_NAME);

			// Context menu should be visible
			const contextMenu = n8n.page.getByTestId('context-menu');
			await expect(contextMenu).toBeVisible();

			// Get the computed z-index of context menu
			const contextMenuZIndex = await contextMenu.evaluate((el) => {
				return window.getComputedStyle(el.parentElement!).zIndex;
			});

			// Get the z-index of the tab bar container
			const tabBarContainer = n8n.page.locator('.tab-bar-container');
			await expect(tabBarContainer).toBeVisible();

			const tabBarZIndex = await tabBarContainer.evaluate((el) => {
				return window.getComputedStyle(el).zIndex;
			});

			// Context menu should have a higher z-index than the tabs
			// Currently FAILS: contextMenuZIndex = '10', tabBarZIndex = '100'
			expect(
				parseInt(contextMenuZIndex),
				`Node context menu z-index (${contextMenuZIndex}) should be higher than tabs z-index (${tabBarZIndex})`
			).toBeGreaterThan(parseInt(tabBarZIndex));
		});
	},
);
