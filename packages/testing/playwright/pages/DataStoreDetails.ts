import { expect } from '@playwright/test';

import { BasePage } from './BasePage';

export class DataStoreDetails extends BasePage {
	getPageWrapper() {
		return this.page.getByTestId('data-table-details-view');
	}

	getDataTableProjectBreadcrumb() {
		return this.page.getByTestId('home-project');
	}

	getDataTableBreadcrumb() {
		return this.page.getByTestId('datastore-header-name-input');
	}

	async renameDataTable(newName: string) {
		const nameInput = this.getDataTableBreadcrumb();
		await nameInput.click();

		const input = nameInput.locator('input');
		await input.fill('');

		await input.fill(newName);

		await input.press('Enter');
	}

	getVisibleColumns() {
		return this.page.getByTestId('data-store-column-header');
	}

	getNoRowsMessage() {
		return this.page.getByTestId('data-store-no-rows-overlay');
	}

	getAddColumnHeaderButton() {
		return this.page.getByTestId('data-store-add-column-trigger-button').first();
	}

	getAddColumnPopoverContent() {
		return this.page.getByTestId('add-column-popover-content');
	}

	getAddColumnSubmitButton() {
		return this.page.getByTestId('data-store-add-column-submit-button');
	}

	getColumnHeaderByName(name: string) {
		return this.page
			.getByTestId('data-store-column-header')
			.filter({ has: this.page.getByTestId('data-store-column-header-text').getByText(name) });
	}

	async getColumnIdByName(name: string): Promise<string> {
		const columnHeader = this.page
			.getByRole('columnheader')
			.filter({ has: this.page.getByTestId('data-store-column-header-text').getByText(name) });

		const colId = await columnHeader.getAttribute('col-id');
		if (!colId) {
			throw new Error(`Could not find col-id for column with name: ${name}`);
		}
		return colId;
	}

	async addColumn(name: string, type: 'string' | 'number' | 'boolean' | 'date') {
		await this.getAddColumnHeaderButton().click();
		await this.getAddColumnPopoverContent().waitFor({ state: 'visible' });

		const nameInput = this.page
			.getByTestId('add-column-popover-content')
			.locator('input[type="text"]')
			.first();
		await nameInput.fill(name);

		const typeSelect = this.page
			.getByTestId('add-column-popover-content')
			.locator('.n8n-select')
			.first();
		await typeSelect.click();

		const typeLabel = type === 'date' ? 'datetime' : type;
		await this.page.getByRole('option', { name: typeLabel, exact: true }).click();

		await this.getAddColumnSubmitButton().click();

		await this.getAddColumnPopoverContent().waitFor({ state: 'hidden' });
	}

	getAddRowHeaderButton() {
		return this.page.getByTestId('data-store-header-add-row-button');
	}

	getAddRowTableButton() {
		return this.page.locator('[data-test-id="data-store-grid"] .add-row-cell button');
	}

	getAddColumnTableButton() {
		return this.page.getByTestId('data-store-add-column-trigger-button').last();
	}

	async addRow() {
		await this.getAddRowHeaderButton().click();
	}

	async addRowFromTable() {
		await this.getAddRowTableButton().click();
	}

	async addColumnFromTable(name: string, type: 'string' | 'number' | 'boolean' | 'date') {
		await this.getAddColumnTableButton().click();
		await this.getAddColumnPopoverContent().waitFor({ state: 'visible' });

		const nameInput = this.page
			.getByTestId('add-column-popover-content')
			.locator('input[type="text"]')
			.first();
		await nameInput.fill(name);

		const typeSelect = this.page
			.getByTestId('add-column-popover-content')
			.locator('.n8n-select')
			.first();
		await typeSelect.click();

		const typeLabel = type === 'date' ? 'datetime' : type;
		await this.page.getByRole('option', { name: typeLabel, exact: true }).click();

		await this.getAddColumnSubmitButton().click();

		await this.getAddColumnPopoverContent().waitFor({ state: 'hidden' });
	}

	getDataGrid() {
		return this.page.getByTestId('data-store-grid');
	}

	getDataRows() {
		return this.page.locator(
			'[data-test-id="data-store-grid"] .ag-center-cols-container [row-index]',
		);
	}

	getRowSelectionCheckbox(rowIndex: number) {
		return this.page.locator(
			`[data-test-id="data-store-grid"] .ag-center-cols-container [row-index="${rowIndex}"] [col-id="ag-Grid-SelectionColumn"] input[type="checkbox"]`,
		);
	}

	async selectRow(rowIndex: number) {
		const checkbox = this.getRowSelectionCheckbox(rowIndex);
		await checkbox.check();
	}

	getSelectedItemsInfo() {
		return this.page.getByTestId('selected-items-info');
	}

	getDeleteSelectedButton() {
		return this.page.getByTestId('delete-selected-button');
	}

	getClearSelectionButton() {
		return this.page.getByTestId('clear-selection-button');
	}

	async deleteSelectedRows() {
		await this.getDeleteSelectedButton().click();
		const confirmButton = this.page.locator('.btn--confirm');
		await confirmButton.click();
	}

	async clearSelection() {
		await this.getClearSelectionButton().click();
	}

	getColumnHeaderActions(columnName: string) {
		const columnHeader = this.page.getByRole('columnheader').filter({
			has: this.page.getByTestId('data-store-column-header-text').getByText(columnName),
		});
		return columnHeader.getByTestId('data-store-column-header-actions');
	}

