import type { Locator, Page } from '@playwright/test';

/**
 * AddResource component for creating workflows, credentials, folders, and data stores.
 * Represents the "add resource" functionality in the project header.
 *
 * @example
 * // Access via workflows page
 * await n8n.workflows.addResource.workflow();
 * await n8n.workflows.addResource.credential();
 * await n8n.workflows.addResource.folder();
 * await n8n.workflows.addResource.dataStore();
 */
export class AddResource {
	constructor(private page: Page) {}

	getWorkflowButton(): Locator {
		return this.page.getByTestId('add-resource-workflow');
	}

	getDropdownButton(): Locator {
		return this.page.getByTestId('add-resource');
	}

	getCredentialAction(): Locator {
		return this.page.getByTestId('action-credential');
	}

	getFolderAction(): Locator {
		return this.page.getByTestId('action-folder');
	}

	getDataStoreAction(): Locator {
		return this.page.getByTestId('action-dataStore');
	}

	getAction(actionType: string): Locator {
		return this.page.getByTestId(`action-${actionType}`);
	}

	async workflow(): Promise<void> {
		await this.getWorkflowButton().click();
	}

	async credential(): Promise<void> {
		await this.getDropdownButton().click();
		await this.getCredentialAction().click();
	}

	async folder(): Promise<void> {
		await this.getDropdownButton().click();
		await this.getFolderAction().click();
	}

	async dataStore(): Promise<void> {
		await this.getDropdownButton().click();
		await this.getDataStoreAction().click();
	}
}
