import { expect } from '@playwright/test';
import { authenticator } from 'otplib';

import type { n8nPage } from '../pages/n8nPage';

export class MfaComposer {
	constructor(private readonly n8n: n8nPage) {}

	/**
	 * Enable MFA for a user using predefined secret
	 * @param email - User email
	 * @param password - User password
	 * @param mfaSecret - Known MFA secret to use for token generation
	 */
	async enableMfa(email: string, password: string, mfaSecret: string): Promise<void> {
		await this.n8n.signIn.loginWithEmailAndPassword(email, password, true);
		await this.n8n.settingsPersonal.goToPersonalSettings();

		await this.n8n.settingsPersonal.clickEnableMfa();

		await this.n8n.mfaSetupModal.getModalContainer().waitFor({ state: 'visible' });

		await this.n8n.mfaSetupModal.clickCopySecretToClipboard();

		const token = authenticator.generate(mfaSecret);
		await this.n8n.mfaSetupModal.fillToken(token);
		await expect(this.n8n.mfaSetupModal.getDownloadRecoveryCodesButton()).toBeVisible();
		await this.n8n.mfaSetupModal.clickDownloadRecoveryCodes();
		await this.n8n.mfaSetupModal.clickSave();
		await this.n8n.mfaSetupModal.waitForHidden();
	}

	/**
	 * Login with MFA code
	 * @param email - User email
	 * @param password - User password
	 * @param mfaSecret - Known MFA secret for token generation
	 */
	async loginWithMfaCode(email: string, password: string, mfaSecret: string): Promise<void> {
		await this.n8n.signIn.fillEmail(email);
		await this.n8n.signIn.fillPassword(password);
		await this.n8n.signIn.clickSubmit();

		await expect(this.n8n.mfaLogin.getForm()).toBeVisible();
		const loginMfaCode = authenticator.generate(mfaSecret);
		await this.n8n.mfaLogin.submitMfaCode(loginMfaCode);
		await expect(this.n8n.page).toHaveURL(/workflows/);
	}

	/**
	 * Login with MFA recovery code
	 * @param email - User email
	 * @param password - User password
	 * @param recoveryCode - Known recovery code
	 */
	async loginWithMfaRecoveryCode(
		email: string,
		password: string,
		recoveryCode: string,
	): Promise<void> {
		await this.n8n.signIn.fillEmail(email);
		await this.n8n.signIn.fillPassword(password);
		await this.n8n.signIn.clickSubmit();

		await expect(this.n8n.mfaLogin.getForm()).toBeVisible();
		await this.n8n.mfaLogin.submitMfaRecoveryCode(recoveryCode);
		await expect(this.n8n.page).toHaveURL(/workflows/);
	}
}
