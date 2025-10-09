import { test, expect } from '../../fixtures/base';

test.describe('Node IO Filter', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Node_IO_filter.json');
		await n8n.canvas.clickExecuteWorkflowButton();
	});

	test('should filter pinned data', async ({ n8n }) => {
		const canvasNodes = n8n.canvas.getCanvasNodes();
		await canvasNodes.first().dblclick();

		await n8n.ndv.close();
		await canvasNodes.first().dblclick();

		await expect(n8n.ndv.outputPanel.getDataContainer()).toBeVisible();

		const searchInput = n8n.ndv.outputPanel.getSearchInput();
		await expect(searchInput).toBeVisible();

		await n8n.page.keyboard.press('/');

		await expect(searchInput).toBeFocused();

		const pagination = n8n.ndv.getOutputPagination();
		await expect(pagination.locator('li')).toHaveCount(3);
		await expect(n8n.ndv.outputPanel.getDataContainer().locator('mark')).toHaveCount(0);

		await searchInput.fill('ar');
		await expect(pagination.locator('li')).toHaveCount(2);
		const markCount1 = await n8n.ndv.outputPanel.getDataContainer().locator('mark').count();
		expect(markCount1).toBeGreaterThan(0);

		await searchInput.fill('ari');
		await expect(pagination).toBeHidden();
		const markCount2 = await n8n.ndv.outputPanel.getDataContainer().locator('mark').count();
		expect(markCount2).toBeGreaterThan(0);
	});

	test('should filter input/output data separately', async ({ n8n }) => {
		const canvasNodes = n8n.canvas.getCanvasNodes();
		await canvasNodes.nth(1).dblclick();

		await expect(n8n.ndv.outputPanel.getDataContainer()).toBeVisible();
		await expect(n8n.ndv.inputPanel.getDataContainer()).toBeVisible();

		await n8n.ndv.inputPanel.switchDisplayMode('table');

		await expect(n8n.ndv.outputPanel.getSearchInput()).toBeVisible();

		await n8n.page.keyboard.press('/');
		await expect(n8n.ndv.outputPanel.getSearchInput()).not.toBeFocused();

		const inputSearchInput = n8n.ndv.inputPanel.getSearchInput();
		await expect(inputSearchInput).toBeFocused();

		const getInputPagination = () => n8n.ndv.inputPanel.get().getByTestId('ndv-data-pagination');
		const getInputCounter = () => n8n.ndv.inputPanel.getItemsCount();
		const getOutputPagination = () => n8n.ndv.outputPanel.get().getByTestId('ndv-data-pagination');
		const getOutputCounter = () => n8n.ndv.outputPanel.getItemsCount();

		await expect(getInputPagination().locator('li')).toHaveCount(3);
		await expect(getInputCounter()).toContainText('21 items');
		await expect(getOutputPagination().locator('li')).toHaveCount(3);
		await expect(getOutputCounter()).toContainText('21 items');

		await inputSearchInput.fill('ar');
		await expect(getInputPagination().locator('li')).toHaveCount(2);
		await expect(getInputCounter()).toContainText('14 of 21 items');
		await expect(getOutputPagination().locator('li')).toHaveCount(3);
		await expect(getOutputCounter()).toContainText('21 items');

		await inputSearchInput.fill('ari');
		await expect(getInputPagination()).toBeHidden();
		await expect(getInputCounter()).toContainText('8 of 21 items');
		await expect(getOutputPagination().locator('li')).toHaveCount(3);
		await expect(getOutputCounter()).toContainText('21 items');

		await inputSearchInput.clear();
		await expect(getInputPagination().locator('li')).toHaveCount(3);
		await expect(getInputCounter()).toContainText('21 items');
		await expect(getOutputPagination().locator('li')).toHaveCount(3);
		await expect(getOutputCounter()).toContainText('21 items');

		await n8n.ndv.outputPanel.getDataContainer().click();
		await n8n.page.keyboard.press('/');
		await expect(n8n.ndv.inputPanel.getSearchInput()).not.toBeFocused();

		const outputSearchInput = n8n.ndv.outputPanel.getSearchInput();
		await expect(outputSearchInput).toBeFocused();

		await expect(getInputPagination().locator('li')).toHaveCount(3);
		await expect(getInputCounter()).toContainText('21 items');
		await expect(getOutputPagination().locator('li')).toHaveCount(3);
		await expect(getOutputCounter()).toContainText('21 items');

		await outputSearchInput.fill('ar');
		await expect(getInputPagination().locator('li')).toHaveCount(3);
		await expect(getInputCounter()).toContainText('21 items');
		await expect(getOutputPagination().locator('li')).toHaveCount(2);
		await expect(getOutputCounter()).toContainText('14 of 21 items');

		await outputSearchInput.fill('ari');
		await expect(getInputPagination().locator('li')).toHaveCount(3);
		await expect(getInputCounter()).toContainText('21 items');
		await expect(getOutputPagination()).toBeHidden();
		await expect(getOutputCounter()).toContainText('8 of 21 items');

		await outputSearchInput.clear();
		await expect(getInputPagination().locator('li')).toHaveCount(3);
		await expect(getInputCounter()).toContainText('21 items');
		await expect(getOutputPagination().locator('li')).toHaveCount(3);
		await expect(getOutputCounter()).toContainText('21 items');
	});
});
