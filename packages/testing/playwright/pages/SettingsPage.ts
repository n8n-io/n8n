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

	// MFA-related getters
	getEnableMfaButton() {
		return this.page.getByTestId('enable-mfa-button');
	}

	getDisableMfaButton() {
		return this.page.getByTestId('disable-mfa-button');
	}

	getMfaCodeOrRecoveryCodeInput() {
		return this.page.getByTestId('mfa-code-or-recovery-code-input').locator('input');
	}

	getMfaSaveButton() {
		return this.page.getByTestId('mfa-save-button');
	}

	// MFA-related actions
	async clickEnableMfa() {
		await this.getEnableMfaButton().click();
	}

	async clickDisableMfa() {
		await this.getDisableMfaButton().click();
	}

	async fillMfaCodeOrRecoveryCode(code: string) {
		await this.getMfaCodeOrRecoveryCodeInput().fill(code);
	}

	async clickMfaSave() {
		await this.getMfaSaveButton().click();
	}

	async disableMfa(code: string) {
		await this.goToPersonalSettings();
		await this.clickDisableMfa();
		await this.fillMfaCodeOrRecoveryCode(code);
		await this.clickMfaSave();
	}

	// Email field methods
	getEmailField() {
		return this.getPersonalDataForm().locator('input[name="email"]');
	}

	async fillEmail(email: string) {
		await this.getEmailField().fill(email);
	}

	// Enhanced actions matching Cypress functionality
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

	// Simple method to wait for MFA QR code response (like other settings methods)
	async waitForMfaQrResponse(): Promise<void> {
		await this.page.waitForResponse(
			(response) => response.url().includes('/rest/mfa/qr') && response.status() === 200,
		);
	}
}
