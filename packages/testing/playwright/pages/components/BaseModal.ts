import type { Page } from '@playwright/test';

import { FloatingUiHelper } from './FloatingUiHelper';

/**
 * Base modal component for handling modal dialogs.
 */
export class BaseModal extends FloatingUiHelper {
	constructor(protected readonly page: Page) {
		super(page);
	}

	get container() {
		return this.page.getByRole('dialog');
	}

	getCloseButton() {
		return this.container.getByRole('button', { name: /close/i });
	}

	async waitForModal() {
		await this.container.waitFor({ state: 'visible' });
	}

	async waitForModalToClose() {
		await this.container.waitFor({ state: 'hidden' });
	}

	async fillInput(text: string) {
		await this.container.getByRole('textbox').fill(text);
	}

	async clickButton(buttonText: string | RegExp) {
		await this.container.getByRole('button', { name: buttonText }).click();
	}

	async getTitle() {
		return await this.container.getByRole('heading').textContent();
	}

	async getMessage() {
		return await this.container.textContent();
	}
}
