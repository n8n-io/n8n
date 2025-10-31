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

	fillRepoUrl(url: string): Promise<void> {
		return this.getRepoUrlInput().fill(url);
	}
}
