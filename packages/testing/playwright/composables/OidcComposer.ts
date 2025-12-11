import { expect } from '@playwright/test';

import type { n8nPage } from '../pages/n8nPage';

/**
 * Composer for OIDC-related operations in E2E tests.
 * Handles configuring OIDC settings and interacting with Keycloak login.
 */
export class OidcComposer {
	constructor(private readonly n8n: n8nPage) {}

	/**
	 * Configure OIDC via API with retry (handles intermittent network issues in multi-main).
	 */
	async configureOidc(discoveryUrl: string, clientId: string, clientSecret: string): Promise<void> {
		// Save config via API with retry
		await expect(async () => {
			const response = await this.n8n.page.request.post('/rest/sso/oidc/config', {
				data: {
					discoveryEndpoint: discoveryUrl,
					clientId,
					clientSecret,
					loginEnabled: true,
					prompt: 'select_account',
				},
			});
			expect(response.ok()).toBe(true);
		}).toPass({ timeout: 30000 });

		// Verify settings propagated across all instances (important for multi-main)
		await expect(async () => {
			const response = await this.n8n.page.request.get('/rest/settings');
			const settings = await response.json();
			expect(settings.data.userManagement.authenticationMethod).toBe('oidc');
		}).toPass({ timeout: 15000 });
	}

	/**
	 * Fill the Keycloak login form with test credentials.
	 * Should be called after the page has been redirected to Keycloak.
	 */
	async fillKeycloakLoginForm(email: string, password: string): Promise<void> {
		const { page } = this.n8n;

		const usernameField = page.locator('#username');
		const passwordField = page.locator('#password');

		await usernameField.waitFor({ state: 'visible', timeout: 10000 });
		await usernameField.fill(email);
		await passwordField.fill(password);
		await page.locator('#kc-login').click();
	}
}
