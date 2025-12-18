import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

/**
 * Page object for Settings including Personal Settings where users can update their profile and manage MFA.
 */
export class SettingsPersonalPage extends BasePage {
	getChangePasswordLink(): Locator {
		return this.page.getByTestId('change-password-link');
	}

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

	getUserRole(): Locator {
		return this.page.getByTestId('current-user-role');
	}

	async goToPersonalSettings(): Promise<void> {
		await this.page.goto('/settings/personal');
	}

	getPersonalDataForm(): Locator {
		return this.page.getByTestId('personal-data-form');
	}

	getFirstNameField(): Locator {
		return this.getPersonalDataForm().locator('input[name="firstName"]');
	}

	getLastNameField(): Locator {
		return this.getPersonalDataForm().locator('input[name="lastName"]');
	}

	getEmailField(): Locator {
		return this.getPersonalDataForm().locator('input[name="email"]');
	}

	getSaveSettingsButton(): Locator {
		return this.page.getByTestId('save-settings-button');
	}

	async fillPersonalData(firstName: string, lastName: string): Promise<void> {
		await this.getFirstNameField().fill(firstName);
		await this.getLastNameField().fill(lastName);
	}

	async fillEmail(email: string): Promise<void> {
		await this.getEmailField().fill(email);
	}

	async pressEnterOnEmail(): Promise<void> {
		await this.getEmailField().press('Enter');
	}

	async saveSettings(): Promise<void> {
		await this.getSaveSettingsButton().click();
	}

	/**
	 * Complete workflow to update user's email address
	 * @param newEmail - The new email address to set
	 */
	async updateEmail(newEmail: string): Promise<void> {
		await this.goToPersonalSettings();
		await this.fillEmail(newEmail);
		await this.saveSettings();
	}

	/**
	 * Complete workflow to update user's first and last name
	 * @param firstName - The new first name
	 * @param lastName - The new last name
	 */
	async updateFirstAndLastName(firstName: string, lastName: string): Promise<void> {
		await this.goToPersonalSettings();
		await this.fillPersonalData(firstName, lastName);
		await this.saveSettings();
	}

	getEnableMfaButton(): Locator {
		return this.page.getByTestId('enable-mfa-button');
	}

	getDisableMfaButton(): Locator {
		return this.page.getByTestId('disable-mfa-button');
	}

	getMfaCodeOrRecoveryCodeInput(): Locator {
		return this.page.locator('input[name="mfaCodeOrMfaRecoveryCode"]');
	}

	getMfaSaveButton(): Locator {
		return this.page.getByTestId('mfa-save-button');
	}

	async clickEnableMfa(): Promise<void> {
		await this.clickByTestId('enable-mfa-button');
	}

	async clickDisableMfa(): Promise<void> {
		await this.getDisableMfaButton().click();
	}

	/**
	 * Navigate to personal settings and initiate MFA disable workflow
	 */
	async triggerDisableMfa(): Promise<void> {
		await this.goToPersonalSettings();
		await this.clickDisableMfa();
	}

	/**
	 * Fill in MFA code or recovery code and save the form
	 * @param code - MFA token or recovery code
	 */
	async fillMfaCodeAndSave(code: string): Promise<void> {
		await this.getMfaCodeOrRecoveryCodeInput().fill(code);
		await this.getMfaSaveButton().click();
	}

	getUpgradeCta(): Locator {
		return this.page.getByTestId('public-api-upgrade-cta');
	}

	async changeTheme(theme: 'System default' | 'Light theme' | 'Dark theme') {
		await this.page.getByTestId('theme-select').click();
		await this.page.getByRole('option', { name: theme }).click();
		await this.getSaveSettingsButton().click();
	}

	currentPassword(): Locator {
		return this.page.locator('input[name="currentPassword"]');
	}

	newPassword(): Locator {
		return this.page.locator('input[name="password"]');
	}

	repeatPassword(): Locator {
		return this.page.locator('input[name="password2"]');
	}

	changePasswordModal(): Locator {
		return this.page.getByTestId('changePassword-modal');
	}

	changePasswordButton(): Locator {
		return this.changePasswordModal().getByRole('button', { name: 'Change password' });
	}

	emailBox(): Locator {
		return this.page.getByTestId('email');
	}
}
