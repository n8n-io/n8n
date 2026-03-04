import { authenticator } from 'otplib';

import { INSTANCE_OWNER_CREDENTIALS } from '../../../config/test-users';
import { test, expect } from '../../../fixtures/base';

test.use({ capability: { env: { TEST_ISOLATION: 'mfa-login-bug' } } });

const { email, password, mfaSecret } = INSTANCE_OWNER_CREDENTIALS;

/**
 * Regression test for ADO-4902 / GitHub Issue #25831
 * Bug: MFA input field doesn't appear after entering credentials on self-hosted instances
 *
 * Expected behavior: After submitting valid email/password, the MFA input form should appear
 * Actual behavior (bug): MFA form doesn't appear, user sees 401 error or stays on login page
 *
 * Root cause: Backend not returning error code 998 (which triggers MFA form) due to
 * rate-limiter or proxy header issues in self-hosted setups with reverse proxies.
 */
test.describe(
	'MFA Login Bug Reproduction (ADO-4902) @auth:none @db:reset',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test.describe.configure({ mode: 'serial' });

		test('MFA input field should appear after entering valid credentials', async ({ n8n }) => {
			// Step 1: Enable MFA for the user
			await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);
			await n8n.sideBar.signOutFromWorkflows();

			// Step 2: Navigate to sign-in page
			await n8n.signIn.goto();

			// Step 3: Enter email and password
			await n8n.signIn.fillEmail(email);
			await n8n.signIn.fillPassword(password);
			await n8n.signIn.clickSubmit();

			// Step 4: CRITICAL CHECK - MFA form should be visible
			// This is where the bug manifests: the form doesn't appear
			await expect(n8n.mfaLogin.getForm()).toBeVisible({ timeout: 10000 });

			// Step 5: Verify MFA code input field is present
			await expect(n8n.mfaLogin.getMfaCodeField()).toBeVisible();
		});

		test('Should not show error notification before MFA form appears', async ({ n8n }) => {
			// Step 1: Enable MFA for the user
			await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);
			await n8n.sideBar.signOutFromWorkflows();

			// Step 2: Navigate to sign-in page
			await n8n.signIn.goto();

			// Step 3: Enter email and password
			await n8n.signIn.fillEmail(email);
			await n8n.signIn.fillPassword(password);
			await n8n.signIn.clickSubmit();

			// Step 4: Check that no error notification appears
			// Bug symptom: User sees 401 error instead of MFA form
			const errorNotifications = n8n.notifications.getErrorNotifications();
			await expect(errorNotifications).toHaveCount(0, { timeout: 2000 });

			// Step 5: MFA form should be visible instead
			await expect(n8n.mfaLogin.getForm()).toBeVisible();
		});

		test('Should be able to complete login with MFA code after form appears', async ({ n8n }) => {
			// Step 1: Enable MFA for the user
			await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);
			await n8n.sideBar.signOutFromWorkflows();

			// Step 2: Navigate to sign-in page and enter credentials
			await n8n.signIn.goto();
			await n8n.signIn.fillEmail(email);
			await n8n.signIn.fillPassword(password);
			await n8n.signIn.clickSubmit();

			// Step 3: Wait for MFA form to appear (bug: doesn't appear)
			await expect(n8n.mfaLogin.getForm()).toBeVisible({ timeout: 10000 });

			// Step 4: Complete MFA login
			const mfaCode = authenticator.generate(mfaSecret!);
			await n8n.mfaLogin.submitMfaCode(mfaCode);

			// Step 5: Verify successful login
			await expect(n8n.page).toHaveURL(/workflows/);
		});

		test('MFA form should appear within 5 seconds of submitting credentials', async ({ n8n }) => {
			// Step 1: Enable MFA for the user
			await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);
			await n8n.sideBar.signOutFromWorkflows();

			// Step 2: Navigate to sign-in page
			await n8n.signIn.goto();

			// Step 3: Record time and submit credentials
			await n8n.signIn.fillEmail(email);
			await n8n.signIn.fillPassword(password);

			const startTime = Date.now();
			await n8n.signIn.clickSubmit();

			// Step 4: MFA form should appear quickly (not hang or show error)
			await expect(n8n.mfaLogin.getForm()).toBeVisible({ timeout: 5000 });

			const elapsedTime = Date.now() - startTime;

			// Should appear within 5 seconds in normal operation
			expect(elapsedTime).toBeLessThan(5000);
		});
	},
);
