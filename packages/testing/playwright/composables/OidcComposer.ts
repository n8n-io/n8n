import type { n8nPage } from '../pages/n8nPage';

/**
 * Composer for OIDC-related operations in E2E tests.
 * Handles configuring OIDC settings and interacting with Keycloak login.
 */
export class OidcComposer {
	constructor(private readonly n8n: n8nPage) {}

	/**
	 * Configure OIDC via UI form.
	 *
	 * @param discoveryUrl - The discovery URL for n8n backend (e.g., https://keycloak:8443/...)
	 * @param clientId - The OIDC client ID
	 * @param clientSecret - The OIDC client secret
	 */
	async configureOidc(discoveryUrl: string, clientId: string, clientSecret: string): Promise<void> {
		const { settingsSso } = this.n8n;

		await settingsSso.goto();
		await settingsSso.selectOidcProtocol();
		await settingsSso.fillOidcForm({
			discoveryEndpoint: discoveryUrl,
			clientId,
			clientSecret,
			enableLogin: true,
		});
		await settingsSso.saveOidcConfig();
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
