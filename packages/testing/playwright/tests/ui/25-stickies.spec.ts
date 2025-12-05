import { test, expect } from '../../fixtures/base';

test.describe('Canvas Actions', () => {
	test('adds sticky to canvas with default text and position', async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
		await expect(n8n.canvas.sticky.getAddButton()).toBeVisible();

		await n8n.canvas.sticky.addSticky();

		const firstSticky = n8n.canvas.sticky.getStickies().first();
		await expect(firstSticky).toHaveCSS('height', '160px');
		await expect(firstSticky).toHaveCSS('width', '240px');

		await n8n.canvas.deselectAll();
		await n8n.canvas.sticky.addFromContextMenu(n8n.canvas.canvasPane());
		await n8n.page.keyboard.press('Shift+s');

		await expect(n8n.canvas.sticky.getStickies()).toHaveCount(3);

		await n8n.page.keyboard.press('ControlOrMeta+Shift+s');
		await expect(n8n.canvas.sticky.getStickies()).toHaveCount(3);

		await expect(n8n.canvas.sticky.getStickies().first()).toHaveText(
			'I’m a note\nDouble click to edit me. Guide\n',
		);
		const guideLink = n8n.canvas.sticky.getDefaultStickyGuideLink();
		await expect(guideLink).toHaveAttribute('href');
	});
});
