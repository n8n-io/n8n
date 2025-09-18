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
		await this.getEmailField().press('Enter');
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

	getEnableMfaButton() {
		return this.page.getByTestId('enable-mfa-button');
	}

	getDisableMfaButton() {
		return this.page.getByTestId('disable-mfa-button');
	}

	getMfaCodeOrRecoveryCodeInput() {
		return this.page.locator('input[name="mfaCodeOrMfaRecoveryCode"]');
	}

	getMfaSaveButton() {
		return this.page.getByTestId('mfa-save-button');
	}

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

	async fillMfaCodeAndSave(code: string) {
		await this.getMfaCodeOrRecoveryCodeInput().fill(code);
		await this.getMfaSaveButton().click();
	}

	async waitForMfaQrResponse(): Promise<void> {
		await this.page.waitForResponse(
			(response) => response.url().includes('/rest/mfa/qr') && response.status() === 200,
		);
	}
}
