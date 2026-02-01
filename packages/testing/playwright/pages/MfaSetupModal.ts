import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './BasePage';

/**
 * Page object for the MFA setup modal that appears when enabling two-factor authentication.
 */
export class MfaSetupModal extends BasePage {
	getModalContainer(): Locator {
		return this.page.getByTestId('mfaSetup-modal');
	}

	getTokenInput(): Locator {
		return this.page.getByTestId('mfa-token-input');
	}

	getCopySecretToClipboardButton(): Locator {
		return this.page.getByTestId('mfa-secret-button');
	}

	getDownloadRecoveryCodesButton(): Locator {
		return this.page.getByTestId('mfa-recovery-codes-button');
	}

	getSaveButton(): Locator {
		return this.page.getByTestId('mfa-save-button');
	}

	async fillToken(token: string): Promise<void> {
		await this.getTokenInput().fill(token);
	}

	async clickCopySecretToClipboard(): Promise<void> {
		await this.clickByTestId('mfa-secret-button');
	}

	async clickDownloadRecoveryCodes(): Promise<void> {
		await this.clickByTestId('mfa-recovery-codes-button');
	}

	async clickSave(): Promise<void> {
		await this.getModalContainer().getByTestId('mfa-save-button').click();
	}

	/**
	 * Wait for the MFA setup modal to be hidden from view
	 */
	async waitForHidden(): Promise<void> {
		await expect(this.getModalContainer()).toBeHidden();
	}
}
