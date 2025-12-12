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

	/**
	 * TEMPORARY: Intentionally failing tests to verify Currents "re-run only failed tests" feature.
	 * Remove these tests after verifying CAT-1956 works.
	 * @see https://linear.app/n8n/issue/CAT-1956
	 */
	test('CAT-1956: intentional failure #1 @auth:none', async ({ n8n }) => {
		await n8n.goHome();
		expect(true, 'INTENTIONAL FAILURE #1: Remove after verifying CAT-1956').toBe(false);
	});

	test('CAT-1956: intentional failure #2 @auth:none', async ({ n8n }) => {
		await n8n.goHome();
		expect(true, 'INTENTIONAL FAILURE #2: Remove after verifying CAT-1956').toBe(false);
	});
});
