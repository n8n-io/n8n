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

	async disableMfaWithCode(code: string) {
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

	// Complete MFA enable flow matching Cypress exactly
	async enableMfa(): Promise<string> {
		await this.goToPersonalSettings();

		// Set up intercept for MFA QR code request (like Cypress @getMfaQrCode)
		const qrCodePromise = this.page.waitForResponse(
			(response) => response.url().includes('/rest/mfa/qr') && response.status() === 200,
		);

		await this.clickEnableMfa();

		// Wait for QR code request to complete (like Cypress cy.wait('@getMfaQrCode'))
		await qrCodePromise;

		// Complete the MFA setup using the modal (gets secret from clipboard like Cypress)
		const { MfaSetupModal } = await import('./MfaSetupModal');
		const mfaSetupModal = new MfaSetupModal(this.page);
		const actualSecret = await mfaSetupModal.completeMfaSetup();

		// Return the actual secret so tests can use it for login
		return actualSecret;
	}

	async disableMfa(code: string) {
		await this.goToPersonalSettings();
		await this.disableMfaWithCode(code);
	}
}
