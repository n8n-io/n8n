import {
	KEYCLOAK_TEST_CLIENT_ID,
	KEYCLOAK_TEST_CLIENT_SECRET,
	KEYCLOAK_TEST_USER_EMAIL,
	KEYCLOAK_TEST_USER_PASSWORD,
} from 'n8n-containers';

import { test, expect } from '../../../fixtures/base';

test.use({
	addContainerCapability: {
		oidc: true,
	},
	ignoreHTTPSErrors: true, // Keycloak uses self-signed certs
});

test.describe('OIDC Authentication @capability:oidc', () => {
	test('should configure OIDC and login with Keycloak @auth:owner', async ({
		n8n,
		api,
		n8nContainer,
	}) => {
		await api.enableFeature('oidc');
		await n8n.oidcComposer.configureOidc(
			n8nContainer.oidc!.internalDiscoveryUrl,
			KEYCLOAK_TEST_CLIENT_ID,
			KEYCLOAK_TEST_CLIENT_SECRET,
		);

		await n8n.sideBar.signOutFromWorkflows();
		await n8n.page.waitForURL('/signin');

		await n8n.signIn.getSsoButton().click();
		await n8n.keycloakLogin.login(KEYCLOAK_TEST_USER_EMAIL, KEYCLOAK_TEST_USER_PASSWORD);

		await expect(n8n.page).toHaveURL(/\/(workflow|home)/);
		await expect(n8n.sideBar.getSettings()).toBeVisible();
	});
});
