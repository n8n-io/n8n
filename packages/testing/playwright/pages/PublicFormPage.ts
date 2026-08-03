import { expect, type BrowserContext, type Locator } from '@playwright/test';

import { BasePage } from './BasePage';

/**
 * The rendered public n8n form served by a Form Trigger / Send-and-Wait /
 * Wait-for-form node. It opens in its own browser tab (a new page or a popup),
 * separate from the editor tab the `n8n` facade drives, so it is rooted at its
 * own `Page` rather than the shared one.
 */
export class PublicFormPage extends BasePage {
	/** Open the form by navigating a fresh tab to its URL. */
	static async fromNewTab(context: BrowserContext, url: string): Promise<PublicFormPage> {
		const form = new PublicFormPage(await context.newPage());
		await form.goto(url);
		return form;
	}

	/**
	 * Wait for the form to open as a popup of the given context (e.g. a manual
	 * Wait-node execution that opens the form automatically). Register the
	 * listener before triggering the action that opens the popup.
	 */
	static fromPopup(context: BrowserContext): Promise<PublicFormPage> {
		return context.waitForEvent('page').then((page) => new PublicFormPage(page));
	}

	/** Navigate this tab to the form URL. */
	async goto(url: string) {
		await this.page.goto(url);
	}

	async fillField(label: string, value: string) {
		await this.page.getByLabel(label).fill(value);
	}

	getField(label: string): Locator {
		return this.page.getByLabel(label);
	}

	async submit(buttonName = 'Submit') {
		await this.page.getByRole('button', { name: buttonName }).click();
	}

	async expectText(text: string, options?: { timeout?: number }) {
		await expect(this.page.getByText(text)).toBeVisible(options);
	}

	/** Wait for the form submission POST to resolve, returning the response. */
	async waitForSubmission() {
		return await this.page.waitForResponse(
			(resp) => resp.url().includes('/form-test/') && resp.request().method() === 'POST',
		);
	}

	url(): string {
		return this.page.url();
	}

	async close() {
		await this.page.close();
	}
}
