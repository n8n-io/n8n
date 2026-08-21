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
		// First-party OAuth for `n8nUserAuth` can bounce through /oauth/authorize
		// before the consent page or form HTML loads.
		await this.page.goto(url, { timeout: 30_000 });
		await this.completeFirstPartyConsentIfShown();
	}

	/**
	 * `n8nUserAuth` forms always start the first-party OAuth flow. Approve the
	 * consent screen when it appears so the follow-up GET can render the form.
	 * First-party clients skip the redirect-URI trust checkbox.
	 */
	private async completeFirstPartyConsentIfShown() {
		if (!this.page.url().includes('/oauth/consent')) {
			return;
		}

		const allow = this.page.getByRole('button', { name: 'Allow access' });
		await expect(allow).toBeEnabled();
		await allow.click();
		await expect(this.page.locator('#n8n-form')).toBeVisible();
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

	/** Form-level error banner above Submit (rejected submissions, not per-field validation). */
	get submitError(): Locator {
		return this.page.locator('#submit-error');
	}

	get submitButton(): Locator {
		return this.page.locator('#submit-btn');
	}

	/** In-flight spinner inside the submit button. */
	get submitSpinner(): Locator {
		return this.page.locator('#submit-btn span');
	}

	/** The "Form Submitted" card, swapped in for the form once a submission lands. */
	get submittedCard(): Locator {
		return this.page.locator('#submitted-form');
	}

	get body(): Locator {
		return this.page.locator('body');
	}

	/**
	 * Hidden flag the template renders from the node's response mode. "true" means
	 * the response body is consumed and written into the page, so submission
	 * handling takes a different branch.
	 */
	get usesResponseData(): Locator {
		return this.page.locator('#useResponseData');
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
