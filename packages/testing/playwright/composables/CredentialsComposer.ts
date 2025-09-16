import type { CreateCredentialDto } from '@n8n/api-types';

import type { n8nPage } from '../pages/n8nPage';

export class CredentialsComposer {
	constructor(private readonly n8n: n8nPage) {}

	/**
	 * Create a credential through the Credentials list UI.
	 * Expects the visible label of the credential type (e.g. 'Notion API').
	 */
	async createFromList(
		credentialType: string,
		fields: Record<string, string>,
		options?: { name?: string; projectId?: string; closeDialog?: boolean },
	) {
		if (options?.projectId) {
			await this.n8n.navigate.toCredentials(options.projectId);
		} else {
			await this.n8n.navigate.toCredentials();
		}

		// Open the "new credential" chooser: open add resource -> credential
		await this.n8n.credentials.addResourceButton.click();
		await this.n8n.credentials.actionCredentialButton.click();
		await this.n8n.credentials.createCredentialFromCredentialPicker(credentialType, fields, {
			name: options?.name,
			closeDialog: options?.closeDialog,
		});
	}

	/**
	 * Create a credential through the NDV flow.
	 * Type is implied by the open node's credential requirement.
	 */
	async createFromNdv(
		fields: Record<string, string>,
		options?: { name?: string; closeDialog?: boolean },
	) {
		await this.n8n.ndv.clickCreateNewCredential();
		await this.n8n.canvas.credentialModal.addCredential(fields, {
			name: options?.name,
			closeDialog: options?.closeDialog,
		});
	}

	/**
	 * Create a credential directly via API. Returns created credential object.
	 */
	async createFromApi(payload: CreateCredentialDto & { projectId?: string }) {
		return await this.n8n.api.credentialApi.createCredential(payload);
	}
}
