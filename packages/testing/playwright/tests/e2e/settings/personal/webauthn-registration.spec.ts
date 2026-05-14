import { INSTANCE_OWNER_CREDENTIALS } from '../../../../config/test-users';
import { test, expect } from '../../../../fixtures/base';
import { attachVirtualAuthenticator } from '../../../../utils/webauthn-virtual-authenticator';

test.use({ capability: { env: { TEST_ISOLATION: 'webauthn-registration' } } });

const { email, password } = INSTANCE_OWNER_CREDENTIALS;

test.describe(
	'WebAuthn registration @auth:none',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('Should register a passkey and a security key end-to-end via virtual authenticators', async ({
			n8n,
		}) => {
			// Attach both kinds at once. The cross-platform attachment hint on the
			// security-key registration request should route the ceremony to the
			// security-key virtual authenticator, leaving the passkey one alone.
			// If the hint were missing (the bug we hit in dev with Bitwarden +
			// Mac), the browser would try the passkey authenticator first — that
			// credential is in `excludeCredentials`, so registration would fail
			// with `InvalidStateError`.
			const passkey = await attachVirtualAuthenticator(n8n.page, 'passkey');
			const securityKey = await attachVirtualAuthenticator(n8n.page, 'security_key');
			try {
				await n8n.signIn.loginWithEmailAndPassword(email, password, true);
				await n8n.settingsPersonal.goto();

				// 1. Register a passkey first.
				await n8n.settingsPersonal.getEnablePasskeyButton().click();
				await n8n.settingsPersonal.registerWebAuthnCredential('My Mac');
				// Recovery codes step shows on the user's *first ever* credential.
				// The seed user already has recovery codes in `test-users.ts`, so
				// the modal closes straight away here. Branch on either path.
				if (await n8n.settingsPersonal.getWebAuthnDoneButton().isVisible()) {
					await n8n.settingsPersonal.getWebAuthnDoneButton().click();
				}
				await expect(n8n.settingsPersonal.getWebAuthnModal()).toBeHidden();

				await expect(n8n.settingsPersonal.getPasskeyCredentialByLabel('My Mac')).toBeVisible();
				await expect(n8n.settingsPersonal.getAddPasskeyButton()).toBeVisible();

				// 2. Register a security key with the passkey still in
				// `excludeCredentials`.
				await n8n.settingsPersonal.getEnableSecurityKeyButton().click();
				await n8n.settingsPersonal.registerWebAuthnCredential('YubiKey');
				await expect(n8n.settingsPersonal.getWebAuthnModal()).toBeHidden();

				await expect(n8n.settingsPersonal.getSecurityKeyCredentialByLabel('YubiKey')).toBeVisible();
				await expect(n8n.settingsPersonal.getAddSecurityKeyButton()).toBeVisible();
				// The earlier passkey is still there.
				await expect(n8n.settingsPersonal.getPasskeyCredentialByLabel('My Mac')).toBeVisible();
			} finally {
				await passkey.cleanup();
				await securityKey.cleanup();
			}
		});
	},
);
