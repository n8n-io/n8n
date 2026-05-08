import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Sticky Note Context Menu',
	{
		annotation: [{ type: 'issue', description: 'N8N-9980' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
		});

		// N8N-9980: Sticky note change color menu item is non-functional
		test('should open color picker when clicking change color in context menu', async ({
			n8n,
		}) => {
			// Add a sticky note to the canvas
			await n8n.canvas.sticky.addSticky();
			await expect(n8n.canvas.sticky.getStickies()).toHaveCount(1);

			const stickyNote = n8n.canvas.sticky.getStickies().first();

			// Right-click the sticky note to open context menu
			await stickyNote.click({ button: 'right' });

			// Verify context menu is visible
			const contextMenu = n8n.page.getByTestId('context-menu');
			await expect(contextMenu).toBeVisible();

			// Click the "change color" menu item
			const changeColorItem = n8n.canvas.getContextMenuItem('change_color');
			await expect(changeColorItem).toBeVisible();
			await changeColorItem.click();

			// The color picker popover should appear
			// The trigger is the palette icon with test-id "change-sticky-color"
			// The popover should become visible after clicking the menu item
			const colorPicker = n8n.page.getByTestId('change-sticky-color');
			await expect(colorPicker).toBeVisible();

			// The popover content with color options should be visible
			const colorOptions = n8n.page.getByTestId('color');
			await expect(colorOptions.first()).toBeVisible();
		});

		// Happy path test to ensure sticky note creation works
		test('should successfully create and interact with sticky note', async ({ n8n }) => {
			await n8n.canvas.sticky.addSticky();
			await expect(n8n.canvas.sticky.getStickies()).toHaveCount(1);

			const stickyNote = n8n.canvas.sticky.getStickies().first();
			await expect(stickyNote).toBeVisible();

			// Verify we can right-click and see context menu
			await stickyNote.click({ button: 'right' });
			const contextMenu = n8n.page.getByTestId('context-menu');
			await expect(contextMenu).toBeVisible();

			// Verify the change color menu item exists
			const changeColorItem = n8n.canvas.getContextMenuItem('change_color');
			await expect(changeColorItem).toBeVisible();
		});
	},
);
