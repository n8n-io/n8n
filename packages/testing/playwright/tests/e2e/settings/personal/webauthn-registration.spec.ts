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
		test('Should register and delete a passkey and a security key', async ({ n8n }) => {
			// One end-to-end journey: register both kinds and then delete each.
			// One test rather than several because the DB state carries through
			// (we can't use `@db:reset`, that tag is container-only). The
			// virtual authenticators stay attached for the whole page lifetime
			// so the delete-time reverify ceremonies have the matching keys
			// available.
			//
			// Passwordless sign-in is not exercised here: Chromium's Conditional
			// UI requires the OS-level autofill picker, which doesn't render in
			// headless. That path is covered by the backend integration test
			// `webauthn.api.test.ts` (passwordless verify).
			const passkey = await attachVirtualAuthenticator(n8n.page, 'passkey');
			const securityKey = await attachVirtualAuthenticator(n8n.page, 'security_key');
			try {
				await n8n.signIn.loginWithEmailAndPassword(email, password, true);
				await n8n.settingsPersonal.goto();

				// 1. Register the passkey.
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

				// 2. Register the security key while the passkey is in
				// `excludeCredentials`. The `authenticatorAttachment: 'cross-platform'`
				// hint routes the ceremony to the security-key authenticator — without
				// it the browser would try the passkey first and hit InvalidStateError.
				await n8n.settingsPersonal.getEnableSecurityKeyButton().click();
				await n8n.settingsPersonal.registerWebAuthnCredential('YubiKey');
				await expect(n8n.settingsPersonal.getWebAuthnModal()).toBeHidden();
				await expect(n8n.settingsPersonal.getSecurityKeyCredentialByLabel('YubiKey')).toBeVisible();

				// 3. Remove the security key. `useMfaReverify('security_key')` →
				// re-verify via the cross-platform virtual authenticator → DELETE.
				await n8n.settingsPersonal.getSecurityKeyDeleteButtonForLabel('YubiKey').click();
				await expect(n8n.settingsPersonal.getSecurityKeyCredentialByLabel('YubiKey')).toBeHidden();
				// Passkey untouched.
				await expect(n8n.settingsPersonal.getPasskeyCredentialByLabel('My Mac')).toBeVisible();

				// 4. Remove the passkey. `useMfaReverify('passkey')` uses the
				// platform virtual authenticator.
				await n8n.settingsPersonal.getPasskeyDeleteButtonForLabel('My Mac').click();
				await expect(n8n.settingsPersonal.getPasskeyCredentialByLabel('My Mac')).toBeHidden();
			} finally {
				await passkey.cleanup();
				await securityKey.cleanup();
			}
		});
	},
);
