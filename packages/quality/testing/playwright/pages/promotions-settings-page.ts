import type { Response } from '@playwright/test';

import { BasePage } from './BasePage';

/** Settings controls for providers, repository selection, and branch configuration. */
export class PromotionsSettingsPage extends BasePage {
	async goto() {
		await this.page.goto('/settings/promotions');
	}

	getProviderForm() {
		return this.page.getByTestId('promotion-provider-form-step');
	}

	getProviderRows() {
		return this.page.getByTestId('promotion-provider-row');
	}

	getProviderSaveButton() {
		return this.page.getByTestId('promotion-provider-save-button');
	}

	getRepositorySelect() {
		return this.page.getByTestId('promotion-connection-repository-select');
	}

	async addGitLabProvider(name: string, baseUrl: string, accessToken: string) {
		await this.page.getByTestId('promotion-connection-add-provider').click();
		await this.page.getByTestId('promotion-provider-name-input').fill(name);
		await this.page.getByTestId('promotion-provider-type-select').getByRole('combobox').click();
		await this.getVisiblePopoverOption('GitLab', { exact: true }).click();
		await this.page.getByTestId('promotion-provider-base-url-input').fill(baseUrl);
		await this.page.getByTestId('promotion-provider-password-input').fill(accessToken);
	}

	async saveProvider(): Promise<Response> {
		const [response] = await Promise.all([
			this.waitForRestResponse('/api/v1/promotions/providers', 'POST'),
			this.getProviderSaveButton().click(),
		]);
		return response;
	}

	async selectRepository(fullPath: string) {
		await this.getRepositorySelect().getByRole('combobox').click();
		await this.getVisiblePopoverOption(fullPath, { exact: true }).click();
	}

	async configureConnection(name: string, branchName: string) {
		await this.page.getByTestId('promotion-connection-name-input').fill(name);
		await this.page.getByTestId('promotion-connection-apply-toggle').click();
		await this.page.getByTestId('promotion-connection-apply-branch-input').fill(branchName);
		await this.page.getByTestId('promotion-connection-promote-toggle').click();
		await this.page.getByTestId('promotion-connection-promote-branch-input').fill(branchName);
	}

	async saveConnection(): Promise<Response> {
		const [response] = await Promise.all([
			this.waitForRestResponse('/api/v1/promotions/connections', 'POST'),
			this.page
				.getByTestId('promotion-connection-save-bar')
				.getByRole('button', { name: /save settings/i })
				.click(),
		]);
		return response;
	}
}
