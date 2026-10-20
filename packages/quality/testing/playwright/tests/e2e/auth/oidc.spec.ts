import { test, expect } from '../../../fixtures/base';

test.use({
	capability: 'oidc',
	ignoreHTTPSErrors: true, // Keycloak uses self-signed certs
});

test.describe(
	'OIDC Authentication @licensed',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test.beforeEach(async ({ n8n, api, services }) => {
			const keycloak = services.keycloak;
			await api.enableFeature('oidc');
			await n8n.oidcComposer.configureOidc(
				keycloak.internalDiscoveryUrl,
				keycloak.clientId,
				keycloak.clientSecret,
			);

			await n8n.sideBar.signOutFromWorkflows();
			await n8n.page.waitForURL('/signin');
		});

		test('should configure OIDC and login with Keycloak @auth:owner', async ({ n8n, services }) => {
			const keycloak = services.keycloak;
			await n8n.signIn.getSsoButton().click();
			await n8n.keycloakLogin.login(keycloak.testUser.email, keycloak.testUser.password);

			await expect(n8n.page).toHaveURL(/\/(workflow|home)/);
			await expect(n8n.sideBar.getSettings()).toBeVisible();
		});

		test('should return to the requested page after SSO login @auth:owner', async ({
			n8n,
			services,
		}) => {
			const keycloak = services.keycloak;
			await n8n.navigate.toCredentials();
			await expect(n8n.page).toHaveURL(/\/signin\?redirect=/);

			await n8n.signIn.getSsoButton().click();
			await n8n.keycloakLogin.login(keycloak.testUser.email, keycloak.testUser.password);

			await expect(n8n.page).toHaveURL(/\/home\/credentials/);
		});
	},
);
