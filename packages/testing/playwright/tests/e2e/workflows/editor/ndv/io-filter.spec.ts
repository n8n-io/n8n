import { test, expect } from '../../../../../fixtures/base';

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

		const searchContainer = n8n.ndv.outputPanel.getSearchContainer();
		const searchInput = n8n.ndv.outputPanel.getSearchInput();
		await expect(searchContainer).toBeVisible();

		await n8n.page.keyboard.press('/');

		await expect(searchInput).toBeFocused();

		// 35 items with page size 25 = 2 pages
		const pagination = n8n.ndv.getOutputPagination();
		await expect(pagination.locator('li')).toHaveCount(2);
		await expect(n8n.ndv.outputPanel.getDataContainer().locator('mark')).toHaveCount(0);

		// Search for 'zzz' - filters to 0 items, so no pagination
		await searchInput.fill('zzz');
		await expect(pagination).toBeHidden();

		// Search for 'Reese' - filters to 1 item, no pagination, highlights visible
		await searchInput.fill('Reese');
		await expect(pagination).toBeHidden();
		await expect(n8n.ndv.outputPanel.getDataContainer().locator('mark').first()).toBeVisible();

		// Clear search - back to 35 items with pagination
		await searchInput.clear();
		await expect(pagination.locator('li')).toHaveCount(2);
	});

	test('should filter input/output data separately', async ({ n8n }) => {
		const canvasNodes = n8n.canvas.getCanvasNodes();
		await canvasNodes.nth(1).dblclick();

		await expect(n8n.ndv.outputPanel.getDataContainer()).toBeVisible();
		await expect(n8n.ndv.inputPanel.getDataContainer()).toBeVisible();

		await n8n.ndv.inputPanel.switchDisplayMode('table');

		await expect(n8n.ndv.outputPanel.getSearchContainer()).toBeVisible();

		await n8n.page.keyboard.press('/');
		await expect(n8n.ndv.outputPanel.getSearchInput()).not.toBeFocused();

		const inputSearchInput = n8n.ndv.inputPanel.getSearchInput();
		await expect(inputSearchInput).toBeFocused();

		const getInputPagination = () => n8n.ndv.inputPanel.get().getByTestId('ndv-data-pagination');
		const getInputCounter = () => n8n.ndv.inputPanel.getItemsCount();
		const getOutputPagination = () => n8n.ndv.outputPanel.get().getByTestId('ndv-data-pagination');
		const getOutputCounter = () => n8n.ndv.outputPanel.getItemsCount();

		// 35 items with page size 25 = 2 pages
		await expect(getInputPagination().locator('li')).toHaveCount(2);
		await expect(getInputCounter()).toContainText('35 items');
		await expect(getOutputPagination().locator('li')).toHaveCount(2);
		await expect(getOutputCounter()).toContainText('35 items');

		// Search for 'Reese' - filters to 1 item (< 25, so no pagination)
		await inputSearchInput.fill('Reese');
		await expect(getInputPagination()).toBeHidden();
		await expect(getInputCounter()).toContainText('of 35 items');
		await expect(getOutputPagination().locator('li')).toHaveCount(2);
		await expect(getOutputCounter()).toContainText('35 items');

		// Search for 'zzz' - filters to 0 items, no pagination
		await inputSearchInput.fill('zzz');
		await expect(getInputPagination()).toBeHidden();
		await expect(getInputCounter()).toContainText('of 35 items');
		await expect(getOutputPagination().locator('li')).toHaveCount(2);
		await expect(getOutputCounter()).toContainText('35 items');

		await inputSearchInput.clear();
		await expect(getInputPagination().locator('li')).toHaveCount(2);
		await expect(getInputCounter()).toContainText('35 items');
		await expect(getOutputPagination().locator('li')).toHaveCount(2);
		await expect(getOutputCounter()).toContainText('35 items');

		await n8n.ndv.outputPanel.getDataContainer().click();
		await n8n.page.keyboard.press('/');
		await expect(n8n.ndv.inputPanel.getSearchInput()).not.toBeFocused();

		const outputSearchInput = n8n.ndv.outputPanel.getSearchInput();
		await expect(outputSearchInput).toBeFocused();

		await expect(getInputPagination().locator('li')).toHaveCount(2);
		await expect(getInputCounter()).toContainText('35 items');
		await expect(getOutputPagination().locator('li')).toHaveCount(2);
		await expect(getOutputCounter()).toContainText('35 items');

		// Search for 'Reese' - filters to 1 item (< 25, so no pagination)
		await outputSearchInput.fill('Reese');
		await expect(getInputPagination().locator('li')).toHaveCount(2);
		await expect(getInputCounter()).toContainText('35 items');
		await expect(getOutputPagination()).toBeHidden();
		await expect(getOutputCounter()).toContainText('of 35 items');

		// Search for 'zzz' - filters to 0 items, no pagination
		await outputSearchInput.fill('zzz');
		await expect(getInputPagination().locator('li')).toHaveCount(2);
		await expect(getInputCounter()).toContainText('35 items');
		await expect(getOutputPagination()).toBeHidden();
		await expect(getOutputCounter()).toContainText('of 35 items');

		await outputSearchInput.clear();
		await expect(getInputPagination().locator('li')).toHaveCount(2);
		await expect(getInputCounter()).toContainText('35 items');
		await expect(getOutputPagination().locator('li')).toHaveCount(2);
		await expect(getOutputCounter()).toContainText('35 items');
	});
});
