import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class SignInPage extends BasePage {
	getForm(): Locator {
		return this.page.getByTestId('auth-form');
	}

	getEmailField(): Locator {
		return this.page.getByTestId('emailOrLdapLoginId').locator('input');
	}

	getPasswordField(): Locator {
		return this.page.getByTestId('password').locator('input');
	}

	getSubmitButton(): Locator {
		return this.page.getByTestId('form-submit-button');
	}

	async goToSignIn(): Promise<void> {
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

	async loginWithEmailAndPassword(email: string, password: string): Promise<void> {
		await this.goToSignIn();
		await this.fillEmail(email);
		await this.fillPassword(password);
		await this.clickSubmit();
	}
}
