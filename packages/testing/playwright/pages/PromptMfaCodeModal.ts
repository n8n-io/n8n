import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

/**
 * Page object for the MFA code prompt modal that appears when changing email or disabling MFA.
 */
export class PromptMfaCodeModal extends BasePage {
	getPromptMfaCodeModal(): Locator {
		return this.page.getByTestId('prompt-mfa-code-modal');
	}

	getMfaCodeOrRecoveryCodeInput(): Locator {
		return this.page.getByTestId('mfa-code-or-recovery-code-input').locator('input');
	}

	getMfaSaveButton(): Locator {
		return this.page.getByTestId('mfa-save-button');
	}

	async fillMfaCodeOrRecoveryCode(code: string): Promise<void> {
		await this.getMfaCodeOrRecoveryCodeInput().fill(code);
	}

	async clickMfaSave(): Promise<void> {
		await this.clickByTestId('mfa-save-button');
	}

	async submitMfaCode(code: string): Promise<void> {
		await this.fillMfaCodeOrRecoveryCode(code);
		await this.clickMfaSave();
	}
}
