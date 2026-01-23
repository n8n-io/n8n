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

		await this.n8n.credentials.addResource.credential();
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
		return await this.n8n.api.credentials.createCredential(payload);
	}

	/**
	 * Moves a credential to a different project.
	 * @param credentialName - The name of the credential to move
	 * @param projectNameOrEmail - The destination project name or user email
	 */
	async moveToProject(credentialName: string, projectNameOrEmail: string): Promise<void> {
		const credentialCard = this.n8n.credentials.cards.getCredential(credentialName);
		await this.n8n.credentials.cards.openCardActions(credentialCard);
		await this.n8n.credentials.cards.getCardAction('move').click();
		await this.n8n.resourceMoveModal.getProjectSelectCredential().locator('input').click();
		await this.n8n.resourceMoveModal.selectProjectOption(projectNameOrEmail);
		await this.n8n.resourceMoveModal.clickMoveCredentialButton();
	}
}
