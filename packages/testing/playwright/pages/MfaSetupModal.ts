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

	// Query methods (async, return data)
	async isVisible(): Promise<boolean> {
		return await this.getModalContainer().isVisible();
	}

	/**
	 * Wait for the MFA setup modal to be hidden from view
	 */
	async waitForHidden(): Promise<void> {
		await expect(this.getModalContainer()).toBeHidden();
	}

	/**
	 * Get the MFA secret from clipboard after copying
	 * Simple helper for clipboard reading
	 */
	async getMfaSecretFromClipboard(): Promise<string> {
		await this.getCopySecretToClipboardButton().waitFor({ state: 'visible' });
		await this.clickCopySecretToClipboard();
		return await this.page.evaluate(() => navigator.clipboard.readText());
	}

	/**
	 * Get recovery code elements for extraction (simple query method)
	 * @returns Array of text content from potential recovery code elements
	 */
	async getRecoveryCodeElements(): Promise<string[]> {
		return await this.page
			.locator('[class*="recovery"], [class*="code"], .recovery-code, [data-test-id*="recovery"]')
			.allTextContents();
	}
}
