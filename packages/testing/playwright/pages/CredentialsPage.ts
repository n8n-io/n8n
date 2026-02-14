import { BasePage } from './BasePage';
import { AddResource } from './components/AddResource';
import { CredentialModal } from './components/CredentialModal';
import { ResourceCards } from './components/ResourceCards';

export class CredentialsPage extends BasePage {
	readonly credentialModal = new CredentialModal(this.page.getByTestId('editCredential-modal'));
	readonly addResource = new AddResource(this.page);
	readonly cards = new ResourceCards(this.page);

	get emptyListCreateCredentialButton() {
		return this.page.getByRole('button', { name: 'Add first credential' });
	}

	get createCredentialButton() {
		return this.page.getByTestId('create-credential-button');
	}

	/**
	 * Create a credential from the credentials list, fill fields, save, and close the modal.
	 * @param credentialType - The type of credential to create (e.g. 'Notion API')
	 * @param fields - Key-value pairs for credential fields to fill
	 */
	async createCredentialFromCredentialPicker(
		credentialType: string,
		fields: Record<string, string>,
		options?: { closeDialog?: boolean; name?: string },
	): Promise<void> {
		await this.page.getByRole('combobox', { name: 'Search for app...' }).fill(credentialType);
		await this.page
			.getByTestId('new-credential-type-select-option')
			.filter({ hasText: credentialType })
			.click();
		await this.page.getByTestId('new-credential-type-button').click();
		await this.credentialModal.addCredential(fields, {
			name: options?.name,
			closeDialog: options?.closeDialog,
		});
	}

	async clearSearch() {
		await this.page.getByTestId('resources-list-search').clear();
	}

	async sortByNameDescending() {
		await this.page.getByTestId('resources-list-sort').click();
		await this.page.getByText('Name (Z-A)').click();
	}

	async sortByNameAscending() {
		await this.page.getByTestId('resources-list-sort').click();
		await this.page.getByText('Name (A-Z)').click();
	}

	/**
	 * Select credential type without auto-saving (for tests that need to handle save manually)
	 */
	async selectCredentialType(credentialType: string): Promise<void> {
		await this.page.getByRole('combobox', { name: 'Search for app...' }).fill(credentialType);
		await this.page
			.getByTestId('new-credential-type-select-option')
			.filter({ hasText: credentialType })
			.click();
		await this.page.getByTestId('new-credential-type-button').click();
	}
}
