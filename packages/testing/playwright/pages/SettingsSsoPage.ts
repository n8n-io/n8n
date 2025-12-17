import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class SettingsSsoPage extends BasePage {
	async goto(): Promise<void> {
		await this.page.goto('/settings/sso');
	}

	getProtocolSelect(): Locator {
		return this.page.getByTestId('sso-auth-protocol-select');
	}

	async selectOidcProtocol(): Promise<void> {
		await this.getProtocolSelect().locator('.el-select').click();
		await this.page.locator('.el-select-dropdown__item').filter({ hasText: 'OIDC' }).click();
	}

	async selectSamlProtocol(): Promise<void> {
		await this.getProtocolSelect().locator('.el-select').click();
		await this.page.locator('.el-select-dropdown__item').filter({ hasText: 'SAML' }).click();
	}

	getOidcDiscoveryEndpointInput(): Locator {
		return this.page.getByTestId('oidc-discovery-endpoint');
	}

	getOidcClientIdInput(): Locator {
		return this.page.getByTestId('oidc-client-id');
	}

	getOidcClientSecretInput(): Locator {
		return this.page.getByTestId('oidc-client-secret');
	}

	getOidcPromptSelect(): Locator {
		return this.page.getByTestId('oidc-prompt');
	}

	getOidcLoginToggle(): Locator {
		return this.page.getByTestId('sso-oidc-toggle');
	}

	getOidcSaveButton(): Locator {
		return this.page.getByTestId('sso-oidc-save');
	}

	async isOidcLoginEnabled(): Promise<boolean> {
		return await this.getOidcLoginToggle().locator('input').isChecked();
	}

	async enableOidcLogin(): Promise<void> {
		const isEnabled = await this.isOidcLoginEnabled();
		if (!isEnabled) {
			await this.getOidcLoginToggle().click();
		}
	}

	async disableOidcLogin(): Promise<void> {
		const isEnabled = await this.isOidcLoginEnabled();
		if (isEnabled) {
			await this.getOidcLoginToggle().click();
		}
	}

	/** Fill the OIDC form. Discovery endpoint default value is cleared first. */
	async fillOidcForm(config: {
		discoveryEndpoint: string;
		clientId: string;
		clientSecret: string;
		enableLogin?: boolean;
	}): Promise<void> {
		const discoveryInput = this.getOidcDiscoveryEndpointInput();
		await discoveryInput.click();
		await this.page.keyboard.press('ControlOrMeta+a');
		await discoveryInput.pressSequentially(config.discoveryEndpoint, { delay: 10 });

		await this.getOidcClientIdInput().fill(config.clientId);
		await this.getOidcClientSecretInput().fill(config.clientSecret);

		if (config.enableLogin !== false) {
			await this.enableOidcLogin();
		}
	}

	/** Save the OIDC configuration and wait for API response. */
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

	getSamlSaveButton(): Locator {
		return this.page.getByTestId('sso-save');
	}

	getSamlLoginToggle(): Locator {
		return this.page.getByTestId('sso-toggle');
	}

	getSsoContentLicensed(): Locator {
		return this.page.getByTestId('sso-content-licensed');
	}

	getSsoContentUnlicensed(): Locator {
		return this.page.getByTestId('sso-content-unlicensed');
	}
}
