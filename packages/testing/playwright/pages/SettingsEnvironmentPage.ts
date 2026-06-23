import { expect, type Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class SettingsEnvironmentPage extends BasePage {
	async goto(): Promise<void> {
		await this.page.goto('/settings/environments');
	}

	getConnectButton(): Locator {
		return this.page.getByTestId('source-control-connect-button');
	}

	getDisconnectButton(): Locator {
		return this.page.getByTestId('source-control-disconnect-button');
	}

	getRepoUrlInput(): Locator {
		return this.page.getByPlaceholder('git@github.com:user/repository.git');
	}

	getBranchSelect(): Locator {
		return this.page.getByTestId('source-control-branch-select');
	}

	getSaveButton(): Locator {
		return this.page.getByTestId('source-control-save-settings-button');
	}

	getRefreshSshKeyButton(): Locator {
		return this.page.getByTestId('source-control-refresh-ssh-key-button');
	}

	async waitForConnectForm(): Promise<void> {
		await expect(this.getRepoUrlInput()).toBeEditable();
		await expect(this.getRefreshSshKeyButton()).toBeVisible();
	}

	async fillRepoUrl(url: string): Promise<void> {
		await expect(this.getRepoUrlInput()).toBeEditable();
		await this.getRepoUrlInput().fill(url);
		await this.getRepoUrlInput().blur();
	}

	async selectBranch(branchName: string): Promise<void> {
		await this.getBranchSelect().click();
		await this.getVisiblePopoverOption(branchName).click();
	}

	async enableReadOnlyMode(): Promise<void> {
		const checkbox = this.page.getByTestId('source-control-read-only-checkbox');
		await checkbox.check();
	}

	async disableReadOnlyMode(): Promise<void> {
		const checkbox = this.page.getByTestId('source-control-read-only-checkbox');
		await checkbox.uncheck();
	}

	async disconnect(): Promise<void> {
		await this.getDisconnectButton().click();

		const confirmModal = this.page
			.getByRole('dialog')
			.filter({ hasText: 'Disconnect Git repository' });
		await expect(confirmModal).toBeVisible();
		await confirmModal.locator('.btn--confirm').click();
	}
}
