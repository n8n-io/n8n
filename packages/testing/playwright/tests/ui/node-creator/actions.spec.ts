import { test, expect } from '../../../fixtures/base';

test.describe('Node Creator Actions', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should add node to canvas from actions panel', async ({ n8n }) => {
		const editImageNode = 'Edit Image';

		await n8n.canvas.nodeCreator.open();
		await n8n.canvas.nodeCreator.searchFor(editImageNode);
		await n8n.canvas.nodeCreator.selectItem(editImageNode);

		await expect(n8n.canvas.nodeCreator.getActiveSubcategory()).toContainText(editImageNode);
		await n8n.canvas.nodeCreator.selectItem('Crop Image');
		await expect(n8n.ndv.getContainer()).toBeVisible();
		await n8n.page.keyboard.press('Escape');

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
	});

	test('should search through actions and confirm added action', async ({ n8n }) => {
		await n8n.canvas.nodeCreator.open();
		await n8n.canvas.nodeCreator.searchFor('ftp');
		await n8n.canvas.nodeCreator.selectItem('FTP');

		await expect(n8n.canvas.nodeCreator.getActiveSubcategory()).toContainText('FTP');
		await n8n.canvas.nodeCreator.clearSearch();
		await n8n.canvas.nodeCreator.searchFor('rename');
		await n8n.canvas.nodeCreator.selectItem('Rename');

		await expect(n8n.ndv.getContainer()).toBeVisible();
		await n8n.page.keyboard.press('Escape');

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
	});

	test('should show multiple actions for multi-action nodes', async ({ n8n }) => {
		await n8n.canvas.nodeCreator.open();
		await n8n.canvas.nodeCreator.searchFor('OpenWeatherMap');
		await n8n.canvas.nodeCreator.selectItem('OpenWeatherMap');

		await expect(n8n.canvas.nodeCreator.getActiveSubcategory()).toContainText('OpenWeatherMap');
		await expect(n8n.canvas.nodeCreator.getNodeItems().first()).toBeVisible();
		await expect(n8n.canvas.nodeCreator.getNodeItems().nth(1)).toBeVisible();

		await n8n.canvas.nodeCreator.getNodeItems().first().click();
		await n8n.page.keyboard.press('Escape');
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
	});

	test('should add node with specific operation configuration', async ({ n8n }) => {
		await n8n.canvas.nodeCreator.open();
		await n8n.canvas.nodeCreator.searchFor('Slack');
		await n8n.canvas.nodeCreator.selectItem('Slack');

		await expect(n8n.canvas.nodeCreator.getActiveSubcategory()).toContainText('Slack');
		await n8n.canvas.nodeCreator.getNodeItems().first().click();
		await n8n.page.keyboard.press('Escape');
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);
	});
});
