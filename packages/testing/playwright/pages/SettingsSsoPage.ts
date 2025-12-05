import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class SettingsSsoPage extends BasePage {
	/**
	 * Get the OIDC discovery endpoint field
	 */
	getOidcDiscoveryEndpointField(): Locator {
		return this.page.getByTestId('oidc-discovery-endpoint');
	}

	/**
	 * Get the OIDC client ID field
	 */
	getOidcClientIdField(): Locator {
		return this.page.getByTestId('oidc-client-id');
	}

	/**
	 * Get the OIDC client secret field
	 */
	getOidcClientSecretField(): Locator {
		return this.page.getByTestId('oidc-client-secret');
	}

	/**
	 * Select the authentication protocol (SAML or OIDC)
	 */
	async selectAuthProtocol(protocol: 'saml' | 'oidc') {
		const select = this.page.getByTestId('sso-auth-protocol-select').locator('input');
		await select.click();
		// The select dropdown uses the protocol as the value and uppercase as label
		await this.page.getByRole('option', { name: protocol.toUpperCase() }).click();
	}

	/**
	 * Fill the OIDC discovery endpoint field
	 */
	async fillOidcDiscoveryEndpoint(url: string) {
		// N8nInput wraps ElInput - fill directly on the wrapper element
		// Element Plus components delegate fill events to their internal input
		const field = this.getOidcDiscoveryEndpointField();
		await field.waitFor({ state: 'visible', timeout: 10000 });
		await field.fill(url);
	}

	/**
	 * Fill the OIDC client ID field
	 */
	async fillOidcClientId(clientId: string) {
		await this.getOidcClientIdField().fill(clientId);
	}

	/**
	 * Fill the OIDC client secret field
	 */
	async fillOidcClientSecret(clientSecret: string) {
		await this.getOidcClientSecretField().fill(clientSecret);
	}

	/**
	 * Toggle OIDC login enabled/disabled
	 */
	async toggleOidcEnabled(enabled: boolean) {
		const toggle = this.page.getByTestId('sso-oidc-toggle');
		const isCurrentlyEnabled = await toggle.locator('input').isChecked();

		if (isCurrentlyEnabled !== enabled) {
			await toggle.click();
		}
	}

	/**
	 * Click the save button for OIDC configuration
	 */
	async clickSaveOidc() {
		await this.clickByTestId('sso-oidc-save');
		// Wait for the save request to complete
		await this.waitForRestResponse('/rest/sso/oidc/config', 'POST');
	}

	/**
	 * Get the OIDC save button (for checking enabled/disabled state)
	 */
	getOidcSaveButton(): Locator {
		return this.page.getByTestId('sso-oidc-save');
	}

	/**
	 * Get the OIDC toggle
	 */
	getOidcToggle(): Locator {
		return this.page.getByTestId('sso-oidc-toggle');
	}
}
