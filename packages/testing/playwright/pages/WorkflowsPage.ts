import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';
import { AddResource } from './components/AddResource';
import { ResourceCards } from './components/ResourceCards';

export class WorkflowsPage extends BasePage {
	readonly addResource = new AddResource(this.page);
	readonly cards = new ResourceCards(this.page);

	async clickAddFirstProjectButton() {
		await this.clickByTestId('add-first-project-button');
	}

	async clickAddProjectButton() {
		await this.clickByTestId('project-plus-button');
	}

	/**
	 * This is the new workflow button on the workflows page, visible when there are no workflows.
	 */
	async clickNewWorkflowCard() {
		await this.clickByTestId('new-workflow-card');
	}

	getNewWorkflowCard() {
		return this.page.getByTestId('new-workflow-card');
	}

	getEasyAiWorkflowCard() {
		return this.page.getByTestId('easy-ai-workflow-card');
	}

	async clickEasyAiWorkflowCard() {
		await this.clickByTestId('easy-ai-workflow-card');
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

	getWorkflowFilterButton() {
		return this.page.getByTestId('workflow-filter-button');
	}

	getWorkflowTagsDropdown() {
		return this.page.getByTestId('workflow-tags-dropdown');
	}

	getWorkflowTagItem(tagName: string) {
		return this.page.getByTestId('workflow-tag-item').filter({ hasText: tagName });
	}

	getWorkflowArchivedCheckbox() {
		return this.page.getByTestId('workflow-archived-checkbox');
	}

	async unarchiveWorkflow(workflowItem: Locator) {
		await workflowItem.getByTestId('workflow-card-actions').click();
		await this.page.getByRole('menuitem', { name: 'Unarchive' }).click();
	}

	async deleteWorkflow(workflowItem: Locator) {
		await workflowItem.getByTestId('workflow-card-actions').click();
		await this.page.getByRole('menuitem', { name: 'Delete' }).click();
		await this.page.getByRole('button', { name: 'delete' }).click();
	}

	async search(searchTerm: string) {
		await this.clickByTestId('resources-list-search');
		await this.fillByTestId('resources-list-search', searchTerm);
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

	getFiltersButton() {
		return this.page.getByTestId('resources-list-filters-trigger');
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
		await this.getShowArchivedCheckbox().locator('span').nth(1).click();
		await this.closeFilters();
	}

	getStatusDropdown() {
		return this.page.getByTestId('status-dropdown');
	}

	/**
	 * Select a status filter (for active/deactivated workflows)
	 * @param status - 'All', 'Active', or 'Deactivated'
	 */
	async selectStatusFilter(status: 'All' | 'Active' | 'Deactivated') {
		await this.openFilters();
		await this.getStatusDropdown().getByRole('combobox', { name: 'Select' }).click();
		if (status === 'All') {
			await this.page.getByRole('option', { name: 'All' }).click();
		} else {
			await this.page.getByText(status, { exact: true }).click();
		}
		await this.closeFilters();
	}

	getTagsDropdown() {
		return this.page.getByTestId('tags-dropdown');
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

	deleteModalDeleteRadioButton() {
		return this.deleteFolderModal().getByTestId('delete-content-radio');
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
