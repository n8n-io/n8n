import { INSTANCE_OWNER_CREDENTIALS } from '../../../config/test-users';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'Sign In',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should login and logout @auth:none', async ({ n8n }) => {
			await n8n.goHome();

			await n8n.signIn.goto();

			await n8n.signIn.loginWithEmailAndPassword(
				INSTANCE_OWNER_CREDENTIALS.email,
				INSTANCE_OWNER_CREDENTIALS.password,
			);

			await expect(n8n.sideBar.getSettings()).toBeVisible();
		});
	},
);
