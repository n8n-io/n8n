import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

/**
 * Page object for the Dex OIDC provider login page (external authentication provider)
 */
export class DexLoginPage extends BasePage {
	getEmailField(): Locator {
		return this.page.locator('#login');
	}

	getPasswordField(): Locator {
		return this.page.locator('#password');
	}

	getSubmitButton(): Locator {
		return this.page.locator('#submit-login');
	}

	async fillEmail(email: string): Promise<void> {
		await this.getEmailField().fill(email);
	}

	async fillPassword(password: string): Promise<void> {
		await this.getPasswordField().fill(password);
	}

	async clickSubmit(): Promise<void> {
		await this.getSubmitButton().click();
	}

	/**
	 * Complete Dex login flow with email and password
	 * @param email - User email
	 * @param password - User password
	 */
	async fillAndSubmitLogin(email: string, password: string): Promise<void> {
		await this.fillEmail(email);
		await this.fillPassword(password);
		await this.clickSubmit();
	}
}
