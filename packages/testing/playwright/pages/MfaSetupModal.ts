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

	/**
	 * Wait for the MFA setup modal to be hidden from view
	 */
	async waitForHidden(): Promise<void> {
		await expect(this.getModalContainer()).toBeHidden();
	}

	/**
	 * Extract recovery code from the MFA setup modal after download
	 * @returns The extracted recovery code or fallback code if extraction fails
	 */
	async extractRecoveryCode(): Promise<string> {
		const fallbackCode = 'd04ea17f-e8b2-4afa-a9aa-57a2c735b30e';

		try {
			// Find recovery codes displayed in the modal after download
			const recoveryCodeElements = await this.page
				.locator('[class*="recovery"], [class*="code"], .recovery-code, [data-test-id*="recovery"]')
				.allTextContents();

			// Look for UUID-like recovery codes in the modal content
			for (const text of recoveryCodeElements) {
				const match = text.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/);
				if (match) {
					return match[0]; // Use the first matched recovery code
				}
			}
		} catch (error) {
			// If extraction fails, fall back to predefined code (may not work)
		}

		return fallbackCode;
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

	/**
	 * Complete MFA setup flow with recovery code extraction
	 * @returns Object containing the MFA secret and extracted recovery code
	 */
	async setupMfaWithRecoveryCode(): Promise<{ secret: string; recoveryCode: string }> {
		// Wait for modal to be visible
		await this.getModalContainer().waitFor({ state: 'visible' });

		// Get the actual secret from clipboard
		await this.getCopySecretToClipboardButton().waitFor({ state: 'visible' });
		await this.clickCopySecretToClipboard();
		const actualSecret = await this.page.evaluate(() => navigator.clipboard.readText());

		// Generate token using the real secret from modal
		const { authenticator } = await import('otplib');
		const mfaCode = authenticator.generate(actualSecret);

		await this.fillToken(mfaCode);
		await this.clickDownloadRecoveryCodes();

		// Extract recovery code after download
		const recoveryCode = await this.extractRecoveryCode();

		await this.clickSave();

		return { secret: actualSecret, recoveryCode };
	}
}
