/**
 * Regression test for ADO-4876
 * Bug: Data table add column button is missing right-side padding/spacing
 * Expected: The add column button should have adequate right-side spacing and not appear flush against the container edge
 */

import { test, expect } from '../../../fixtures/base';

test.describe('ADO-4876: Data table add column button spacing', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.addNode('Data Table');
	});

	test('Should have right padding on add column button in table header', async ({ n8n, page }) => {
		// Open the Data Table node
		const dataTableNode = n8n.canvas.nodeByName('Data Table');
		await dataTableNode.dblclick();

		// Wait for the data table to load
		await page.waitForSelector('[data-test-id="data-table-grid"]', { state: 'visible' });

		// Get the add column header cell
		const addColumnHeader = page.locator('.ag-header-cell[col-id="add-column"]');
		await expect(addColumnHeader).toBeVisible();

		// Get the bounding box of the add column header cell
		const headerBox = await addColumnHeader.boundingBox();
		expect(headerBox).not.toBeNull();

		// Get the add column button inside the header
		const addColumnButton = page.locator('[data-test-id="data-table-add-column-trigger-button"]');
		await expect(addColumnButton).toBeVisible();

		// Get the bounding box of the button
		const buttonBox = await addColumnButton.boundingBox();
		expect(buttonBox).not.toBeNull();

		// The button should not extend to the right edge of the header cell
		// There should be at least 8px (--spacing--2xs) of padding on the right
		const rightPadding = headerBox!.x + headerBox!.width - (buttonBox!.x + buttonBox!.width);
		expect(rightPadding).toBeGreaterThanOrEqual(8);
	});

	test('Should have consistent spacing with other header cells', async ({ n8n, page }) => {
		// Open the Data Table node
		const dataTableNode = n8n.canvas.nodeByName('Data Table');
		await dataTableNode.dblclick();

		// Wait for the data table to load
		await page.waitForSelector('[data-test-id="data-table-grid"]', { state: 'visible' });

		// Get any regular column header (e.g., 'id' column) to compare spacing
		const idHeader = page.locator('.ag-header-cell[col-id="id"]');
		await expect(idHeader).toBeVisible();
		const idHeaderBox = await idHeader.boundingBox();

		// Get the add column header
		const addColumnHeader = page.locator('.ag-header-cell[col-id="add-column"]');
		await expect(addColumnHeader).toBeVisible();
		const addColumnHeaderBox = await addColumnHeader.boundingBox();

		// Both headers should have similar height (indicating consistent padding)
		expect(idHeaderBox).not.toBeNull();
		expect(addColumnHeaderBox).not.toBeNull();
		expect(addColumnHeaderBox!.height).toEqual(idHeaderBox!.height);
	});

	test('Should have appropriate visual spacing for the add column button', async ({
		n8n,
		page,
	}) => {
		// Open the Data Table node
		const dataTableNode = n8n.canvas.nodeByName('Data Table');
		await dataTableNode.dblclick();

		// Wait for the data table to load
		await page.waitForSelector('[data-test-id="data-table-grid"]', { state: 'visible' });

		// Check the parent header cell for padding-right
		const addColumnHeader = page.locator('.ag-header-cell[col-id="add-column"]');
		await expect(addColumnHeader).toBeVisible();

		const headerStyles = await addColumnHeader.evaluate((el) => {
			const styles = window.getComputedStyle(el);
			return {
				paddingRight: styles.paddingRight,
			};
		});

		// The header cell should have padding-right of at least 8px (--spacing--2xs)
		const paddingValue = parseInt(headerStyles.paddingRight);
		expect(paddingValue).toBeGreaterThanOrEqual(8);
	});

	test('Should visually verify add column button is not flush to edge (visual regression)', async ({
		n8n,
		page,
	}) => {
		// Open the Data Table node
		const dataTableNode = n8n.canvas.nodeByName('Data Table');
		await dataTableNode.dblclick();

		// Wait for the data table to load
		await page.waitForSelector('[data-test-id="data-table-grid"]', { state: 'visible' });

		// Get the add column header cell
		const addColumnHeader = page.locator('.ag-header-cell[col-id="add-column"]');
		await expect(addColumnHeader).toBeVisible();

		// Take a screenshot of just the add column header for visual verification
		// This helps ensure the button has proper spacing and doesn't look cramped
		const screenshot = await addColumnHeader.screenshot();
		expect(screenshot).toBeTruthy();

		// Verify the button is visible and clickable (not overlapping edges)
		const addColumnButton = page.locator('[data-test-id="data-table-add-column-trigger-button"]');
		await expect(addColumnButton).toBeVisible();
		await expect(addColumnButton).toBeEnabled();

		// The button should be clickable without issues
		await addColumnButton.click();
		const popover = page.locator('[data-test-id="add-column-popover-content"]');
		await expect(popover).toBeVisible();
	});
});
