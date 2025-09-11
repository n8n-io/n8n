import { expect } from '@playwright/test';
import { authenticator } from 'otplib';

import type { n8nPage } from '../pages/n8nPage';

export class MfaComposer {
	constructor(private readonly n8n: n8nPage) {}

	/**
	 * Set up MFA for a user - returns MFA secret only
	 * @param email - User email
	 * @param password - User password
	 * @returns MFA secret
	 */
	async setupUser(email: string, password: string): Promise<string> {
		await this.n8n.signIn.loginWithEmailAndPassword(email, password, true);

		// Simple page actions
		await this.n8n.personalSettings.goToPersonalSettings();
		await this.n8n.personalSettings.clickEnableMfa();
		await this.n8n.personalSettings.waitForMfaQrResponse();

		// Complete MFA setup and return secret
		const secret = await this.completeMfaSetup();
		await this.n8n.mfaSetupModal.waitForHidden();
		return secret;
	}

	/**
	 * Set up MFA for a user - returns both MFA secret and recovery code
	 * @param email - User email
	 * @param password - User password
	 * @returns Object containing MFA secret and recovery code
	 */
	async setupUserWithRecoveryCode(
		email: string,
		password: string,
	): Promise<{ secret: string; recoveryCode: string }> {
		await this.n8n.signIn.loginWithEmailAndPassword(email, password, true);

		// Simple page actions
		await this.n8n.personalSettings.goToPersonalSettings();
		await this.n8n.personalSettings.clickEnableMfa();
		await this.n8n.personalSettings.waitForMfaQrResponse();

		// Complete MFA setup with recovery code
		const result = await this.setupMfaWithRecoveryCode();
		await this.n8n.mfaSetupModal.waitForHidden();
		return result;
	}

	/**
	 * Complete MFA login flow using recovery code
	 * @param recoveryCode - The recovery code to use
	 */
	async completeMfaLoginWithRecoveryCode(recoveryCode: string): Promise<void> {
		// Set up expectation for MFA verify request
		const mfaVerifyResponsePromise = this.n8n.page.waitForResponse(
			(response) => response.url().includes('/rest/mfa/verify') && response.status() === 200,
		);

		// Submit MFA recovery code and wait for verification
		await Promise.all([
			mfaVerifyResponsePromise,
			this.n8n.mfaLogin.submitMfaRecoveryCode(recoveryCode),
		]);
	}

	/**
	 * Full login with MFA recovery code flow
	 * @param email - User email
	 * @param password - User password
	 * @param recoveryCode - MFA recovery code
	 */
	async loginWithMfaRecoveryCode(
		email: string,
		password: string,
		recoveryCode: string,
	): Promise<void> {
		// Regular login first
		await this.n8n.signIn.loginWithEmailAndPassword(email, password);

		// Wait to be redirected to MFA page
		await this.n8n.page.waitForURL(/\/mfa/);

		// Complete MFA login with recovery code
		await this.completeMfaLoginWithRecoveryCode(recoveryCode);
	}

	/**
	 * Login with MFA code flow - handles email/password + MFA token submission
	 * @param email - User email
	 * @param password - User password
	 * @param secret - MFA secret for token generation
	 */
	async loginWithMfaCode(email: string, password: string, secret: string): Promise<void> {
		// Login with email/password (exactly like original test)
		await this.n8n.signIn.fillEmail(email);
		await this.n8n.signIn.fillPassword(password);
		await this.n8n.signIn.clickSubmit();

		// Complete MFA flow (exactly like original test)
		await expect(this.n8n.mfaLogin.getForm()).toBeVisible();
		const loginMfaCode = authenticator.generate(secret);
		await this.n8n.mfaLogin.submitMfaCode(loginMfaCode);
		await expect(this.n8n.page).toHaveURL(/\/workflow/);
	}

	/**
	 * Complete MFA setup flow - business logic moved from MfaSetupModal
	 * @returns The MFA secret from clipboard
	 */
	async completeMfaSetup(): Promise<string> {
		// Wait for modal to be visible
		await this.n8n.mfaSetupModal.getModalContainer().waitFor({ state: 'visible' });

		// Get the actual secret from clipboard
		const actualSecret = await this.n8n.mfaSetupModal.getMfaSecretFromClipboard();

		// Generate token using the real secret from modal
		const token = authenticator.generate(actualSecret);

		// Fill token
		await this.n8n.mfaSetupModal.fillToken(token);

		// Download recovery codes
		await this.n8n.mfaSetupModal.clickDownloadRecoveryCodes();

		// Save
		await this.n8n.mfaSetupModal.clickSave();

		// Return the actual secret so tests can use it for login
		return actualSecret;
	}

	/**
	 * Complete MFA setup flow with recovery code extraction
	 * @returns Object containing the MFA secret and extracted recovery code
	 */
	async setupMfaWithRecoveryCode(): Promise<{ secret: string; recoveryCode: string }> {
		// Wait for modal to be visible
		await this.n8n.mfaSetupModal.getModalContainer().waitFor({ state: 'visible' });

		// Get the actual secret from clipboard
		const actualSecret = await this.n8n.mfaSetupModal.getMfaSecretFromClipboard();

		// Generate token using the real secret from modal
		const mfaCode = authenticator.generate(actualSecret);

		await this.n8n.mfaSetupModal.fillToken(mfaCode);
		await this.n8n.mfaSetupModal.clickDownloadRecoveryCodes();

		// Extract recovery code after download
		const recoveryCode = await this.extractRecoveryCode();

		await this.n8n.mfaSetupModal.clickSave();

		return { secret: actualSecret, recoveryCode };
	}

	/**
	 * Extract recovery code from the MFA setup modal after download
	 * Business logic moved from MfaSetupModal
	 * @returns The extracted recovery code
	 * @throws Error if recovery code extraction fails
	 */
	private async extractRecoveryCode(): Promise<string> {
		try {
			// Get recovery code elements from the modal
			const recoveryCodeElements = await this.n8n.mfaSetupModal.getRecoveryCodeElements();

			// Look for UUID-like recovery codes in the modal content
			for (const text of recoveryCodeElements) {
				const match = text.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/);
				if (match) {
					return match[0]; // Use the first matched recovery code
				}
			}

			// If no recovery code found in modal elements
			throw new Error('No UUID-formatted recovery code found in modal elements');
		} catch (error) {
			throw new Error(
				`Failed to extract recovery code from MFA setup modal: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
