import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './BasePage';

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
		await this.getCopySecretToClipboardButton().click();
	}

	async clickDownloadRecoveryCodes(): Promise<void> {
		await expect(this.getDownloadRecoveryCodesButton()).toBeVisible();
		await this.getDownloadRecoveryCodesButton().click();
	}

	async clickSave(): Promise<void> {
		await this.getSaveButton().click();
	}

	async isVisible(): Promise<boolean> {
		return await this.getModalContainer().isVisible();
	}

	/**
	 * Wait for the MFA setup modal to be hidden from view
	 */
	async waitForHidden(): Promise<void> {
		await expect(this.getModalContainer()).toBeHidden();
	}
}
