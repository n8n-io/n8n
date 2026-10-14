import type { n8nPage } from '../pages/n8nPage';

/**
 * Composer for OIDC-related operations in E2E tests.
 * Handles configuring OIDC settings.
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
}
