import type { GitCommitInfo, SourceControlledFile } from '@n8n/api-types';
import type { Locator, Page } from '@playwright/test';

export interface PushResult {
	files: SourceControlledFile[];
	commit: GitCommitInfo | null;
}

export class SourceControlPushModal {
	constructor(private readonly page: Page) {}

	getModal() {
		return this.page.getByTestId('sourceControlPush-modal');
	}

	getSubmitButton(): Locator {
		return this.page.getByTestId('source-control-push-modal-submit');
	}

	async push(commitMessage: string): Promise<PushResult> {
		await this.page.getByTestId('source-control-push-modal-commit').fill(commitMessage);

		const responsePromise = this.page.waitForResponse(
			(response) =>
				response.url().includes('/rest/source-control/push-workfolder') &&
				response.status() === 200,
		);

		await this.getSubmitButton().click();

		const response = await responsePromise;
		const json = await response.json();
		return json.data as PushResult;
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
		return this.getModal().getByTestId('push-modal-item').filter({ hasText: fileName }).first();
	}

	getFileCheckboxByName(fileName: string): Locator {
		// Find the checkbox that is associated with the file name
		return this.getModal()
			.locator('[data-test-id="source-control-push-modal-file-checkbox"]')
			.filter({ has: this.page.getByText(fileName, { exact: true }) });
	}

	async selectAllFilesInModal(): Promise<void> {
		const toggleAll = this.getModal().getByTestId('source-control-push-modal-toggle-all');
		const isChecked = await toggleAll.isChecked();
		if (!isChecked) {
			await toggleAll.click();
		}
	}

	getNotice(): Locator {
		return this.page.locator('#source-control-push-modal-notice.notice[role="alert"]');
	}

	getStatusBadge(fileName: string, status: 'New' | 'Modified' | 'Deleted'): Locator {
		return this.getFileCheckboxByName(fileName).getByText(status);
	}

	async deselectFile(fileName: string): Promise<void> {
		const checkbox = this.getFileCheckboxByName(fileName);
		const isChecked = await checkbox.isChecked();
		if (isChecked) {
			await checkbox.click();
		}
	}

	async selectFile(fileName: string): Promise<void> {
		const checkbox = this.getFileCheckboxByName(fileName);
		const isChecked = await checkbox.isChecked();
		if (!isChecked) {
			await checkbox.click();
		}
	}
}
