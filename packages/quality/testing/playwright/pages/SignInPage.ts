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
		// `exact` keeps the "Sign in with email and password" disclosure out of the match.
		return this.page.getByRole('button', { name: 'Sign in', exact: true });
	}

	getSsoButton(): Locator {
		return this.page.getByTestId('sso-login-button');
	}

	/** Disclosure that reveals the email/password form when SSO is the active login method. */
	getPasswordLoginToggle(): Locator {
		return this.page.getByTestId('reveal-password-login');
	}

	/** Full-page warning the editor writes when the secure auth cookie cannot work on this origin. */
	getInsecureConnectionWarning(): Locator {
		return this.page.getByText(
			'Your n8n server is configured to use a secure cookie, however you are either visiting this via an insecure URL, or using Safari.',
		);
	}

	async goto(): Promise<void> {
		await this.page.goto('/signin');
	}

	/** Opens the sign-in page at an absolute URL, for example on another host name. */
	async gotoUrl(url: string): Promise<void> {
		await this.page.goto(url);
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
		// On SSO instances the password form starts collapsed behind a disclosure.
		await this.getEmailField().or(this.getPasswordLoginToggle()).first().waitFor();
		if (await this.getPasswordLoginToggle().isVisible()) {
			await this.getPasswordLoginToggle().click();
		}
		await this.fillEmail(email);
		await this.fillPassword(password);
		await this.clickSubmit();

		if (waitForWorkflow) {
			await this.page.waitForURL(/workflows/);
		}
	}
}
