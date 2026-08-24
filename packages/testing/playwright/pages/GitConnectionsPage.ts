import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';
import { MessageBox } from './components/messageBoxLocators';

/**
 * Page object for /settings/git-connections
 * Wraps the GitConnectionsView.vue settings page and its create/edit dialog.
 */
export class GitConnectionsPage extends BasePage {
	async goto(): Promise<void> {
		await this.page.goto('/settings/git-connections');
	}

	getAddButton(): Locator {
		return this.page.getByTestId('git-connections-add');
	}

	getDialog(): Locator {
		return this.page.getByTestId('git-connection-dialog');
	}

	getDeployKeyStep(): Locator {
		return this.page.getByTestId('git-connection-key-step');
	}

	getConnectionCard(name: string): Locator {
		return this.page.getByTestId('git-connection-card').filter({ hasText: name });
	}

	async addGitConnector(): Promise<void> {
		await this.getAddButton().click();
		await this.page.getByTestId('action-git').click();
	}

	async fillConnection(name: string, repositoryUrl: string): Promise<void> {
		await this.getDialog().getByTestId('git-connection-name-input').fill(name);
		await this.getDialog().getByTestId('git-connection-repository-url-input').fill(repositoryUrl);
	}

	async save(): Promise<void> {
		await this.getDialog().getByTestId('git-connection-save-button').click();
	}

	async confirmDeployKey(): Promise<void> {
		await this.getDeployKeyStep().getByTestId('git-connection-done-button').click();
	}

	async deleteConnection(name: string): Promise<void> {
		await this.getConnectionCard(name).getByRole('button').click();
		await this.page.getByTestId('action-delete').click();
		await new MessageBox(this.page).confirmButton.click();
	}
}
