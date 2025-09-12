import { BasePage } from './BasePage';

export class PersonalSettingsPage extends BasePage {
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

	getEmailField() {
		return this.getPersonalDataForm().locator('input[name="email"]');
	}

	getSaveSettingsButton() {
		return this.page.getByTestId('save-settings-button');
	}

	async fillPersonalData(firstName: string, lastName: string) {
		await this.getFirstNameField().fill(firstName);
		await this.getLastNameField().fill(lastName);
	}

	async fillEmail(email: string) {
		await this.getEmailField().fill(email);
	}

	async saveSettings() {
		await this.getSaveSettingsButton().click();
	}

	async updateEmail(newEmail: string) {
		await this.goToPersonalSettings();
		await this.fillEmail(newEmail);
		await this.saveSettings();
	}

	async updateFirstAndLastName(firstName: string, lastName: string) {
		await this.goToPersonalSettings();
		await this.fillPersonalData(firstName, lastName);
		await this.saveSettings();
	}

	// MFA-related getters
	getEnableMfaButton() {
		return this.page.getByTestId('enable-mfa-button');
	}

	getDisableMfaButton() {
		return this.page.getByTestId('disable-mfa-button');
	}

	// MFA-related actions
	async clickEnableMfa() {
		await this.getEnableMfaButton().click();
	}

	async clickDisableMfa() {
		await this.getDisableMfaButton().click();
	}

	async triggerDisableMfa() {
		await this.goToPersonalSettings();
		await this.clickDisableMfa();
	}

	async waitForMfaQrResponse(): Promise<void> {
		await this.page.waitForResponse(
			(response) => response.url().includes('/rest/mfa/qr') && response.status() === 200,
		);
	}
}
