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
	 * Workflow is autosaved after a name update
	 * @param workflowName - The name of the workflow to create
	 */
	async createWorkflow(workflowName = 'My New Workflow') {
		await this.n8n.workflows.addResource.workflow();
		await this.n8n.canvas.setWorkflowName(workflowName);
		await this.n8n.page.keyboard.press('Enter');

		await this.n8n.canvas.waitForSaveWorkflowCompleted();
	}

	/**
	 * Creates a new workflow by clicking the add workflow button
	 * Workflow is autosaved after a name update
	 * @param workflowName - The name of the workflow to create
	 */
	async createWorkflowFromSidebar(workflowName = 'My New Workflow') {
		await this.n8n.sideBar.addWorkflowFromUniversalAdd('Personal');
		await this.n8n.canvas.setWorkflowName(workflowName);
		await this.n8n.page.keyboard.press('Enter');

		await this.n8n.canvas.waitForSaveWorkflowCompleted();
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

	/**
	 * Moves a workflow to a different project or user.
	 * @param workflowName - The name of the workflow to move
	 * @param projectNameOrEmail - The destination project name or user email
	 * @param folder - The folder name (e.g., 'My Folder') or 'No folder (project root)' to place the workflow at project root level.
	 *   Pass null when moving to another user's personal project, as users cannot create folders in other users' personal spaces,
	 *   so the folder dropdown will not be shown. Defaults to 'No folder (project root)' which places the workflow at the root level.
	 */
	async moveToProject(
		workflowName: string,
		projectNameOrEmail: string,
		folder: string | null = 'No folder (project root)',
	): Promise<void> {
		const workflowCard = this.n8n.workflows.cards.getWorkflow(workflowName);
		await this.n8n.workflows.cards.openCardActions(workflowCard);
		await this.n8n.workflows.cards.getCardAction('moveToFolder').click();
		await this.selectProjectInMoveModal(projectNameOrEmail);

		if (folder !== null) {
			// Wait for folder dropdown to appear after project selection
			await this.n8n.resourceMoveModal.getFolderSelect().waitFor({ state: 'visible' });
			await this.selectFolderInMoveModal(folder);
		}

		await this.n8n.resourceMoveModal.clickConfirmMoveButton();
	}

	private async selectProjectInMoveModal(projectNameOrEmail: string): Promise<void> {
		const workflowSelect = this.n8n.resourceMoveModal.getProjectSelect();
		const input = workflowSelect.locator('input');
		await input.click();
		await input.waitFor({ state: 'visible' });
		await this.n8n.page.keyboard.press('ControlOrMeta+a');
		await this.n8n.page.keyboard.press('Backspace');
		await this.n8n.page.keyboard.type(projectNameOrEmail, { delay: 50 });

		const projectOption = this.n8n.page
			.getByTestId('project-sharing-info')
			.getByText(projectNameOrEmail)
			.first();
		await projectOption.waitFor({ state: 'visible' });
		await projectOption.click();
	}

	private async selectFolderInMoveModal(folderName: string): Promise<void> {
		await this.n8n.resourceMoveModal.getFolderSelect().locator('input').click();
		await this.n8n.page.keyboard.type(folderName, { delay: 50 });

		const folderOption = this.n8n.page.getByTestId('move-to-folder-option').getByText(folderName);
		await folderOption.waitFor({ state: 'visible' });
		await folderOption.click();
	}
}
