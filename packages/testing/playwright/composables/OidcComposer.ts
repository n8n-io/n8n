import type { n8nPage } from '../pages/n8nPage';

export class OidcComposer {
	constructor(private readonly n8n: n8nPage) {}

	/**
	 * Configure OIDC authentication settings via UI
	 * @param discoveryUrl - OIDC discovery endpoint URL
	 * @param clientId - OAuth client ID
	 * @param clientSecret - OAuth client secret
	 */
	async configureOidc(discoveryUrl: string, clientId: string, clientSecret: string): Promise<void> {
		await this.n8n.navigate.toSsoSettings();
		await this.n8n.settingsSso.selectAuthProtocol('oidc');

		await this.n8n.settingsSso.fillOidcDiscoveryEndpoint(discoveryUrl);
		await this.n8n.settingsSso.fillOidcClientId(clientId);
		await this.n8n.settingsSso.fillOidcClientSecret(clientSecret);
		await this.n8n.settingsSso.toggleOidcEnabled(true);
		await this.n8n.settingsSso.clickSaveOidc();
	}

	/**
	 * Fill and submit Dex login form
	 * @param email - User email for external provider
	 * @param password - User password for external provider
	 */
	async fillDexLoginForm(email: string, password: string): Promise<void> {
		await this.n8n.dexLogin.fillAndSubmitLogin(email, password);
	}
}
