import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class MfaLoginPage extends BasePage {
	getForm(): Locator {
		return this.page.getByTestId('mfa-login-form');
	}

	getMfaCodeField(): Locator {
		return this.page.getByTestId('mfaCode').locator('input');
	}

	getMfaRecoveryCodeField(): Locator {
		return this.page.getByTestId('mfaRecoveryCode').locator('input');
	}

	getEnterRecoveryCodeButton(): Locator {
		return this.page.getByTestId('mfa-enter-recovery-code-button');
	}

	getSubmitButton(): Locator {
		return this.page.getByRole('button', { name: 'Verify' });
	}

	async goToMfaLogin(): Promise<void> {
		await this.page.goto('/mfa');
	}

	async fillMfaCode(code: string): Promise<void> {
		await this.getMfaCodeField().fill(code);
	}

	async fillMfaRecoveryCode(recoveryCode: string): Promise<void> {
		await this.getMfaRecoveryCodeField().fill(recoveryCode);
	}

	async clickEnterRecoveryCode(): Promise<void> {
		await this.getEnterRecoveryCodeButton().click();
	}

	async clickSubmit(): Promise<void> {
		await this.getSubmitButton().click();
	}

	async submitMfaCode(code: string): Promise<void> {
		await this.fillMfaCode(code);
	}

	async submitMfaRecoveryCode(recoveryCode: string): Promise<void> {
		await this.clickEnterRecoveryCode();
		await this.fillMfaRecoveryCode(recoveryCode);
		await this.clickSubmit();
	}
}
