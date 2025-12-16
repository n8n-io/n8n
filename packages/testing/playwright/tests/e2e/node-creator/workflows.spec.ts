import { test, expect } from '../../../fixtures/base';

test.describe('Node Creator Workflow Building', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should append manual trigger when adding action node from canvas add button', async ({
		n8n,
	}) => {
		await n8n.canvas.clickCanvasPlusButton();
		await n8n.canvas.nodeCreator.searchFor('n8n');
		await n8n.canvas.nodeCreator.selectItem('n8n');
		await n8n.canvas.nodeCreator.selectCategoryItem('Actions');
		await n8n.canvas.nodeCreator.selectItem('Create a credential');
		await n8n.page.keyboard.press('Escape');

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(1);
	});

	test('should append manual trigger when adding action node from plus button', async ({ n8n }) => {
		await n8n.canvas.clickCanvasPlusButton();
		await n8n.canvas.nodeCreator.searchFor('n8n');
		await n8n.canvas.nodeCreator.selectItem('n8n');
		await n8n.canvas.nodeCreator.selectCategoryItem('Actions');
		await n8n.canvas.nodeCreator.selectItem('Create a credential');
		await n8n.page.keyboard.press('Escape');

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
	});
});
