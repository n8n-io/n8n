import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

/**
 * Page object for the WebAuthn-only branch of the MFA login screen
 * (`MfaView.vue`). The TOTP variant is covered by `MfaLoginPage`; the two
 * forms live in sibling templates with different containers, so they're
 * modelled as separate page objects rather than one mixed-scope class.
 */
export class MfaWebAuthnLoginPage extends BasePage {
	get container(): Locator {
		return this.page.getByTestId('mfa-webauthn-screen');
	}

	getWebAuthnButton(): Locator {
		return this.container.getByTestId('mfa-webauthn-button');
	}

	async clickWebAuthnButton(): Promise<void> {
		await this.getWebAuthnButton().click();
	}
}
