import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class SignInPage extends BasePage {
	getEmailField(): Locator {
		return this.page.getByRole('textbox', { name: 'Email' });
	}

	getPasswordField(): Locator {
		return this.page.getByRole('textbox', { name: 'Password' });
	}

	getSubmitButton(): Locator {
		return this.page.getByRole('button', { name: 'Sign in' });
	}

	getSsoButton(): Locator {
		return this.page.getByRole('button', { name: /continue with sso/i });
	}

	async goto(): Promise<void> {
		await this.page.goto('/signin');
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
	 * Complete login flow with email and password
	 * @param email - User email
	 * @param password - User password
	 * @param waitForWorkflow - Whether to wait for redirect to workflow page after login
	 */
	async loginWithEmailAndPassword(
		email: string,
		password: string,
		waitForWorkflow = false,
	): Promise<void> {
		await this.goto();
		await this.fillEmail(email);
		await this.fillPassword(password);
		await this.clickSubmit();

		if (waitForWorkflow) {
			await this.page.waitForURL(/workflows/);
		}
	}
}
