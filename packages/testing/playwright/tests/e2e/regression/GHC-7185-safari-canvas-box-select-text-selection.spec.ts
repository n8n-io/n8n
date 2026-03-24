import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	CODE_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
} from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

/**
 * Regression test for GHC-7185
 * Bug: In Safari, box-selecting nodes on canvas triggers full-page text selection highlight
 * Expected: Selection marquee should appear with no text highlighting
 *
 * GitHub Issue: https://github.com/n8n-io/n8n/issues/26776
 */
test.describe(
	'Canvas Box Selection - Safari Text Selection Bug',
	{
		annotation: [
			{ type: 'issue', description: 'GHC-7185' },
			{ type: 'github', description: 'https://github.com/n8n-io/n8n/issues/26776' },
		],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();

			// Add a few nodes to create a scenario where box selection would be useful
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
			await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });
			await n8n.canvas.clickZoomToFitButton();

			// Deselect all to start from clean state
			await n8n.canvas.deselectAll();
		});

		test('should not trigger browser text selection when box-selecting on canvas', async ({
			n8n,
		}) => {
			const canvas = n8n.canvas.canvasPane();

			// Get canvas bounding box to calculate drag coordinates
			const canvasBounds = await canvas.boundingBox();
			if (!canvasBounds) {
				throw new Error('Canvas bounds not found');
			}

			// Start drag from empty area (upper left, away from nodes)
			const startX = canvasBounds.x + 50;
			const startY = canvasBounds.y + 50;

			// Drag to cover some area (but not necessarily selecting nodes yet)
			const endX = startX + 200;
			const endY = startY + 150;

			// Perform box-select gesture: click, hold, and drag
			await n8n.page.mouse.move(startX, startY);
			await n8n.page.mouse.down();
			await n8n.page.mouse.move(endX, endY, { steps: 10 });
			await n8n.page.mouse.up();

			// CRITICAL ASSERTION: Verify no browser text selection occurred
			// In Safari with the bug, window.getSelection() would contain selected text
			const selection = await n8n.page.evaluate(() => {
				const sel = window.getSelection();
				return {
					type: sel?.type,
					rangeCount: sel?.rangeCount,
					toString: sel?.toString(),
				};
			});

			// The selection should be empty or 'None' type (no text selected)
			expect(selection.type).toBe('None');
			expect(selection.toString).toBe('');

			// Secondary assertion: user-select CSS should prevent text selection
			const canvasUserSelect = await canvas.evaluate((el) => {
				return window.getComputedStyle(el).userSelect;
			});

			// Canvas should have user-select: none to prevent text selection
			expect(canvasUserSelect).toBe('none');
		});

		test('should show selection marquee during box-select drag', async ({ n8n }) => {
			const canvas = n8n.canvas.canvasPane();

			// Get canvas bounding box
			const canvasBounds = await canvas.boundingBox();
			if (!canvasBounds) {
				throw new Error('Canvas bounds not found');
			}

			// Calculate drag coordinates
			const startX = canvasBounds.x + 50;
			const startY = canvasBounds.y + 50;
			const endX = startX + 200;
			const endY = startY + 150;

			// Start drag
			await n8n.page.mouse.move(startX, startY);
			await n8n.page.mouse.down();
			await n8n.page.mouse.move(endX, endY, { steps: 10 });

			// During drag, the vue-flow selection box should be visible and have dimensions
			// Vue Flow uses .vue-flow__selection for the selection box
			const selectionBox = n8n.page.locator('.vue-flow__selection');

			// The selection box should be visible and have non-zero dimensions during drag
			await expect(selectionBox).toBeVisible();

			// Verify the selection box has actual dimensions (not just present but empty)
			const boxSize = await selectionBox.boundingBox();
			expect(boxSize).not.toBeNull();
			expect(boxSize!.width).toBeGreaterThan(0);
			expect(boxSize!.height).toBeGreaterThan(0);

			// Complete the drag
			await n8n.page.mouse.up();
		});

		test('should select nodes within box-selection area', async ({ n8n }) => {
			const canvas = n8n.canvas.canvasPane();

			// Get canvas bounding box
			const canvasBounds = await canvas.boundingBox();
			if (!canvasBounds) {
				throw new Error('Canvas bounds not found');
			}

			// Perform a large box-select that covers all nodes
			const startX = canvasBounds.x + 10;
			const startY = canvasBounds.y + 10;
			const endX = canvasBounds.x + canvasBounds.width - 10;
			const endY = canvasBounds.y + canvasBounds.height - 10;

			// Drag to select all nodes
			await n8n.page.mouse.move(startX, startY);
			await n8n.page.mouse.down();
			await n8n.page.mouse.move(endX, endY, { steps: 10 });
			await n8n.page.mouse.up();

			// Verify that nodes are selected (they should have a selected state)
			// Selected nodes typically have a 'selected' class or data attribute
			const selectedNodes = n8n.page.locator('[data-test-id="canvas-node"][class*="selected"]');

			// At least some nodes should be selected
			await expect(selectedNodes.first()).toBeVisible();

			// Verify no text selection occurred during this operation
			const selection = await n8n.page.evaluate(() => window.getSelection()?.toString());
			expect(selection).toBe('');
		});
	},
);
