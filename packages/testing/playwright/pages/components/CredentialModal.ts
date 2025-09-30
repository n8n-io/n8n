import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Credential modal component for canvas and credentials interactions.
 * Used within CanvasPage as `n8n.canvas.credentialModal.*`
 * Used within CredentialsPage as `n8n.credentials.modal.*`
 *
 * @example
 * // Access via canvas page or credentials page
 * await n8n.canvas.credentialModal.addCredential();
 * await expect(n8n.canvas.credentialModal.getModal()).toBeVisible();
 */
export class CredentialModal {
	constructor(private root: Locator) {}

	getModal(): Locator {
		return this.root;
	}

	getCredentialName(): Locator {
		return this.root.getByTestId('credential-name');
	}

	getNameInput(): Locator {
		return this.getCredentialName().getByTestId('inline-edit-input');
	}

	getCredentialInputs(): Locator {
		return this.root.getByTestId('credential-connection-parameter');
	}

	async waitForModal(): Promise<void> {
		await this.root.waitFor({ state: 'visible' });
	}

	async fillField(key: string, value: string): Promise<void> {
		const input = this.root.getByTestId(`parameter-input-${key}`).locator('input, textarea');
		await input.fill(value);
		await expect(input).toHaveValue(value);
	}

	async fillAllFields(values: Record<string, string>): Promise<void> {
		for (const [key, val] of Object.entries(values)) {
			await this.fillField(key, val);
		}
	}

	getSaveButton(): Locator {
		return this.root.getByTestId('credential-save-button');
	}

	async save(): Promise<void> {
		const saveBtn = this.getSaveButton();
		await saveBtn.click();
		await saveBtn.waitFor({ state: 'visible' });

		await saveBtn.getByText('Saved', { exact: true }).waitFor({ state: 'visible', timeout: 3000 });
	}

	async close(): Promise<void> {
		const closeBtn = this.root.locator('.el-dialog__close').first();
		if (await closeBtn.isVisible()) {
			await closeBtn.click();
		}
	}

	/**
	 * Add a credential to the modal
	 * @param fields - The fields to fill in the modal
	 * @param options - The options to pass to the modal
	 * @param options.closeDialog - Whether to close the modal after saving
	 * @param options.name - The name of the credential
	 */
	async addCredential(
		fields: Record<string, string>,
		options?: { closeDialog?: boolean; name?: string },
	): Promise<void> {
		await this.fillAllFields(fields);
		if (options?.name) {
			await this.getCredentialName().click();
			await this.getNameInput().fill(options.name);
		}
		await this.save();
		const shouldClose = options?.closeDialog ?? true;
		if (shouldClose) {
			await this.close();
		}
	}

	get oauthConnectButton() {
		return this.root.getByTestId('oauth-connect-button');
	}

	get oauthConnectSuccessBanner() {
		return this.root.getByTestId('oauth-connect-success-banner');
	}

	async editCredential(): Promise<void> {
		await this.root.page().getByTestId('credential-edit-button').click();
	}

	async deleteCredential(): Promise<void> {
		await this.root.page().getByTestId('credential-delete-button').click();
	}

	async confirmDelete(): Promise<void> {
		await this.root.page().getByRole('button', { name: 'Yes' }).click();
	}

	async renameCredential(newName: string): Promise<void> {
		await this.getCredentialName().click();
		await this.getNameInput().fill(newName);
		await this.getNameInput().press('Enter');
	}

	getAuthMethodSelector() {
		return this.root.page().getByText('Select Authentication Method');
	}

	getOAuthRedirectUrl() {
		return this.root.page().getByTestId('oauth-redirect-url');
	}

	getAuthTypeRadioButtons() {
		return this.root.page().locator('label.el-radio');
	}
}
