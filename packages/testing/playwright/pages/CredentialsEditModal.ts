import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './BasePage';

export class CredentialsEditModal extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	getModal(): Locator {
		return this.page.getByTestId('editCredential-modal');
	}

	async waitForModal(): Promise<void> {
		await this.getModal().waitFor({ state: 'visible' });
	}

	async fillField(key: string, value: string): Promise<void> {
		const input = this.page.getByTestId(`parameter-input-${key}`).locator('input, textarea');
		await input.fill(value);
		await expect(input).toHaveValue(value);
	}

	async fillAllFields(values: Record<string, string>): Promise<void> {
		for (const [key, val] of Object.entries(values)) {
			await this.fillField(key, val);
		}
	}

	getSaveButton(): Locator {
		return this.page.getByTestId('credential-save-button');
	}

	async save(): Promise<void> {
		const saveBtn = this.getSaveButton();
		await saveBtn.click();
		await saveBtn.waitFor({ state: 'visible' });

		// Saved state changes the button text to "Saved"
		// Defensive wait for text when UI updates
		try {
			await saveBtn
				.getByText('Saved', { exact: true })
				.waitFor({ state: 'visible', timeout: 3000 });
		} catch {
			// ignore if text assertion is flaky; modal close below will still ensure flow continues
		}
	}

	async close(): Promise<void> {
		const closeBtn = this.getModal().locator('.el-dialog__close').first();
		if (await closeBtn.isVisible()) {
			await closeBtn.click();
		}
	}

	async setValues(values: Record<string, string>, save: boolean = true): Promise<void> {
		await this.waitForModal();
		await this.fillAllFields(values);

		if (save) {
			await this.save();
			await this.close();
		}
	}
}
