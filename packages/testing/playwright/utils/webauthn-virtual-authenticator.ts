import type { Page } from '@playwright/test';

/**
 * Attaches a virtual WebAuthn authenticator to the page via Chrome DevTools
 * Protocol. The browser's real `navigator.credentials.create/get` runs
 * against this virtual device, so registration and authentication ceremonies
 * complete deterministically inside Playwright — no physical key needed.
 *
 * Spec: https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/
 *
 * Returns the `authenticatorId` (needed if a test wants to remove the
 * authenticator mid-flight) and a `cleanup()` helper.
 */
export type VirtualAuthenticatorKind = 'passkey' | 'security_key';

export async function attachVirtualAuthenticator(
	page: Page,
	kind: VirtualAuthenticatorKind,
): Promise<{ authenticatorId: string; cleanup: () => Promise<void> }> {
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('WebAuthn.enable', { enableUI: false });

	const options =
		kind === 'passkey'
			? ({
					// Platform passkey: resident, user-verified internal authenticator.
					protocol: 'ctap2',
					transport: 'internal',
					hasResidentKey: true,
					hasUserVerification: true,
					isUserVerified: true,
					automaticPresenceSimulation: true,
				} as const)
			: ({
					// Roaming security key: non-resident, no PIN, USB transport.
					protocol: 'ctap2',
					transport: 'usb',
					hasResidentKey: false,
					hasUserVerification: false,
					automaticPresenceSimulation: true,
				} as const);

	const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', { options });

	const cleanup = async () => {
		try {
			await cdp.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
		} catch {
			// Test torn down before cleanup ran; ignore.
		}
		await cdp.detach();
	};

	return { authenticatorId, cleanup };
}
