import {
	DEX_TEST_USER_EMAIL,
	DEX_TEST_USER_PASSWORD,
	DEX_TEST_CLIENT_ID,
	DEX_TEST_CLIENT_SECRET,
} from 'n8n-containers';

import { test, expect } from '../../fixtures/base';

test.use({
	addContainerCapability: {
		oidc: true,
	},
});

test.describe('OIDC authentication', () => {
	test('should configure OIDC and login with Dex @capability:oidc @auth:owner', async ({
		n8n,
		api,
	}) => {
		await api.enableFeature('oidc');

		await n8n.oidcComposer.configureOidc(
			'http://dex:5556/.well-known/openid-configuration',
			DEX_TEST_CLIENT_ID,
			DEX_TEST_CLIENT_SECRET,
		);

		await expect(n8n.settingsSso.getOidcSaveButton()).toBeDisabled();

		await n8n.sideBar.signOutFromWorkflows();
		await n8n.page.waitForURL('/signin');

		await n8n.signIn.getSsoButton().click();

		await n8n.oidcComposer.fillDexLoginForm(DEX_TEST_USER_EMAIL, DEX_TEST_USER_PASSWORD);

		await expect(n8n.page).toHaveURL(/\/(workflow|home)/);
		await expect(n8n.sideBar.getUserMenu()).toBeVisible();
	});
});
