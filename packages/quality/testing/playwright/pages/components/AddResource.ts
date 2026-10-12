import type { Locator, Page } from '@playwright/test';

import { ActionToggle } from './ActionToggle';

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
	private readonly actionToggle: ActionToggle;

	constructor(private page: Page) {
		this.actionToggle = new ActionToggle(this.page);
	}

	getWorkflowButton(): Locator {
		return this.page.getByTestId('add-resource-workflow');
	}

	async workflow(): Promise<void> {
		await this.getWorkflowButton().click();
	}

	async credential(): Promise<void> {
		await this.page.getByTestId('add-resource-credential').click();
	}

	async folder(): Promise<void> {
		await this.page.getByTestId('add-resource').click();
		await this.actionToggle.getAction('folder').click();
	}

	async dataTable(fromDataTableTab: boolean = true): Promise<void> {
		if (fromDataTableTab) {
			await this.page.getByTestId('add-resource-dataTable').click();
		} else {
			await this.page.getByTestId('add-resource').click();
			await this.actionToggle.getAction('dataTable').click();
		}
	}
}
