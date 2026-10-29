import type { Locator, Response } from '@playwright/test';

import { BasePage } from './BasePage';
import { SettingsSidebar } from './components/SettingsSidebar';

/**
 * Page object for Settings including Personal Settings where users can update their profile and manage MFA.
 */
export class SettingsPersonalPage extends BasePage {
	readonly settingsSidebar = new SettingsSidebar(this.page);

	getMenuItems() {
		return this.settingsSidebar.getMenuItems();
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

	/**
	 * Each field saves when it loses focus, and Enter leaves the field. Resolves with the save
	 * response; the value must differ from the saved one, or no request is sent.
	 */
	async saveFirstName(firstName: string): Promise<Response> {
		return await this.saveNameField(this.getFirstNameField(), firstName);
	}

	async saveLastName(lastName: string): Promise<Response> {
		return await this.saveNameField(this.getLastNameField(), lastName);
	}

	private async saveNameField(field: Locator, value: string): Promise<Response> {
		const responsePromise = this.page.waitForResponse(
			(res) =>
				new URL(res.url()).pathname.endsWith('/rest/me') && res.request().method() === 'PATCH',
		);
		await field.fill(value);
		await field.press('Enter');
		return await responsePromise;
	}

	async fillEmail(email: string): Promise<void> {
		await this.getEmailField().fill(email);
	}

	/** Leaves the email field, which starts the confirmation (password or 2FA code). */
	async pressEnterOnEmail(): Promise<void> {
		await this.getEmailField().press('Enter');
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

	getMfaConfirmButton(): Locator {
		return this.page.getByTestId('mfa-code-confirm-button');
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
		await this.goto();
		await this.clickDisableMfa();
	}

	/**
	 * Fill in MFA code or recovery code and confirm the dialog
	 * @param code - MFA token or recovery code
	 */
	async fillMfaCodeAndConfirm(code: string): Promise<void> {
		await this.getMfaCodeOrRecoveryCodeInput().fill(code);
		await this.getMfaConfirmButton().click();
	}

	getUpgradeCta(): Locator {
		return this.page.getByTestId('public-api-upgrade-cta');
	}
}
