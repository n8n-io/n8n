import type { Locator, Page } from '@playwright/test';

/**
 * AddResource component for creating workflows, credentials, folders, and data tables.
 * Represents the "add resource" functionality in the project header.
 *
 * @example
 * // Access via workflows page
 * await n8n.workflows.addResource.workflow();
 * await n8n.workflows.addResource.credential();
 * await n8n.workflows.addResource.folder();
 * await n8n.workflows.addResource.dataTable();
 */
export class AddResource {
	constructor(private page: Page) {}

	getWorkflowButton(): Locator {
		return this.page.getByTestId('add-resource-workflow');
	}

	getAction(actionType: string): Locator {
		return this.page.getByTestId(`action-${actionType}`);
	}

	async workflow(): Promise<void> {
		await this.getWorkflowButton().click();
	}

	async credential(): Promise<void> {
		await this.page.getByTestId('add-resource-credential').click();
	}

	async folder(): Promise<void> {
		await this.page.getByTestId('add-resource').click();
		await this.page.getByTestId('action-folder').click();
	}

	async dataTable(fromDataTableTab: boolean = true): Promise<void> {
		if (fromDataTableTab) {
			await this.page.getByTestId('add-resource-dataTable').click();
		} else {
			await this.page.getByTestId('add-resource').click();
			await this.page.getByTestId('action-dataTable').click();
		}
	}
}
