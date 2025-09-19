import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class WorkflowsPage extends BasePage {
	async clickAddFirstProjectButton() {
		await this.clickByTestId('add-first-project-button');
	}

	async clickAddProjectButton() {
		await this.clickByTestId('project-plus-button');
	}

	/**
	 * This is the add workflow button on the workflows page, visible when there are already workflows.
	 */
	async clickAddWorkflowButton() {
		await this.clickByTestId('add-resource-workflow');
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

	async searchWorkflows(searchTerm: string) {
		await this.clickByTestId('resources-list-search');
		await this.fillByTestId('resources-list-search', searchTerm);
	}

	getWorkflowItems() {
		return this.page.getByTestId('resources-list-item-workflow');
	}

	getWorkflowByName(name: string) {
		return this.getWorkflowItems().filter({ hasText: name });
	}

	async shareWorkflow(workflowName: string) {
		const workflow = this.getWorkflowByName(workflowName);
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
}
