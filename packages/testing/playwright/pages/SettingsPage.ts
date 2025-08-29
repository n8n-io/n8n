import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
	getMenuItems() {
		return this.page.getByTestId('menu-item');
	}

	getMenuItem(id: string) {
		return this.page.getByTestId('menu-item').getByTestId(id);
	}

	getMenuItemByText(text: string) {
		return this.page.getByTestId('menu-item').getByText(text, { exact: true });
	}

	async goToSettings() {
		await this.page.goto('/settings');
	}

	async goToPersonalSettings() {
		await this.page.goto('/settings/personal');
	}

	getPersonalDataForm() {
		return this.page.getByTestId('personal-data-form');
	}

	getFirstNameField() {
		return this.getPersonalDataForm().locator('input[name="firstName"]');
	}

	getLastNameField() {
		return this.getPersonalDataForm().locator('input[name="lastName"]');
	}

	getSaveSettingsButton() {
		return this.page.getByTestId('save-settings-button');
	}

	async fillPersonalData(firstName: string, lastName: string) {
		await this.getFirstNameField().fill(firstName);
		await this.getLastNameField().fill(lastName);
	}

	async saveSettings() {
		await this.getSaveSettingsButton().click();
	}
}
