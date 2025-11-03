import { expect } from '@playwright/test';
import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class DataTableDetails extends BasePage {
	getPageWrapper() {
		return this.page.getByTestId('data-table-details-view');
	}

	getDataTableProjectBreadcrumb() {
		return this.page.getByTestId('home-project');
	}

	getDataTableBreadcrumb() {
		return this.page.getByTestId('data-table-header-name-input');
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
		return this.page.getByTestId('data-table-column-header');
	}

	getNoRowsMessage() {
		return this.page.getByTestId('data-table-no-rows-overlay');
	}

	getAddColumnHeaderButton() {
		return this.page.getByTestId('data-table-add-column-trigger-button').first();
	}

	getAddColumnTableButton() {
		return this.page.getByTestId('data-table-add-column-trigger-button').last();
	}

	getAddColumnPopoverContent() {
		return this.page.getByTestId('add-column-popover-content');
	}

	getAddColumnSubmitButton() {
		return this.page.getByTestId('data-table-add-column-submit-button');
	}

	getColumnHeaderByName(name: string) {
		return this.page
			.getByTestId('data-table-column-header')
			.filter({ has: this.page.getByTestId('data-table-column-header-text').getByText(name) });
	}

	async getColumnIdByName(name: string): Promise<string> {
		const columnHeader = this.page
			.getByRole('columnheader')
			.filter({ has: this.page.getByTestId('data-table-column-header-text').getByText(name) });

		const colId = await columnHeader.getAttribute('col-id');
		if (!colId) {
			throw new Error(`Could not find col-id for column with name: ${name}`);
		}
		return colId;
	}

	async addColumn(
		name: string,
		type: 'string' | 'number' | 'boolean' | 'date',
		source: 'header' | 'table',
	) {
		if (source === 'header') {
			await this.getAddColumnHeaderButton().click();
		} else {
			await this.getAddColumnTableButton().click();
		}
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
		return this.page.getByTestId('data-table-header-add-row-button');
	}

	getAddRowTableButton() {
		return this.page.locator('[data-test-id="data-table-grid"] .add-row-cell button');
	}

	async addRow() {
		await this.getAddRowHeaderButton().click();
	}

	async addRowFromTable() {
		await this.getAddRowTableButton().click();
	}

	getDataGrid() {
		return this.page.getByTestId('data-table-grid');
	}

	getDataRows() {
		return this.page.locator(
			'[data-test-id="data-table-grid"] .ag-center-cols-container [row-index]',
		);
	}

	getRowSelectionCheckbox(rowIndex: number) {
		return this.page.locator(
			`[data-test-id="data-table-grid"] .ag-center-cols-container [row-index="${rowIndex}"] [col-id="ag-Grid-SelectionColumn"] input[type="checkbox"]`,
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
			has: this.page.getByTestId('data-table-column-header-text').getByText(columnName),
		});
		return columnHeader.getByTestId('data-table-column-header-actions');
	}

	async deleteColumn(columnName: string) {
		const columnHeader = this.page.getByTestId('data-table-column-header').filter({
			has: this.page.getByTestId('data-table-column-header-text').getByText(columnName),
		});
		await columnHeader.hover();

		const actionsButton = this.getColumnHeaderActions(columnName);
		await actionsButton.click();

		await this.page
			.getByTestId('data-table-column-header-actions-item-delete')
			.filter({ visible: true })
			.click();

		const confirmButton = this.page.locator('.btn--confirm');
		await confirmButton.click();
	}

	async openColumnFilter(columnName: string) {
		const columnHeader = this.page.getByRole('columnheader').filter({
			has: this.page.getByTestId('data-table-column-header-text').getByText(columnName),
		});
		await columnHeader.hover();

		const filterButton = columnHeader.getByTestId('data-table-column-header-filter-button');
		await filterButton.click();
	}

	private async openFilterPanelAndWait(columnName: string) {
		await this.openColumnFilter(columnName);
		const filterPanel = this.page.locator('.ag-filter');
		await filterPanel.waitFor({ state: 'visible' });
		return filterPanel;
	}

	private async selectPickerOption(label: string) {
		await this.page.locator('.ag-picker-field-icon').click();
		await this.page.locator('.ag-select-list-item').filter({ hasText: label }).first().click();
	}

	private async selectFilterOperator(condition: 'equals' | 'greaterThan' | 'lessThan') {
		if (condition === 'equals') return;
		const label = condition === 'greaterThan' ? 'Greater than' : 'Less than';
		await this.selectPickerOption(label);
	}

	private async fillFilterValue(
		filterPanel: Locator,
		value: string,
		type: 'text' | 'number' | 'date',
	) {
		let input: Locator;
		if (type === 'number') {
			input = filterPanel.locator('input[type="number"]').first();
		} else if (type === 'text') {
			input = filterPanel.locator('input[type="text"]').first();
		} else {
			input = filterPanel.locator('input').first();
		}
		await input.fill(value);
		return input;
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
		const filterPanel = await this.openFilterPanelAndWait(columnName);
		await this.selectFilterOperator(condition);
		const filterInput = await this.fillFilterValue(filterPanel, value, 'number');
		// Wait for the value to be set before pressing Enter
		await expect(filterInput).toHaveValue(value);
		await this.page.keyboard.press('Enter');
	}

	async setBooleanFilter(columnName: string, value: boolean) {
		await this.openFilterPanelAndWait(columnName);
		await this.selectPickerOption(value ? 'True' : 'False');
	}

	async setDateFilter(
		columnName: string,
		value: string,
		condition: 'equals' | 'greaterThan' | 'lessThan' = 'equals',
	) {
		const filterPanel = await this.openFilterPanelAndWait(columnName);
		await this.selectFilterOperator(condition);
		await this.fillFilterValue(filterPanel, value, 'date');
		await this.page.keyboard.press('Enter');
	}

	getPagination() {
		return this.page.getByTestId('data-table-content-pagination');
	}

	async setPageSize(size: '10' | '20' | '50') {
		const pagination = this.getPagination();
		const selectTrigger = pagination.locator('.el-pagination__sizes .el-select');
		await selectTrigger.click();
		await this.page.getByRole('option').getByText(`${size}/page`).click();
	}

	getCell(rowIndex: number, columnId: string) {
		const cell = this.page.locator(
			`[data-test-id="data-table-grid"] .ag-center-cols-container [row-index="${rowIndex}"] [col-id="${columnId}"]`,
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
			return (text ?? '').trim();
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
			const input = this.page.locator('#data-table-datepicker');
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

	async getColumnOrder(): Promise<string[]> {
		const headers = this.page.getByRole('columnheader');
		const count = await headers.count();
		const columnData: Array<{ index: number; name: string }> = [];

		for (let i = 0; i < count; i++) {
			const header = headers.nth(i);
			const ariaColIndex = await header.getAttribute('aria-colindex');
			const textElement = header.getByTestId('data-table-column-header-text');
			const textCount = await textElement.count();

			if (textCount > 0 && ariaColIndex) {
				const text = await textElement.textContent();
				if (text) {
					columnData.push({
						index: parseInt(ariaColIndex, 10),
						name: text.trim(),
					});
				}
			}
		}

		columnData.sort((a, b) => a.index - b.index);
		return columnData.map((col) => col.name);
	}

	async dragColumnToPosition(sourceColumnName: string, targetColumnName: string) {
		const sourceColumn = this.getColumnHeaderByName(sourceColumnName);
		const targetColumn = this.getColumnHeaderByName(targetColumnName);

		await sourceColumn.dragTo(targetColumn);
	}
}
