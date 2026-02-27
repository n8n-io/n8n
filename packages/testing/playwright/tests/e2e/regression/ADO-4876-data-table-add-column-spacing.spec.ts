import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'ADO-4876: Data table add column button missing spacing',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ n8n, api }) => {
			await api.enableFeature('sharing');
			await api.enableFeature('folders');
			await api.enableFeature('advancedPermissions');
			await api.enableFeature('projectRole:admin');
			await api.enableFeature('projectRole:editor');
			await api.setMaxTeamProjectsQuota(-1);
			await n8n.goHome();

			// Create a data table to test the add column button
			await n8n.sideBar.clickPersonalMenuItem();
			const testDataTableName = `Data Table ${nanoid(8)}`;
			await n8n.projectTabs.clickDataTablesTab();
			await n8n.dataTable.clickAddDataTableAction();
			await n8n.dataTableComposer.createNewDataTable(testDataTableName);
		});

		test('Should have right padding on add column button in table header', async ({ n8n }) => {
			await expect(n8n.dataTableDetails.getPageWrapper()).toBeVisible();

			// Get the add column header button in the table
			const addColumnButton = n8n.dataTableDetails.getAddColumnTableButton();
			await expect(addColumnButton).toBeVisible();

			// Get the bounding box of the button
			const buttonBox = await addColumnButton.boundingBox();
			expect(buttonBox).not.toBeNull();

			// Get the parent header cell that contains the button
			const headerCell = n8n.page.locator('.ag-header-cell[col-id="add-column"]');
			await expect(headerCell).toBeVisible();

			const headerBox = await headerCell.boundingBox();
			expect(headerBox).not.toBeNull();

			// The button should not be flush against the right edge of the header
			// There should be some spacing (at least 8px based on standard spacing conventions)
			const rightSpacing = headerBox!.x + headerBox!.width - (buttonBox!.x + buttonBox!.width);

			// This test will FAIL initially because the bug exists
			// Expected: at least 8px of padding on the right
			// Actual: 0px or very minimal spacing
			expect(rightSpacing).toBeGreaterThanOrEqual(8);
		});

		test('Should have consistent spacing with other header cells', async ({ n8n }) => {
			await expect(n8n.dataTableDetails.getPageWrapper()).toBeVisible();

			// Add a regular column to compare spacing
			await n8n.dataTableDetails.addColumn('test-column', 'string', 'header');

			// Get the add column button and its parent cell
			const addColumnButton = n8n.dataTableDetails.getAddColumnTableButton();
			const addColumnHeaderCell = n8n.page.locator('.ag-header-cell[col-id="add-column"]');

			await expect(addColumnButton).toBeVisible();
			await expect(addColumnHeaderCell).toBeVisible();

			const buttonBox = await addColumnButton.boundingBox();
			const addColumnCellBox = await addColumnHeaderCell.boundingBox();

			expect(buttonBox).not.toBeNull();
			expect(addColumnCellBox).not.toBeNull();

			// Check the wrapper div around the button has proper styling
			const wrapperDiv = addColumnHeaderCell.locator('.add-column-header-component-wrapper');
			await expect(wrapperDiv).toBeVisible();

			// The wrapper should have some computed padding or margin
			const wrapperBox = await wrapperDiv.boundingBox();
			expect(wrapperBox).not.toBeNull();

			// Verify the button is not flush to the right edge of the cell
			const rightGap = addColumnCellBox!.x + addColumnCellBox!.width - (buttonBox!.x + buttonBox!.width);

			// This should fail due to the bug - there should be at least some padding
			expect(rightGap).toBeGreaterThan(4); // At least 4px of breathing room
		});

		test('Should have appropriate visual spacing for the add column button', async ({ n8n }) => {
			await expect(n8n.dataTableDetails.getPageWrapper()).toBeVisible();

			// Locate the add column header cell
			const addColumnHeaderCell = n8n.page.locator('.ag-header-cell[col-id="add-column"]');
			await expect(addColumnHeaderCell).toBeVisible();

			// Take a screenshot to visually verify the spacing issue
			// The button should not appear cramped against the right edge
			const screenshot = await addColumnHeaderCell.screenshot();
			expect(screenshot).toBeDefined();

			// Get the computed style of the header cell
			const cellStyles = await addColumnHeaderCell.evaluate((el) => {
				const computed = window.getComputedStyle(el);
				return {
					paddingRight: computed.paddingRight,
					paddingLeft: computed.paddingLeft,
				};
			});

			// The add column header should have consistent padding
			// This will likely fail because the cell doesn't have adequate padding-right
			const paddingRightValue = parseInt(cellStyles.paddingRight);
			expect(paddingRightValue).toBeGreaterThanOrEqual(8); // Should have at least 8px padding
		});

		test('Should visually verify add column button is not flush to edge (visual regression)', async ({
			n8n,
		}) => {
			await expect(n8n.dataTableDetails.getPageWrapper()).toBeVisible();

			// Add a column to make the table more realistic
			await n8n.dataTableDetails.addColumn('name', 'string', 'header');

			// Get the table header area
			const headerRow = n8n.page.locator('.ag-header-row');
			await expect(headerRow).toBeVisible();

			// The add column button
			const addColumnButton = n8n.dataTableDetails.getAddColumnTableButton();
			await expect(addColumnButton).toBeVisible();

			// Get the position and dimensions
			const buttonBounds = await addColumnButton.boundingBox();
			const headerBounds = await headerRow.boundingBox();

			expect(buttonBounds).not.toBeNull();
			expect(headerBounds).not.toBeNull();

			// Calculate how close the button is to the right edge of the visible header
			const distanceFromRightEdge =
				headerBounds!.x + headerBounds!.width - (buttonBounds!.x + buttonBounds!.width);

			// This test documents the bug: the button should have spacing from the edge
			// With the bug, this will be very small or even negative
			// After fix, there should be at least 8-12px of spacing
			expect(distanceFromRightEdge).toBeGreaterThanOrEqual(8);
		});
	},
);
