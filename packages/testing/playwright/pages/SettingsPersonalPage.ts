import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

/**
 * Page object for Settings including Personal Settings where users can update their profile and manage MFA.
 */
export class SettingsPersonalPage extends BasePage {
	getMenuItems() {
		return this.page.getByTestId('menu-item');
	}

	async gotoSettings() {
		await this.page.goto('/settings');
	}

	getUserRole(): Locator {
		return this.page.getByTestId('current-user-role');
	}

	async goto(): Promise<void> {
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
	 * Complete workflow to update user's first and last name
	 * @param firstName - The new first name
	 * @param lastName - The new last name
	 */
	async updateFirstAndLastName(firstName: string, lastName: string): Promise<void> {
		await this.goto();
		await this.fillPersonalData(firstName, lastName);
		await this.saveSettings();
	}

	getEnableMfaButton(): Locator {
		return this.page.getByTestId('mfa-method-totp-setup');
	}

	getDisableMfaButton(): Locator {
		return this.page.getByTestId('mfa-method-totp-disable');
	}

	getMfaCodeOrRecoveryCodeInput(): Locator {
		return this.page.locator('input[name="mfaCodeOrMfaRecoveryCode"]');
	}

	getMfaSaveButton(): Locator {
		return this.page.getByTestId('mfa-save-button');
	}

	async clickEnableMfa(): Promise<void> {
		await this.getEnableMfaButton().click();
	}

	async clickDisableMfa(): Promise<void> {
		await this.getDisableMfaButton().click();
	}

	/**
	 * Navigate to personal settings and initiate MFA disable workflow
	 */
	async triggerDisableMfa(): Promise<void> {
		await this.goto();
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

	// --- WebAuthn (passkey + security key) ---

	getPasskeyCard(): Locator {
		return this.page.getByTestId('passkey-card');
	}

	getSecurityKeyCard(): Locator {
		return this.page.getByTestId('mfa-method-security_key');
	}

	/** "Set up" button on the passkey card when no credentials are registered. */
	getEnablePasskeyButton(): Locator {
		return this.page.getByTestId('enable-passkey-button');
	}

	/** "Add another passkey" footer button when at least one passkey is registered. */
	getAddPasskeyButton(): Locator {
		return this.page.getByTestId('add-passkey-button');
	}

	/** "Set up" button on the security-key card when no credentials are registered. */
	getEnableSecurityKeyButton(): Locator {
		return this.page.getByTestId('mfa-method-security_key-setup');
	}

	/** "Add another security key" footer button. */
	getAddSecurityKeyButton(): Locator {
		return this.page.getByTestId('add-security-key-button');
	}

	getWebAuthnModal(): Locator {
		return this.page.getByTestId('webauthnSetupWizard-modal');
	}

	getWebAuthnLabelInput(): Locator {
		return this.page.getByTestId('mfa-webauthn-label-input');
	}

	getWebAuthnRegisterButton(): Locator {
		return this.page.getByTestId('mfa-webauthn-register-button');
	}

	getWebAuthnDoneButton(): Locator {
		return this.page.getByTestId('mfa-webauthn-done-button');
	}

	/**
	 * Find a registered passkey row by its label. Scoped to `[data-test-id^="passkey-cred-"]`
	 * so the label text doesn't accidentally match the description copy ("Use a
	 * physical FIDO2 key like YubiKey…" contains both kind names verbatim).
	 */
	getPasskeyCredentialByLabel(label: string): Locator {
		return this.getPasskeyCard()
			.locator('[data-test-id^="passkey-cred-"]')
			.filter({ hasText: label });
	}

	/** Find a registered security-key row by its label. */
	getSecurityKeyCredentialByLabel(label: string): Locator {
		return this.getSecurityKeyCard()
			.locator('[data-test-id^="security-key-cred-"]')
			.filter({ hasText: label });
	}

	/**
	 * Drive the WebAuthn setup wizard end-to-end. The browser ceremony itself
	 * is served by a virtual authenticator attached via `setupVirtualAuthenticator`
	 * — without one this hangs on the OS prompt.
	 */
	async registerWebAuthnCredential(label: string): Promise<void> {
		await this.getWebAuthnModal().waitFor({ state: 'visible' });
		await this.getWebAuthnLabelInput().fill(label);
		await this.getWebAuthnRegisterButton().click();
	}
}
