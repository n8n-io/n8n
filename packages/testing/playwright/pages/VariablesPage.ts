import { expect } from '@playwright/test';

import { BasePage } from './BasePage';
import { VariableModal } from './components/VariableModal';

export class VariablesPage extends BasePage {
	readonly variableModal = new VariableModal(this.page.getByTestId('variableModal-modal'));

	getUnavailableResourcesList() {
		return this.page.getByTestId('unavailable-resources-list');
	}

	getResourcesList() {
		return this.page.getByTestId('resources-list');
	}

	getEmptyResourcesListNewVariableButton() {
		return this.page.getByRole('button', { name: 'Add first variable' });
	}

	getSearchBar() {
		return this.page.getByTestId('resources-list-search');
	}

	getCreateVariableButton() {
		return this.page.getByTestId('add-resource-variable');
	}

	getVariablesRows() {
		return this.page.getByTestId('variables-row');
	}

	getNoVariablesFoundMessage() {
		return this.page.getByText('No variables found');
	}

	getVariableRow(key: string) {
		return this.getVariablesRows().filter({ hasText: key });
	}

	/**
	 * Create a variable with the key,
	 * @param key - The key of the variable
	 * @param value - The value of the variable
	 */

	async createVariableFromModal(
		key: string,
		value: string,
		{ shouldSave }: { shouldSave: boolean } = { shouldSave: true },
	) {
		await this.variableModal.waitForModal();
		await this.variableModal.addVariable(key, value, { shouldSave });
	}

	async createVariableFromEmptyState(key: string, value: string) {
		await this.getEmptyResourcesListNewVariableButton().click();
		await this.createVariableFromModal(key, value);
	}

	async createVariable(
		key: string,
		value: string,
		{ shouldSave }: { shouldSave: boolean } = { shouldSave: true },
	) {
		await this.getCreateVariableButton().click();
		await this.createVariableFromModal(key, value, { shouldSave });
	}

	async deleteVariable(key: string) {
		const row = this.getVariableRow(key);
		await row.getByTestId('variable-row-delete-button').click();

		// Use a more specific selector to avoid strict mode violation with other dialogs
		const modal = this.page.getByRole('dialog').filter({ hasText: 'Delete variable' });
		await expect(modal).toBeVisible();
		await modal.locator('.btn--confirm').click();
	}

	async editVariable(
		key: string,
		newValue: string,
		{ shouldSave }: { shouldSave: boolean } = { shouldSave: true },
	) {
		const row = this.getVariableRow(key);
		await row.getByTestId('variable-row-edit-button').click();
		await this.createVariableFromModal(key, newValue, { shouldSave });
	}
}
