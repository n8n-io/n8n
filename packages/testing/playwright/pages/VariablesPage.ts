import { expect, type Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class VariablesPage extends BasePage {
	getUnavailableResourcesList() {
		return this.page.getByTestId('unavailable-resources-list');
	}

	getResourcesList() {
		return this.page.getByTestId('resources-list');
	}

	getEmptyResourcesList() {
		return this.page.getByTestId('empty-resources-list');
	}

	getEmptyResourcesListNewVariableButton() {
		return this.getEmptyResourcesList().locator('button');
	}

	getSearchBar() {
		return this.page.getByTestId('resources-list-search');
	}

	getCreateVariableButton() {
		return this.page.getByTestId('resources-list-add');
	}

	getVariablesRows() {
		return this.page.getByTestId('variables-row');
	}

	getVariablesEditableRows() {
		return this.page.getByTestId('variables-row').filter({ has: this.page.locator('input') });
	}

	getVariableRow(key: string) {
		return this.getVariablesRows().filter({ hasText: key });
	}

	getEditableRowCancelButton(row: Locator) {
		return row.getByTestId('variable-row-cancel-button');
	}

	getEditableRowSaveButton(row: Locator) {
		return row.getByTestId('variable-row-save-button');
	}

	async createVariable(key: string, value: string) {
		await this.getCreateVariableButton().click();

		const editingRow = this.getVariablesEditableRows().first();
		await this.setRowValue(editingRow, 'key', key);
		await this.setRowValue(editingRow, 'value', value);
		await this.saveRowEditing(editingRow);
	}

	async createVariableFromEmptyState(key: string, value: string) {
		await this.getEmptyResourcesListNewVariableButton().click();

		const editingRow = this.getVariablesEditableRows().first();
		await this.setRowValue(editingRow, 'key', key);
		await this.setRowValue(editingRow, 'value', value);
		await this.saveRowEditing(editingRow);
	}

	async deleteVariable(key: string) {
		const row = this.getVariableRow(key);
		await row.getByTestId('variable-row-delete-button').click();

		// Use a more specific selector to avoid strict mode violation with other dialogs
		const modal = this.page.getByRole('dialog').filter({ hasText: 'Delete variable' });
		await expect(modal).toBeVisible();
		await modal.locator('.btn--confirm').click();
	}

	async editRow(key: string) {
		const row = this.getVariableRow(key);
		await row.getByTestId('variable-row-edit-button').click();
	}

	async setRowValue(row: Locator, field: 'key' | 'value', value: string) {
		const input = row.getByTestId(`variable-row-${field}-input`).locator('input, textarea');
		await input.selectText();
		await input.fill(value);
	}

	async saveRowEditing(row: Locator) {
		await this.getEditableRowSaveButton(row).click();
	}

	async cancelRowEditing(row: Locator) {
		await this.getEditableRowCancelButton(row).click();
	}
}
