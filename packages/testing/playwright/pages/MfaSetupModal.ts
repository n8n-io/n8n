import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './BasePage';

export class MfaSetupModal extends BasePage {
	// Element getters (no async, return Locator)
	getModalContainer(): Locator {
		// Use the MFA-specific modal test-id
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

	// Simple actions (async, return void)
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

	// Complete MFA setup flow exactly like Cypress does
	async completeMfaSetup(): Promise<string> {
		// Wait for modal to be visible
		await this.getModalContainer().waitFor({ state: 'visible' });

		// Copy secret to clipboard (like Cypress)
		await this.getCopySecretToClipboardButton().waitFor({ state: 'visible' });
		await this.clickCopySecretToClipboard();

		// Read the actual secret from clipboard (like Cypress does with cy.readClipboard())
		const actualSecret = await this.page.evaluate(() => navigator.clipboard.readText());

		// Generate token using the real secret from modal
		const { authenticator } = await import('otplib');
		const token = authenticator.generate(actualSecret);

		// Fill token
		await this.fillToken(token);

		// Download recovery codes
		await this.clickDownloadRecoveryCodes();

		// Save
		await this.clickSave();

		// Return the actual secret so tests can use it for login
		return actualSecret;
	}
}
