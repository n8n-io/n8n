import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

/**
 * Page object for the MFA login page that appears after entering email/password when MFA is enabled.
 */
export class MfaLoginPage extends BasePage {
	get container(): Locator {
		return this.page.getByTestId('mfa-totp-screen');
	}

	getForm(): Locator {
		return this.container.getByTestId('mfa-login-form');
	}

	getMfaCodeField(): Locator {
		return this.getForm().locator('input[name="mfaCode"]');
	}

	getMfaRecoveryCodeField(): Locator {
		return this.getForm().locator('input[name="mfaRecoveryCode"]');
	}

	async fillMfaCode(code: string): Promise<void> {
		await this.getMfaCodeField().fill(code);
	}

	async fillMfaRecoveryCode(recoveryCode: string): Promise<void> {
		await this.getMfaRecoveryCodeField().fill(recoveryCode);
	}

	async clickEnterRecoveryCode(): Promise<void> {
		await this.clickByTestId('mfa-enter-recovery-code-button');
	}

	/**
	 * Fill MFA code and submit the form
	 * @param code - The MFA token to submit
	 */
	async submitMfaCode(code: string): Promise<void> {
		await this.fillMfaCode(code);
		// Form auto-submits
	}

	/**
	 * Switch to recovery code mode, fill recovery code and submit
	 * @param recoveryCode - The recovery code to submit
	 */
	async submitMfaRecoveryCode(recoveryCode: string): Promise<void> {
		await this.clickEnterRecoveryCode();
		await this.fillMfaRecoveryCode(recoveryCode);
		// Form auto-submits
	}

	/**
	 * Switcher link shown when the user has both TOTP and a webauthn credential.
	 * Clicking it flips the screen from TOTP to the webauthn prompt.
	 */
	getSwitcherLink(): Locator {
		return this.container.getByTestId('mfa-switcher').getByRole('button');
	}
}