	async deleteColumn(columnName: string) {
		const columnHeader = this.page.getByTestId('data-store-column-header').filter({
			has: this.page.getByTestId('data-store-column-header-text').getByText(columnName),
		});
		await columnHeader.hover();

		const actionsButton = this.getColumnHeaderActions(columnName);
		await actionsButton.click();

		await this.page
			.getByTestId('data-store-column-header-actions-item-delete')
			.filter({ visible: true })
			.click();

		const confirmButton = this.page.locator('.btn--confirm');
		await confirmButton.click();
	}

	async openColumnFilter(columnName: string) {
		const columnHeader = this.page.getByRole('columnheader').filter({
			has: this.page.getByTestId('data-store-column-header-text').getByText(columnName),
		});
		await columnHeader.hover();

		const filterButton = columnHeader.getByTestId('data-store-column-header-filter-button');
		await filterButton.click();
	}

	async clearColumnFilter(columnName: string) {
		await this.openColumnFilter(columnName);
		const filterPanel = this.page.locator('.ag-filter');
		await filterPanel.locator('[data-ref="resetFilterButton"]').click();
	}

	async setTextFilter(columnName: string, value: string) {
		await this.openColumnFilter(columnName);

		const filterPanel = this.page.locator('.ag-filter');
		await filterPanel.waitFor({ state: 'visible' });

		const filterInput = filterPanel.locator('input[type="text"]').first();
		await filterInput.fill(value);

		await this.page.keyboard.press('Enter');
	}

	async setNumberFilter(
		columnName: string,
		value: string,
		condition: 'equals' | 'greaterThan' | 'lessThan' = 'equals',
	) {
		await this.openColumnFilter(columnName);

		const filterPanel = this.page.locator('.ag-filter');
		await filterPanel.waitFor({ state: 'visible' });

		if (condition !== 'equals') {
			await this.page.locator('.ag-picker-field-icon').click();
			await this.page
				.locator('.ag-select-list-item')
				.filter({ hasText: condition === 'greaterThan' ? 'Greater than' : 'Less than' })
				.first()
				.click();
		}

		const filterInput = filterPanel.locator('input[type="number"]').first();
		await filterInput.fill(value);
		// Wait for the value to be set before pressing Enter
		await expect(filterInput).toHaveValue(value);

		await this.page.keyboard.press('Enter');
	}

	async setBooleanFilter(columnName: string, value: boolean) {
		await this.openColumnFilter(columnName);

		const filterPanel = this.page.locator('.ag-filter');
		await filterPanel.waitFor({ state: 'visible' });

		await this.page.locator('.ag-picker-field-icon').click();
		await this.page
			.locator('.ag-select-list-item')
			.filter({ hasText: value ? 'True' : 'False' })
			.click();
	}

	async setDateFilter(
		columnName: string,
		value: string,
		condition: 'equals' | 'greaterThan' | 'lessThan' = 'equals',
	) {
		await this.openColumnFilter(columnName);

		const filterPanel = this.page.locator('.ag-filter');
		await filterPanel.waitFor({ state: 'visible' });

		if (condition !== 'equals') {
			await this.page.locator('.ag-picker-field-icon').click();
			await this.page
				.locator('.ag-select-list-item')
				.filter({ hasText: condition === 'greaterThan' ? 'Greater than' : 'Less than' })
				.first()
				.click();
		}

		const filterInput = filterPanel.locator('input').first();
		await filterInput.fill(value);

		await this.page.keyboard.press('Enter');
	}

	getPagination() {
		return this.page.getByTestId('data-store-content-pagination');
	}

	async setPageSize(size: '10' | '20' | '50') {
		const pagination = this.getPagination();
		const selectTrigger = pagination.locator('.el-pagination__sizes .el-select');
		await selectTrigger.click();
		await this.page.getByRole('option').getByText(`${size}/page`).click();
	}

	getCell(rowIndex: number, columnId: string) {
		const cell = this.page.locator(
			`[data-test-id="data-store-grid"] .ag-center-cols-container [row-index="${rowIndex}"] [col-id="${columnId}"]`,
		);
		return cell;
	}

	async getCellValue(
		rowIndex: number,
		columnId: string,
		type: 'string' | 'number' | 'boolean' | 'date',
	): Promise<string> {
		const cell = this.getCell(rowIndex, columnId);

		if (type === 'boolean') {
			const checkbox = cell.locator('input[type="checkbox"]');
			const isChecked = await checkbox.isChecked();
			return isChecked ? 'true' : 'false';
		} else {
			const text = await cell.textContent();
			return text?.trim() || '';
		}
	}

	async setCellValue(
		rowIndex: number,
		columnId: string,
		value: string,
		type: 'string' | 'number' | 'boolean' | 'date',
		options?: { skipDoubleClick?: boolean },
	) {
		const cell = this.getCell(rowIndex, columnId);

		if (!options?.skipDoubleClick) {
			await cell.dblclick();
		}

		if (type === 'string') {
			const input = this.page.locator('.ag-text-area-input');
			await input.fill(value);
			await input.press('Enter');
		} else if (type === 'date') {
			const input = this.page.locator('#datastore-datepicker');
			await input.fill(value);
			await input.press('Enter');
		} else if (type === 'boolean') {
			const checkbox = cell.locator('input[type="checkbox"]');
			const shouldBeChecked = value === 'true' || value === '1';

			if (shouldBeChecked) {
				await checkbox.check();
			} else {
				await checkbox.uncheck();
			}
			await this.page.keyboard.press('Enter');
		} else if (type === 'number') {
			const input = cell.locator('input');
			await input.fill(value);
			await input.press('Enter');
		}
	}
}
