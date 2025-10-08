import type { Request } from '@playwright/test';
import { expect } from '@playwright/test';
import { nanoid } from 'nanoid';

import type { n8nPage } from '../pages/n8nPage';

/**
 * A class for user interactions with workflows that go across multiple pages.
 */
export class WorkflowComposer {
	constructor(private readonly n8n: n8nPage) {}

	/**
	 * Executes a successful workflow and waits for the notification to be closed.
	 * This waits for http calls and also closes the notification.
	 */
	async executeWorkflowAndWaitForNotification(
		notificationMessage: string,
		options: { timeout?: number } = {},
	) {
		const { timeout = 3000 } = options;
		const responsePromise = this.n8n.page.waitForResponse(
			(response) =>
				response.url().includes('/rest/workflows/') &&
				response.url().includes('/run') &&
				response.request().method() === 'POST',
		);

		await this.n8n.canvas.clickExecuteWorkflowButton();
		await responsePromise;
		await this.n8n.notifications.waitForNotificationAndClose(notificationMessage, { timeout });
	}

	/**
	 * Creates a new workflow by clicking the add workflow button and setting the name
	 * @param workflowName - The name of the workflow to create
	 */
	async createWorkflow(workflowName = 'My New Workflow') {
		await this.n8n.workflows.addResource.workflow();
		await this.n8n.canvas.setWorkflowName(workflowName);

		const responsePromise = this.n8n.page.waitForResponse(
			(response) =>
				response.url().includes('/rest/workflows') && response.request().method() === 'POST',
		);
		await this.n8n.canvas.saveWorkflow();

		await responsePromise;
	}

	/**
	 * Creates a new workflow by importing a JSON file
	 * @param fileName - The workflow JSON file name (e.g., 'test_pdf_workflow.json', will search in workflows folder)
	 * @param name - Optional custom name. If not provided, generates a unique name
	 * @returns The actual workflow name that was used
	 */
	async createWorkflowFromJsonFile(
		fileName: string,
		name?: string,
	): Promise<{ workflowName: string }> {
		const workflowName = name ?? `Imported Workflow ${nanoid(8)}`;
		await this.n8n.goHome();
		await this.n8n.workflows.addResource.workflow();
		await this.n8n.canvas.importWorkflow(fileName, workflowName);
		return { workflowName };
	}

	/**
	 * Creates a new workflow by importing from a URL
	 * @param url - The URL to import the workflow from
	 * @returns Promise that resolves when the import is complete
	 */
	async importWorkflowFromURL(url: string): Promise<void> {
		await this.n8n.workflows.addResource.workflow();
		await this.n8n.canvas.clickWorkflowMenu();
		await this.n8n.canvas.clickImportFromURL();
		await this.n8n.canvas.fillImportURLInput(url);
		await this.n8n.canvas.clickConfirmImportURL();
	}

	/**
	 * Opens the import from URL dialog and then dismisses it by clicking outside
	 */
	async openAndDismissImportFromURLDialog(): Promise<void> {
		await this.n8n.workflows.addResource.workflow();
		await this.n8n.canvas.clickWorkflowMenu();
		await this.n8n.canvas.clickImportFromURL();
		await this.n8n.canvas.clickOutsideModal();
	}

	/**
	 * Opens the import from URL dialog and then cancels it
	 */
	async openAndCancelImportFromURLDialog(): Promise<void> {
		await this.n8n.workflows.addResource.workflow();
		await this.n8n.canvas.clickWorkflowMenu();
		await this.n8n.canvas.clickImportFromURL();
		await this.n8n.canvas.clickCancelImportURL();
	}

	/**
	 * Saves the current workflow and waits for the POST request to complete
	 * @returns The Request object containing the save request details
	 */
	async saveWorkflowAndWaitForRequest(): Promise<Request> {
		const saveRequestPromise = this.n8n.page.waitForRequest(
			(req) => req.url().includes('/rest/workflows') && req.method() === 'POST',
		);
		await this.n8n.canvas.clickSaveWorkflowButton();
		return await saveRequestPromise;
	}

	/**
	 * Duplicates a workflow via the duplicate modal UI.
	 * Verifies the form interaction completes without errors.
	 * Note: This opens a new window/tab with the duplicated workflow but doesn't interact with it.
	 * @param name - The name for the duplicated workflow
	 * @param tag - Optional tag to add to the workflow
	 */
	async duplicateWorkflow(name: string, tag?: string): Promise<void> {
		await this.n8n.workflowSettingsModal.getWorkflowMenu().click();
		await this.n8n.workflowSettingsModal.getDuplicateMenuItem().click();

		const modal = this.n8n.workflowSettingsModal.getDuplicateModal();
		await expect(modal).toBeVisible();

		const nameInput = this.n8n.workflowSettingsModal.getDuplicateNameInput();
		await expect(nameInput).toBeVisible();
		await nameInput.press('ControlOrMeta+a');
		await nameInput.fill(name);

		if (tag) {
			const tagsInput = this.n8n.workflowSettingsModal.getDuplicateTagsInput();
			await tagsInput.fill(tag);
			await tagsInput.press('Enter');
			await tagsInput.press('Escape');
		}

		const saveButton = this.n8n.workflowSettingsModal.getDuplicateSaveButton();
		await expect(saveButton).toBeVisible();
		await saveButton.click();
	}
}
