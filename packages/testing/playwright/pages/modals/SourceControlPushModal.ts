import type { Locator, Page } from '@playwright/test';

export class SourceControlPushModal {
	constructor(private readonly page: Page) {}

	getModal() {
		return this.page.getByTestId('sourceControlPush-modal');
	}

	async open(): Promise<void> {
		await this.page.getByTestId('main-sidebar-source-control-push').click();
	}

	getSubmitButton(): Locator {
		return this.page.getByTestId('source-control-push-modal-submit');
	}

	async push(commitMessage: string): Promise<void> {
		await this.page.getByTestId('source-control-push-modal-commit').fill(commitMessage);
		await this.getSubmitButton().click();
	}

	// Tabs
	getWorkflowsTab(): Locator {
		return this.page.getByTestId('source-control-push-modal-tab-workflow');
	}

	getCredentialsTab(): Locator {
		return this.page.getByTestId('source-control-push-modal-tab-credential');
	}

	async selectWorkflowsTab(): Promise<void> {
		await this.getWorkflowsTab().click();
	}

	async selectCredentialsTab(): Promise<void> {
		await this.getCredentialsTab().click();
	}

	isWorkflowsTabSelected(): Promise<boolean> {
		return this.getWorkflowsTab()
			.getAttribute('class')
			.then((classList) => classList?.includes('tabActive') ?? false);
	}

	isCredentialsTabSelected(): Promise<boolean> {
		return this.getCredentialsTab()
			.getAttribute('class')
			.then((classList) => classList?.includes('tabActive') ?? false);
	}

	// File items
	getFileInModal(fileName: string): Locator {
		return this.getModal().getByText(fileName);
	}

	/**
	 * Get the checkbox for a specific file by its name
	 */
	getFileCheckboxByName(fileName: string): Locator {
		// Find the checkbox that is associated with the file name
		return this.getModal()
			.locator('[data-test-id="source-control-push-modal-file-checkbox"]')
			.filter({ has: this.page.getByText(fileName, { exact: true }) });
	}
}
