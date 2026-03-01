import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';
import { AddResource } from './components/AddResource';
import { ResourceCards } from './components/ResourceCards';

export class WorkflowsPage extends BasePage {
	readonly addResource = new AddResource(this.page);
	readonly cards = new ResourceCards(this.page);

	/**
	 * This is the new workflow button on the workflows page, visible when there are no workflows.
	 */
	async clickNewWorkflowButtonFromOverview() {
		await this.clickByTestId('new-workflow-card');
	}

	async clickNewWorkflowButtonFromProject() {
		await this.clickByTestId('add-resource-workflow');
	}

	async clearSearch() {
		await this.clickByTestId('resources-list-search');
		await this.page.getByTestId('resources-list-search').clear();
	}

	getProjectName() {
		return this.page.getByTestId('project-name');
	}

	getSearchBar() {
		return this.page.getByTestId('resources-list-search');
	}

	async unarchiveWorkflow(workflowItem: Locator) {
		await workflowItem.getByTestId('workflow-card-actions').click();
		await this.page.getByRole('menuitem', { name: 'Unarchive' }).click();
	}

	async deleteWorkflow(workflowItem: Locator) {
		await workflowItem.getByTestId('workflow-card-actions').click();
		await this.page.getByTestId('action-delete').click();
		await this.page.getByRole('button', { name: 'delete' }).click();
	}

	async search(searchTerm: string) {
		await this.clickByTestId('resources-list-search');
		await this.fillByTestId('resources-list-search', searchTerm);
	}

	getNoWorkflowsFoundMessage() {
		return this.page.getByText('No workflows found');
	}

	async shareWorkflow(workflowName: string) {
		const workflow = this.cards.getWorkflow(workflowName);
		await workflow.getByTestId('workflow-card-actions').click();
		await this.page.getByRole('menuitem', { name: 'Share...' }).click();
	}

	getArchiveMenuItem() {
		return this.page.getByRole('menuitem', { name: 'Archive' });
	}

	async archiveWorkflow(workflowItem: Locator) {
		await workflowItem.getByTestId('workflow-card-actions').click();
		await this.getArchiveMenuItem().click();
	}

	async unpublishWorkflow(workflowItem: Locator) {
		await workflowItem.getByTestId('workflow-card-actions').click();
		await this.page.getByRole('menuitem', { name: 'Unpublish' }).click();
		await this.page.getByRole('button', { name: 'Unpublish' }).click();
	}

	async openFilters() {
		await this.clickByTestId('resources-list-filters-trigger');
	}

	async closeFilters() {
		await this.clickByTestId('resources-list-filters-trigger');
	}

	getShowArchivedCheckbox() {
		return this.page.getByTestId('show-archived-checkbox');
	}

	async toggleShowArchived() {
		await this.openFilters();
		await this.getShowArchivedCheckbox().click();
		await this.closeFilters();
	}

	async filterByTags(tags: string[]) {
		await this.openFilters();
		await this.clickByTestId('tags-dropdown');

		for (const tag of tags) {
			await this.page.getByRole('option', { name: tag }).locator('span').click();
		}

		await this.closeFilters();
	}

	async filterByTag(tag: string) {
		await this.filterByTags([tag]);
	}
	getFolderBreadcrumbsActions() {
		return this.page.getByTestId('folder-breadcrumbs-actions');
	}

	getFolderBreadcrumbsActionToggle() {
		return this.page.getByTestId('action-toggle-dropdown');
	}

	getFolderBreadcrumbsAction(actionName: string) {
		return this.getFolderBreadcrumbsActionToggle().getByTestId(`action-${actionName}`);
	}

	addFolderButton() {
		return this.page.getByTestId('add-folder-button');
	}

	// Add region for actions

	/**
	 * Add a folder from the add resource dropdown
	 * @returns The name of the folder
	 */
	async addFolder() {
		const folderName = 'My Test Folder';
		await this.addResource.folder();
		await this.fillFolderModal(folderName);
		return folderName;
	}

	/**
	 * Fill the folder modal
	 * @param folderName - The name of the folder
	 * @param buttonText - The text of the button to click (default: 'Create')
	 */
	async fillFolderModal(folderName: string, buttonText: string = 'Create') {
		await this.baseModal.fillInput(folderName);
		await this.baseModal.clickButton(buttonText);
	}

	deleteFolderModal() {
		return this.page.getByTestId('deleteFolder-modal');
	}

	deleteModalTransferRadioButton() {
		return this.deleteFolderModal().getByTestId('transfer-content-radio');
	}

	deleteModalConfirmButton() {
		return this.deleteFolderModal().getByTestId('confirm-delete-folder-button');
	}

	transferFolderDropdown() {
		return this.deleteFolderModal().getByRole('combobox', { name: 'Select a folder' });
	}

	transferFolderOption(folderName: string) {
		return this.page.getByTestId('move-to-folder-option').filter({ hasText: folderName });
	}

	// Move folder modal methods
	moveFolderModal() {
		return this.page.getByTestId('moveFolder-modal');
	}

	moveFolderDropdown() {
		return this.moveFolderModal().getByTestId('move-to-folder-dropdown').getByRole('combobox');
	}

	moveFolderOption(folderName: string) {
		return this.page.getByTestId('move-to-folder-option').filter({ hasText: folderName });
	}

	moveFolderConfirmButton() {
		return this.moveFolderModal().getByTestId('confirm-move-folder-button');
	}
}
