import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

/**
 * Page object for SSO settings page interactions.
 */
export class SettingsSsoPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	/**
	 * Navigate to the SSO settings page
	 */
	async goto(): Promise<void> {
		await this.page.goto('/settings/sso');
	}

	/**
	 * Get the protocol select dropdown
	 */
	getProtocolSelect(): Locator {
		return this.page.getByTestId('sso-auth-protocol-select');
	}

	/**
	 * Select the OIDC protocol
	 */
	async selectOidcProtocol(): Promise<void> {
		await this.getProtocolSelect().locator('div').first().click();
		await this.page.getByText('OIDC', { exact: true }).click();
	}

	/**
	 * Select the SAML protocol
	 */
	async selectSamlProtocol(): Promise<void> {
		await this.getProtocolSelect().locator('div').first().click();
		await this.page.getByText('SAML', { exact: true }).click();
	}

	// --- OIDC Form Elements ---

	/**
	 * Get the OIDC discovery endpoint input
	 */
	getOidcDiscoveryEndpointInput(): Locator {
		return this.page.getByTestId('oidc-discovery-endpoint');
	}

	/**
	 * Get the OIDC client ID input
	 */
	getOidcClientIdInput(): Locator {
		return this.page.getByTestId('oidc-client-id');
	}

	/**
	 * Get the OIDC client secret input
	 */
	getOidcClientSecretInput(): Locator {
		return this.page.getByTestId('oidc-client-secret');
	}

	/**
	 * Get the OIDC prompt select
	 */
	getOidcPromptSelect(): Locator {
		return this.page.getByTestId('oidc-prompt');
	}

	/**
	 * Get the OIDC login enabled toggle
	 */
	getOidcLoginToggle(): Locator {
		return this.page.getByTestId('sso-oidc-toggle');
	}

	/**
	 * Get the OIDC save button
	 */
	getOidcSaveButton(): Locator {
		return this.page.getByTestId('sso-oidc-save');
	}

	/**
	 * Check if OIDC login is enabled
	 */
	async isOidcLoginEnabled(): Promise<boolean> {
		return await this.getOidcLoginToggle().locator('input').isChecked();
	}

	/**
	 * Enable OIDC login (if not already enabled)
	 */
	async enableOidcLogin(): Promise<void> {
		const isEnabled = await this.isOidcLoginEnabled();
		if (!isEnabled) {
			await this.getOidcLoginToggle().click();
		}
	}

	/**
	 * Disable OIDC login (if enabled)
	 */
	async disableOidcLogin(): Promise<void> {
		const isEnabled = await this.isOidcLoginEnabled();
		if (isEnabled) {
			await this.getOidcLoginToggle().click();
		}
	}

	/**
	 * Fill the OIDC form with the given configuration.
	 * Clears existing values and types slowly to ensure Vue reactivity picks up the changes.
	 */
	async fillOidcForm(config: {
		discoveryEndpoint: string;
		clientId: string;
		clientSecret: string;
		enableLogin?: boolean;
	}): Promise<void> {
		// Discovery endpoint has a default value that must be cleared first
		const discoveryInput = this.getOidcDiscoveryEndpointInput();
		await discoveryInput.click();
		await this.page.keyboard.press('Meta+A'); // Select all
		await discoveryInput.pressSequentially(config.discoveryEndpoint, { delay: 10 });

		const clientIdInput = this.getOidcClientIdInput();
		await clientIdInput.click();
		await this.page.keyboard.press('Meta+A');
		await clientIdInput.pressSequentially(config.clientId, { delay: 10 });

		const clientSecretInput = this.getOidcClientSecretInput();
		await clientSecretInput.click();
		await this.page.keyboard.press('Meta+A');
		await clientSecretInput.pressSequentially(config.clientSecret, { delay: 10 });

		if (config.enableLogin !== false) {
			await this.enableOidcLogin();
		}
	}

	/**
	 * Save the OIDC configuration and wait for API response
	 */
	async saveOidcConfig(): Promise<void> {
		const responsePromise = this.page.waitForResponse(
			(res) => res.url().includes('/rest/sso/oidc') && res.request().method() === 'POST',
		);
		await this.getOidcSaveButton().click();
		const response = await responsePromise;
		if (!response.ok()) {
			const body = await response.text();
			throw new Error(`OIDC config save failed: ${response.status()} - ${body}`);
		}
	}

	// --- SAML Form Elements ---

	/**
	 * Get the SAML save button
	 */
	getSamlSaveButton(): Locator {
		return this.page.getByTestId('sso-save');
	}

	/**
	 * Get the SAML login enabled toggle
	 */
	getSamlLoginToggle(): Locator {
		return this.page.getByTestId('sso-toggle');
	}

	// --- General Elements ---

	/**
	 * Get the SSO content container (when licensed)
	 */
	getSsoContentLicensed(): Locator {
		return this.page.getByTestId('sso-content-licensed');
	}

	/**
	 * Get the SSO content container (when unlicensed)
	 */
	getSsoContentUnlicensed(): Locator {
		return this.page.getByTestId('sso-content-unlicensed');
	}
}
