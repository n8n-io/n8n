import { INSTANCE_OWNER_CREDENTIALS } from '../../../../config/test-users';
import { test, expect } from '../../../../fixtures/base';
import { attachVirtualAuthenticator } from '../../../../utils/webauthn-virtual-authenticator';

test.use({ capability: { env: { TEST_ISOLATION: 'webauthn' } } });

const { email, password } = INSTANCE_OWNER_CREDENTIALS;

test.describe(
	'WebAuthn @auth:none',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('Should register, sign in with, and delete a passkey and a security key', async ({
			n8n,
		}) => {
			// One end-to-end journey covering both methods:
			//   1. register passkey  →  MFA-login with passkey
			//   2. register security key  →  delete passkey first so the next
			//      sign-in can only use the security key
			//   3. MFA-login with security key  →  delete security key
			// Single test rather than several because the DB state carries
			// through (we can't use `@db:reset`, that tag is container-only) and
			// the virtual authenticators are page-scoped.
			//
			// Passwordless (Conditional UI) sign-in is not exercised here:
			// Chromium's autofill picker doesn't render in headless. That code
			// path is covered with real crypto by the backend integration test
			// `webauthn.api.test.ts` (passwordless verify).
			const passkey = await attachVirtualAuthenticator(n8n.page, 'passkey');
			const securityKey = await attachVirtualAuthenticator(n8n.page, 'security_key');
			try {
				await n8n.signIn.loginWithEmailAndPassword(email, password, true);
				await n8n.settingsPersonal.goto();

				// --- Passkey ---
				await n8n.settingsPersonal.getEnablePasskeyButton().click();
				await n8n.settingsPersonal.registerWebAuthnCredential('My Mac');
				// Recovery codes step shows on the user's *first ever* credential.
				// The seed user already has recovery codes (`test-users.ts`), so the
				// modal closes straight away — branch on either path.
				if (await n8n.settingsPersonal.getWebAuthnDoneButton().isVisible()) {
					await n8n.settingsPersonal.getWebAuthnDoneButton().click();
				}
				await expect(n8n.settingsPersonal.getWebAuthnModal()).toBeHidden();
				await expect(n8n.settingsPersonal.getPasskeyCredentialByLabel('My Mac')).toBeVisible();

				// MFA-login using the passkey (only credential in DB at this point).
				await n8n.sideBar.signOutFromWorkflows();
				await n8n.mfaComposer.loginWithWebAuthn(email, password);

				// --- Security key ---
				await n8n.settingsPersonal.goto();
				await n8n.settingsPersonal.getEnableSecurityKeyButton().click();
				await n8n.settingsPersonal.registerWebAuthnCredential('YubiKey');
				await expect(n8n.settingsPersonal.getWebAuthnModal()).toBeHidden();
				await expect(n8n.settingsPersonal.getSecurityKeyCredentialByLabel('YubiKey')).toBeVisible();

				// Drop the passkey so the next sign-in can only resolve to the
				// security key (otherwise `allowCredentials` would include both
				// and the picker would non-deterministically route to either
				// virtual authenticator).
				await n8n.settingsPersonal.getPasskeyDeleteButtonForLabel('My Mac').click();
				await expect(n8n.settingsPersonal.getPasskeyCredentialByLabel('My Mac')).toBeHidden();

				// MFA-login using the security key.
				await n8n.sideBar.signOutFromWorkflows();
				await n8n.mfaComposer.loginWithWebAuthn(email, password);

				// --- Delete security key ---
				await n8n.settingsPersonal.goto();
				await n8n.settingsPersonal.getSecurityKeyDeleteButtonForLabel('YubiKey').click();
				await expect(n8n.settingsPersonal.getSecurityKeyCredentialByLabel('YubiKey')).toBeHidden();
			} finally {
				await passkey.cleanup();
				await securityKey.cleanup();
			}
		});
	},
);
