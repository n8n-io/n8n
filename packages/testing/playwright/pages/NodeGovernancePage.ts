import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class NodeGovernancePage extends BasePage {
	// ===== Tab Navigation =====

	getTab(name: 'policies' | 'categories' | 'requests'): Locator {
		return this.page.getByTestId(`tab-${name}`);
	}

	getPoliciesTab(): Locator {
		return this.getTab('policies');
	}

	getCategoriesTab(): Locator {
		return this.getTab('categories');
	}

	getRequestsTab(): Locator {
		return this.getTab('requests');
	}

	getRequestsBadge(): Locator {
		return this.getRequestsTab().locator('span').last();
	}

	getRefreshButton(): Locator {
		return this.page.getByTestId('refresh-button');
	}

	getEnabledSwitch(): Locator {
		return this.page.getByTestId('node-governance-enabled');
	}

	// ===== Policies Tab Elements =====

	getAddPolicyButton(): Locator {
		return this.page.getByTestId('add-policy-button');
	}

	getPoliciesSearch(): Locator {
		return this.page.getByTestId('policies-search');
	}

	getPoliciesSort(): Locator {
		return this.page.getByTestId('policies-sort');
	}

	getPoliciesFiltersTrigger(): Locator {
		return this.page.getByTestId('policies-filters-trigger');
	}

	getPoliciesFiltersCount(): Locator {
		return this.page.getByTestId('policies-filters-count');
	}

	getPoliciesFiltersDropdown(): Locator {
		return this.page.getByTestId('policies-filters-dropdown');
	}

	getPoliciesFilterStatus(): Locator {
		return this.page.getByTestId('policies-filter-status');
	}

	getPoliciesFilterType(): Locator {
		return this.page.getByTestId('policies-filter-type');
	}

	getPoliciesTable(): Locator {
		return this.page.locator('.n8n-data-table-server');
	}

	getPolicyRows(): Locator {
		return this.getPoliciesTable().locator('tbody tr');
	}

	getEditPolicyButton(): Locator {
		return this.page.getByTestId('edit-policy-button');
	}

	getDeletePolicyButton(): Locator {
		return this.page.getByTestId('delete-policy-button');
	}

	// ===== Categories Tab Elements =====

	getAddCategoryButton(): Locator {
		return this.page.getByTestId('add-category-button');
	}

	getCategoriesSearch(): Locator {
		return this.page.getByTestId('categories-search');
	}

	getCategoryCards(): Locator {
		return this.page.locator('.n8n-card');
	}

	getEditCategoryButton(): Locator {
		return this.page.getByTestId('edit-category-button');
	}

	getDeleteCategoryButton(): Locator {
		return this.page.getByTestId('delete-category-button');
	}

	getManageNodesButton(): Locator {
		return this.page.getByTestId('manage-nodes-button');
	}

	// ===== Requests Tab Elements =====

	getRequestsSearch(): Locator {
		return this.page.getByTestId('requests-search');
	}

	getRequestCards(): Locator {
		return this.page.locator('.n8n-card');
	}

	getApproveRequestButton(): Locator {
		return this.page.getByTestId('approve-request-button');
	}

	getRejectRequestButton(): Locator {
		return this.page.getByTestId('reject-request-button');
	}

	// ===== Modal Elements =====

	getPolicyFormModal(): Locator {
		return this.page.getByTestId('policyFormModal-modal');
	}

	getCategoryFormModal(): Locator {
		return this.page.getByTestId('categoryFormModal-modal');
	}

	getCategoryNodesModal(): Locator {
		return this.page.getByTestId('categoryNodesModal-modal');
	}

	getApproveRequestModal(): Locator {
		return this.page.getByTestId('reviewRequestModal-modal');
	}

	getRejectRequestModal(): Locator {
		return this.page.getByTestId('reviewRequestModal-modal');
	}

	// ===== Empty State =====

	getEmptyState(): Locator {
		return this.page.getByTestId('action-box');
	}

	// ===== Tab Navigation Actions =====

	async clickPoliciesTab(): Promise<void> {
		await this.getPoliciesTab().click();
	}

	async clickCategoriesTab(): Promise<void> {
		await this.getCategoriesTab().click();
	}

	async clickRequestsTab(): Promise<void> {
		await this.getRequestsTab().click();
	}

	async clickRefresh(): Promise<void> {
		await this.getRefreshButton().click();
	}

	// ===== Policies Tab Actions =====

	async clickAddPolicy(): Promise<void> {
		await this.getAddPolicyButton().click();
	}

	async searchPolicies(query: string): Promise<void> {
		await this.getPoliciesSearch().locator('input').fill(query);
	}

	async clearPoliciesSearch(): Promise<void> {
		await this.getPoliciesSearch().locator('input').clear();
	}

	async openPoliciesFilters(): Promise<void> {
		await this.getPoliciesFiltersTrigger().click();
	}

	async selectPoliciesFilterStatus(status: 'all' | 'allow' | 'block'): Promise<void> {
		await this.getPoliciesFilterStatus().click();
		await this.page.getByRole('option', { name: new RegExp(status, 'i') }).click();
	}

	async selectPoliciesFilterType(type: 'all' | 'node' | 'category'): Promise<void> {
		await this.getPoliciesFilterType().click();
		await this.page.getByRole('option', { name: new RegExp(type, 'i') }).click();
	}

	async clickEditPolicyOnRow(index: number = 0): Promise<void> {
		await this.getEditPolicyButton().nth(index).click();
	}

	async clickDeletePolicyOnRow(index: number = 0): Promise<void> {
		await this.getDeletePolicyButton().nth(index).click();
	}

	// ===== Policy Form Modal Actions =====

	async fillPolicyForm(options: {
		policyType?: 'allow' | 'block';
		scope?: 'global' | 'projects';
		targetType?: 'node' | 'category';
		targetValue?: string;
		projectIds?: string[];
	}): Promise<void> {
		const modal = this.getPolicyFormModal();

		if (options.policyType) {
			await modal
				.locator('label:has-text("Policy Type")')
				.locator('..')
				.locator('.el-select')
				.click();
			await this.page
				.locator('.el-select-dropdown__item')
				.filter({ hasText: new RegExp(`^${options.policyType}$`, 'i') })
				.click();
		}

		if (options.scope) {
			await modal.locator('label:has-text("Scope")').locator('..').locator('.el-select').click();
			await this.page
				.locator('.el-select-dropdown__item')
				.filter({ hasText: new RegExp(options.scope, 'i') })
				.click();
		}

		if (options.targetType) {
			await modal
				.locator('label:has-text("Target Type")')
				.locator('..')
				.locator('.el-select')
				.click();
			await this.page
				.locator('.el-select-dropdown__item')
				.filter({ hasText: new RegExp(`^${options.targetType}$`, 'i') })
				.click();
		}

		if (options.targetValue) {
			// Wait for the target value field to be ready
			await this.page.waitForTimeout(100);

			if (options.targetType === 'category') {
				// For category, use dropdown
				await modal
					.locator('label:has-text("Target Value")')
					.locator('..')
					.locator('.el-select')
					.click();
				await this.page
					.locator('.el-select-dropdown__item')
					.filter({ hasText: options.targetValue })
					.click();
			} else {
				// For node, use input
				await modal
					.locator('label:has-text("Target Value")')
					.locator('..')
					.locator('input')
					.fill(options.targetValue);
			}
		}
	}

	async submitPolicyForm(): Promise<void> {
		await this.getPolicyFormModal()
			.getByRole('button', { name: /Create|Save/ })
			.click();
	}

	async cancelPolicyForm(): Promise<void> {
		await this.getPolicyFormModal().getByRole('button', { name: 'Cancel' }).click();
	}

	// ===== Categories Tab Actions =====

	async clickAddCategory(): Promise<void> {
		await this.getAddCategoryButton().click();
	}

	async searchCategories(query: string): Promise<void> {
		await this.getCategoriesSearch().locator('input').fill(query);
	}

	async clearCategoriesSearch(): Promise<void> {
		await this.getCategoriesSearch().locator('input').clear();
	}

	async clickEditCategoryOnCard(index: number = 0): Promise<void> {
		await this.getEditCategoryButton().nth(index).click();
	}

	async clickDeleteCategoryOnCard(index: number = 0): Promise<void> {
		await this.getDeleteCategoryButton().nth(index).click();
	}

	async clickManageNodesOnCard(index: number = 0): Promise<void> {
		await this.getManageNodesButton().nth(index).click();
	}

	// ===== Category Form Modal Actions =====

	async fillCategoryForm(options: {
		displayName: string;
		slug: string;
		description?: string;
		color?: string;
	}): Promise<void> {
		const modal = this.getCategoryFormModal();

		await modal
			.locator('label:has-text("Display Name")')
			.locator('..')
			.locator('input')
			.fill(options.displayName);
		await modal.locator('label:has-text("Slug")').locator('..').locator('input').fill(options.slug);

		if (options.description) {
			await modal
				.locator('label:has-text("Description")')
				.locator('..')
				.locator('textarea')
				.fill(options.description);
		}

		if (options.color) {
			await modal
				.locator('label:has-text("Color")')
				.locator('..')
				.locator('input[type="text"]')
				.fill(options.color);
		}
	}

	async submitCategoryForm(): Promise<void> {
		await this.getCategoryFormModal()
			.getByRole('button', { name: /Create|Save/ })
			.click();
	}

	async cancelCategoryForm(): Promise<void> {
		await this.getCategoryFormModal().getByRole('button', { name: 'Cancel' }).click();
	}

	// ===== Requests Tab Actions =====

	async searchRequests(query: string): Promise<void> {
		await this.getRequestsSearch().locator('input').fill(query);
	}

	async clearRequestsSearch(): Promise<void> {
		await this.getRequestsSearch().locator('input').clear();
	}

	async clickApproveRequestOnCard(index: number = 0): Promise<void> {
		await this.getApproveRequestButton().nth(index).click();
	}

	async clickRejectRequestOnCard(index: number = 0): Promise<void> {
		await this.getRejectRequestButton().nth(index).click();
	}

	// ===== Approve/Reject Modal Actions =====

	async submitApproveRequest(): Promise<void> {
		await this.getApproveRequestModal()
			.getByRole('button', { name: /Approve/ })
			.click();
	}

	async submitRejectRequest(comment?: string): Promise<void> {
		const modal = this.getRejectRequestModal();

		if (comment) {
			await modal.locator('textarea').fill(comment);
		}

		await modal.getByRole('button', { name: /Reject/ }).click();
	}

	async cancelApproveRequest(): Promise<void> {
		await this.getApproveRequestModal().getByRole('button', { name: 'Cancel' }).click();
	}

	async cancelRejectRequest(): Promise<void> {
		await this.getRejectRequestModal().getByRole('button', { name: 'Cancel' }).click();
	}

	// ===== Confirmation Dialog Actions =====

	async confirmDelete(): Promise<void> {
		await this.page.getByRole('button', { name: 'Delete' }).click();
	}

	async cancelDelete(): Promise<void> {
		await this.page.getByRole('button', { name: 'Cancel' }).click();
	}

	// ===== Wait Helpers =====

	async waitForPoliciesLoaded(): Promise<void> {
		await this.waitForRestResponse('/rest/node-governance/policies', 'GET');
	}

	async waitForCategoriesLoaded(): Promise<void> {
		await this.waitForRestResponse('/rest/node-governance/categories', 'GET');
	}

	async waitForRequestsLoaded(): Promise<void> {
		await this.waitForRestResponse('/rest/node-governance/requests', 'GET');
	}

	async waitForPolicyCreated(): Promise<void> {
		await this.waitForRestResponse('/rest/node-governance/policies', 'POST');
	}

	async waitForPolicyUpdated(): Promise<void> {
		await this.waitForRestResponse(/\/rest\/node-governance\/policies\//, 'PATCH');
	}

	async waitForPolicyDeleted(): Promise<void> {
		await this.waitForRestResponse(/\/rest\/node-governance\/policies\//, 'DELETE');
	}

	async waitForCategoryCreated(): Promise<void> {
		await this.waitForRestResponse('/rest/node-governance/categories', 'POST');
	}

	async waitForCategoryUpdated(): Promise<void> {
		await this.waitForRestResponse(/\/rest\/node-governance\/categories\//, 'PATCH');
	}

	async waitForCategoryDeleted(): Promise<void> {
		await this.waitForRestResponse(/\/rest\/node-governance\/categories\//, 'DELETE');
	}

	async waitForRequestReviewed(): Promise<void> {
		await this.waitForRestResponse(/\/rest\/node-governance\/requests\/.*\/review/, 'POST');
	}
}
