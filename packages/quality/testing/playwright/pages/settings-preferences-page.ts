import { BasePage } from './BasePage';

export class SettingsPreferencesPage extends BasePage {
	async goto() {
		await this.page.goto('/settings/context/preferences');
	}

	async editPreference(content: string) {
		await this.page.getByTestId('preferences-table').getByText(content, { exact: true }).click();
	}

	getModal() {
		return this.page.getByTestId('preference-modal');
	}

	getDialogBody() {
		return this.getModal().locator('[data-slot="dialog-body"]');
	}

	getContentInput() {
		return this.getModal().getByTestId('preference-modal-text-input').getByRole('textbox');
	}

	getScopeSelect() {
		return this.getModal().getByTestId('preference-modal-scope-select');
	}

	getScopeDropdown() {
		return this.getScopeSelect().locator('.el-select__popper');
	}

	getScopeControl() {
		return this.getScopeSelect().getByRole('combobox');
	}

	getScopeOption(name: string) {
		return this.getScopeDropdown().getByRole('option', { name, exact: true });
	}
}
