import { authenticator } from 'otplib';
import { expect } from '@playwright/test';

import type { n8nPage } from '../pages/n8nPage';

export class MfaComposer {
	constructor(private readonly n8n: n8nPage) {}

	/**
	 * Enable MFA for the current user by going through the complete setup flow
	 * @param secret - The MFA secret to use for token generation
	 */
	async enableMfa(secret: string): Promise<void> {
		// Click enable MFA button
		await this.n8n.settings.clickEnableMfa();

		// Wait for MFA setup modal to appear
		await this.n8n.page.waitForSelector('[data-test-id="changePassword-modal"]', {
			state: 'visible',
		});

		// Copy secret to clipboard
		await this.n8n.mfaSetupModal.clickCopySecretToClipboard();

		// Generate token and fill it (use provided secret for now)
		const token = authenticator.generate(secret);
		await this.n8n.mfaSetupModal.fillToken(token);

		// Download recovery codes
		await this.n8n.mfaSetupModal.clickDownloadRecoveryCodes();

		// Save the MFA setup
		await this.n8n.mfaSetupModal.clickSave();

		// Wait for modal to close
		await this.n8n.page.waitForSelector('[data-test-id="changePassword-modal"]', {
			state: 'hidden',
		});
	}

	/**
	 * Complete MFA login flow after regular login
	 * @param secret - The MFA secret to generate token with
	 */
	async completeMfaLogin(secret: string): Promise<void> {
		// Generate MFA token
		const mfaCode = authenticator.generate(secret);

		// Fill and submit MFA code
		await this.n8n.mfaLogin.submitMfaCode(mfaCode);
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
	 * Full login with MFA flow - login with email/password, then complete MFA
	 * @param email - User email
	 * @param password - User password
	 * @param secret - MFA secret for token generation
	 */
	async loginWithMfa(email: string, password: string, secret: string): Promise<void> {
		// Regular login first
		await this.n8n.signIn.fillEmail(email);
		await this.n8n.signIn.fillPassword(password);
		await this.n8n.signIn.clickSubmit();

		// Wait to be redirected to MFA page
		await this.n8n.page.waitForURL(/\/mfa/);

		// Complete MFA login
		await this.completeMfaLogin(secret);
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
	 * Complete workflow: Login → Enable MFA → Logout
	 * @param email - User email
	 * @param password - User password
	 * @returns The MFA secret for subsequent login
	 */
	async setupMfaWorkflow(email: string, password: string): Promise<string> {
		await this.n8n.signIn.loginWithEmailAndPassword(email, password, true);
		const secret = await this.n8n.settings.enableMfa();
		await this.n8n.sideBar.clickSignout();
		return secret;
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
}
