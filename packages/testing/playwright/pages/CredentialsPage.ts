import { BasePage } from './BasePage';

export class CredentialsPage extends BasePage {
	get emptyListCreateCredentialButton() {
		return this.page.getByRole('button', { name: 'Add first credential' });
	}

	get createCredentialButton() {
		return this.page.getByTestId('create-credential-button');
	}

	get credentialCards() {
		return this.page.getByTestId('credential-cards');
	}

	/**
	 * Create a new credential of the specified type
	 * @param credentialType - The type of credential to create (e.g. 'Notion API')
	 */
	async openNewCredentialDialogFromCredentialList(credentialType: string): Promise<void> {
		await this.page.getByRole('combobox', { name: 'Search for app...' }).fill(credentialType);
		await this.page
			.getByTestId('new-credential-type-select-option')
			.filter({ hasText: credentialType })
			.click();
		await this.page.getByTestId('new-credential-type-button').click();
	}

	async openCredentialSelector() {
		await this.page.getByRole('combobox', { name: 'Select Credential' }).click();
	}

	async createNewCredential() {
		await this.clickByText('Create new credential');
	}

	async fillCredentialField(fieldName: string, value: string) {
		const field = this.page
			.getByTestId(`parameter-input-${fieldName}`)
			.getByTestId('parameter-input-field');
		await field.click();
		await field.fill(value);
	}

	async saveCredential() {
		await this.clickButtonByName('Save');
	}

	async closeCredentialDialog() {
		await this.clickButtonByName('Close this dialog');
	}

	async createAndSaveNewCredential(fieldName: string, value: string) {
		await this.openCredentialSelector();
		await this.createNewCredential();
		await this.filLCredentialSaveClose(fieldName, value);
	}

	async filLCredentialSaveClose(fieldName: string, value: string) {
		await this.fillCredentialField(fieldName, value);
		await this.saveCredential();
		await this.page.getByText('Connection tested successfully').waitFor({ state: 'visible' });
		await this.closeCredentialDialog();
	}
}
