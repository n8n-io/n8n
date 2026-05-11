import { expect, type Locator, type Page } from '@playwright/test';

export class CommandBar {
	constructor(private page: Page) {}

	getContainer(): Locator {
		return this.page.getByTestId('command-bar');
	}

	getInput(): Locator {
		return this.getContainer().getByRole('textbox');
	}

	getItemsList(): Locator {
		return this.page.getByTestId('command-bar-items-list');
	}

	getItem(name: string): Locator {
		return this.getItemsList().getByText(name);
	}

	getSpinner(): Locator {
		return this.page.getByTestId('command-bar-input-spinner');
	}

	async open(): Promise<void> {
		await this.page.getByRole('button', { name: 'Open command palette' }).click();
		await expect(this.getContainer()).toBeVisible();
	}

	async search(query: string): Promise<void> {
		await this.open();
		await this.getInput().fill(query);
	}

	async waitForLoadingToFinish(): Promise<void> {
		await expect(this.getSpinner()).toBeHidden();
	}

	async selectItem(name: string): Promise<void> {
		const item = this.getItem(name);
		await expect(item).toBeVisible();
		await item.click();
	}
}
