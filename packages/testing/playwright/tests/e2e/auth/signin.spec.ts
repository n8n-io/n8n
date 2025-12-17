import { INSTANCE_OWNER_CREDENTIALS } from '../../../config/test-users';
import { test, expect } from '../../../fixtures/base';

test.describe('Sign In', () => {
	test('should login and logout @auth:none', async ({ n8n }) => {
		await n8n.goHome();

		await n8n.signIn.goToSignIn();

		await n8n.signIn.loginWithEmailAndPassword(
			INSTANCE_OWNER_CREDENTIALS.email,
			INSTANCE_OWNER_CREDENTIALS.password,
		);

		await expect(n8n.sideBar.getSettings()).toBeVisible();
	});
});
