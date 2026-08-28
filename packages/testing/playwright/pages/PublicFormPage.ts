import { expect, type BrowserContext, type FrameLocator, type Locator } from '@playwright/test';

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

	/**
	 * Wait for this tab itself to navigate away from the form — the author's
	 * end-of-form redirect must take the whole tab, even when the form was
	 * rendered inside the hosting shell's iframe.
	 */
	async waitForRedirect(url: string | RegExp, options?: { timeout?: number }) {
		await this.page.waitForURL(url, options);
	}

	async close() {
		await this.page.close();
	}

	// --- Hosting shell ---
	// A form that needs the submitter's own accounts is served inside an n8n-owned
	// shell page: the connect panel lives in the shell, the author's form in a
	// sandboxed iframe beside it. The shell is on the real origin; the frame is not.

	/** Root of the hosting shell wrapped around a form that needs connected accounts. */
	get shell(): Locator {
		return this.page.locator('.shell');
	}

	/** The author's form, rendered in the shell's sandboxed iframe. */
	private get formFrame(): FrameLocator {
		return this.page.frameLocator('#form-frame');
	}

	/** One account's row in the connect panel, by the credential it stands for. */
	credentialRow(credentialId: string): Locator {
		return this.page.locator(`.cred-row[data-cred-id="${credentialId}"]`).first();
	}

	/**
	 * The authorize link the row's Connect button would open. Reading it lets a test
	 * drive the provider flow directly instead of through a popup.
	 */
	async credentialConnectUrl(credentialId: string): Promise<string> {
		const url = await this.credentialRow(credentialId).locator('.connect').getAttribute('data-url');
		if (!url) throw new Error(`No connect link rendered for credential ${credentialId}`);
		return url;
	}

	/**
	 * The form's own OAuth2 flow sends the submitter through n8n's consent screen the
	 * first time. Approve it if it is showing, then wait for the shell to render.
	 */
	async allowOAuthConsentAndWaitForShell() {
		const allow = this.page.getByRole('button', { name: 'Allow access' });
		await expect(allow.or(this.shell).first()).toBeVisible();
		if (await allow.isVisible()) {
			await allow.click();
		}
		await expect(this.shell).toBeVisible();
	}

	frameField(label: string): Locator {
		return this.formFrame.getByLabel(label);
	}

	async fillFrameField(label: string, value: string) {
		await this.frameField(label).fill(value);
	}

	async submitInFrame(buttonName = 'Submit') {
		await this.formFrame.getByRole('button', { name: buttonName }).click();
	}

	frameText(text: string): Locator {
		return this.formFrame.getByText(text);
	}
}
