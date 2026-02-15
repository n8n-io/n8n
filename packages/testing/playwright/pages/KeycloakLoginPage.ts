import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

/**
 * Page object for the Keycloak login page.
 * Used when testing OIDC authentication flows.
 */
export class KeycloakLoginPage extends BasePage {
	getUsernameField(): Locator {
		return this.page.locator('#username');
	}

	getPasswordField(): Locator {
		return this.page.locator('#password');
	}

	getLoginButton(): Locator {
		return this.page.locator('#kc-login');
	}

	async fillUsername(username: string): Promise<void> {
		await this.getUsernameField().fill(username);
	}

	async fillPassword(password: string): Promise<void> {
		await this.getPasswordField().fill(password);
	}

	async clickLogin(): Promise<void> {
		await this.getLoginButton().click();
	}

	/**
	 * Complete Keycloak login flow
	 * @param email - User email/username
	 * @param password - User password
	 */
	async login(email: string, password: string): Promise<void> {
		await this.getUsernameField().waitFor({ state: 'visible', timeout: 10000 });
		await this.fillUsername(email);
		await this.fillPassword(password);
		await this.clickLogin();
	}
}
