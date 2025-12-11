import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class SettingsEnvironmentPage extends BasePage {
	getConnectButton(): Locator {
		return this.page.getByTestId('source-control-connect-button');
	}

	getDisconnectButton(): Locator {
		return this.page.getByTestId('source-control-disconnect-button');
	}

	getSSHKeyValue(): Locator {
		return this.page.getByTestId('copy-input').locator('span').first();
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

	fillRepoUrl(url: string): Promise<void> {
		return this.getRepoUrlInput().fill(url);
	}

	async selectBranch(branchName: string): Promise<void> {
		await this.getBranchSelect().click();
		await this.page.getByRole('option', { name: branchName }).click();
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
		// Handle disconnect confirmation modal
		const modal = this.page.getByRole('dialog');
		try {
			await modal.waitFor({ state: 'visible', timeout: 2000 });
			// Click confirm button using standard CSS class selector
			await modal.locator('.btn--confirm').click();
		} catch {
			// Modal didn't appear or timed out
		}
	}
}
