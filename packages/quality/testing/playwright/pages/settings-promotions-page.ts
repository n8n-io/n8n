import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';
import { MessageBox } from './components/messageBoxLocators';

type Direction = 'apply' | 'promote';

export class SettingsPromotionsPage extends BasePage {
	async goto(): Promise<void> {
		await this.page.goto('/settings/promotions');
	}

	getAddEnvironmentButton(direction: Direction): Locator {
		return this.page.getByTestId(`promotion-environment-add-${direction}`);
	}

	getEnvironmentCard(direction: Direction): Locator {
		return this.page.getByTestId(`promotion-environment-card-${direction}`);
	}

	getEnvironmentStatus(direction: Direction): Locator {
		return this.getEnvironmentCard(direction).getByTestId('promotion-environment-status');
	}

	getProviderDialog(): Locator {
		return this.page.getByRole('dialog');
	}

	async pickProviderType(type: 'git' | 'gitlab'): Promise<void> {
		await this.clickByTestId(`promotion-provider-type-${type}`);
	}

	async createTokenProvider(name: string, username: string, password: string): Promise<void> {
		const dialog = this.getProviderDialog();
		await dialog.getByTestId('promotion-provider-name-input').fill(name);
		await dialog.getByTestId('promotion-provider-auth-type-select').click();
		await this.getVisiblePopoverOption('Username and password').click();
		await dialog.getByTestId('promotion-provider-username-input').fill(username);
		await dialog.getByTestId('promotion-provider-password-input').fill(password);
		await dialog.getByTestId('promotion-provider-save-button').click();
	}

	async fillEnvironment(name: string, remoteUrl: string): Promise<void> {
		await this.page.getByTestId('promotion-environment-name-input').getByRole('textbox').fill(name);
		await this.page
			.getByTestId('promotion-environment-remote-url-input')
			.getByRole('textbox')
			.fill(remoteUrl);
	}

	async saveEnvironment(): Promise<void> {
		await this.clickByTestId('promotion-environment-save');
	}

	async removeEnvironment(direction: Direction): Promise<void> {
		await this.getEnvironmentCard(direction)
			.getByTestId('promotion-environment-menu')
			.getByRole('button')
			.click();
		await this.page.getByTestId('action-remove').click();
		await new MessageBox(this.page).confirmButton.click();
	}
}
