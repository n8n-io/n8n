import { nanoid } from 'nanoid';

import { test, expect } from '../../../../fixtures/base';

// Use isolated capability for fresh database
test.use({ capability: { env: { _ISOLATION: 'node-governance' } } });

test.describe('Node Governance', () => {
	test.describe('Navigation and Tab Switching', () => {
		test('can navigate to Node Governance page', async ({ n8n }) => {
			await n8n.navigate.toNodeGovernance();

			// Verify we're on the node governance page
			await expect(n8n.nodeGovernance.getPoliciesTab()).toBeVisible();
			await expect(n8n.nodeGovernance.getCategoriesTab()).toBeVisible();
			await expect(n8n.nodeGovernance.getRequestsTab()).toBeVisible();
		});

		test('can switch between Policies, Categories, and Requests tabs', async ({ n8n }) => {
			await n8n.navigate.toNodeGovernance();

			// Start on Policies tab (default)
			await expect(n8n.nodeGovernance.getPoliciesTab()).toBeVisible();

			// Switch to Categories tab
			await n8n.nodeGovernance.clickCategoriesTab();
			await expect(n8n.nodeGovernance.getAddCategoryButton()).toBeVisible();

			// Switch to Requests tab
			await n8n.nodeGovernance.clickRequestsTab();
			await expect(n8n.nodeGovernance.getRequestsSearch()).toBeVisible();

			// Switch back to Policies tab
			await n8n.nodeGovernance.clickPoliciesTab();
			await expect(n8n.nodeGovernance.getAddPolicyButton()).toBeVisible();
		});

		test.skip('shows pending request count badge on Requests tab', async ({ n8n, api }) => {
			// Create a project first
			const project = await api.projects.createProject('Governance Test Project');

			// Create a block policy so we can create an access request
			await api.nodeGovernance.createGlobalBlockPolicy('n8n-nodes-base.httpRequest');

			// Create an access request (as a different user context would normally do this)
			await api.nodeGovernance.createAccessRequest({
				projectId: project.id,
				nodeType: 'n8n-nodes-base.httpRequest',
				justification: 'Need HTTP node for API integration',
			});

			await n8n.navigate.toNodeGovernance();

			// Verify the badge shows count
			const badge = n8n.nodeGovernance.getRequestsBadge();
			await expect(badge).toBeVisible();
			await expect(badge).toContainText('1');

			// Cleanup
			await api.nodeGovernance.cleanupAll();
			await api.projects.deleteProject(project.id);
		});
	});

	test.describe('Policies Tab - CRUD Operations', () => {
		test('shows empty state when no policies exist', async ({ n8n, api }) => {
			// Ensure no policies exist
			await api.nodeGovernance.deleteAllPolicies();

			await n8n.navigate.toNodeGovernance();

			// Verify empty state is shown
			await expect(n8n.nodeGovernance.getEmptyState()).toBeVisible();
		});

		test('can create a global block policy for a node type', async ({ n8n, api }) => {
			// Cleanup first
			await api.nodeGovernance.deleteAllPolicies();

			await n8n.navigate.toNodeGovernance();

			// Click the action box button in empty state
			await n8n.nodeGovernance.getEmptyState().getByRole('button').click();

			// Fill policy form
			await n8n.nodeGovernance.fillPolicyForm({
				policyType: 'block',
				scope: 'global',
				targetType: 'node',
				targetValue: 'n8n-nodes-base.httpRequest',
			});

			// Submit form
			await n8n.nodeGovernance.submitPolicyForm();

			// Wait for policy to be created
			await n8n.nodeGovernance.waitForPolicyCreated();

			// Verify policy appears in the table
			await expect(n8n.page.getByText('n8n-nodes-base.httpRequest')).toBeVisible();
			await expect(n8n.page.getByText('Blocked')).toBeVisible();

			// Cleanup
			await api.nodeGovernance.deleteAllPolicies();
		});

		test.skip('can create a project-scoped allow policy for a category', async ({ n8n, api }) => {
			// Create a project and category first
			const project = await api.projects.createProject('Test Project');
			const category = await api.nodeGovernance.createCategory({
				displayName: 'External APIs',
				slug: `external-apis-${nanoid(6).toLowerCase()}`,
				description: 'Nodes for external API calls',
			});

			await n8n.navigate.toNodeGovernance();

			await n8n.nodeGovernance.clickAddPolicy();

			// Fill policy form with project scope
			await n8n.nodeGovernance.fillPolicyForm({
				policyType: 'allow',
				scope: 'projects',
				targetType: 'category',
				targetValue: category.displayName,
			});

			// Select project in the dropdown
			await n8n.page
				.locator('label:has-text("Projects")')
				.locator('..')
				.locator('.n8n-select')
				.click();
			await n8n.page.getByRole('option').filter({ hasText: project.name }).click();

			// Submit form
			await n8n.nodeGovernance.submitPolicyForm();
			await n8n.nodeGovernance.waitForPolicyCreated();

			// Verify policy appears
			await expect(n8n.page.getByText(category.displayName)).toBeVisible();
			await expect(n8n.page.getByText('Allowed')).toBeVisible();

			// Cleanup
			await api.nodeGovernance.cleanupAll();
			await api.projects.deleteProject(project.id);
		});

		test.skip('can edit an existing policy', async ({ n8n, api }) => {
			// Create a policy via API
			const policy = await api.nodeGovernance.createGlobalBlockPolicy('n8n-nodes-base.code');

			await n8n.navigate.toNodeGovernance();

			// Verify policy is visible
			await expect(n8n.page.getByText('n8n-nodes-base.code')).toBeVisible();

			// Click edit button
			await n8n.nodeGovernance.clickEditPolicyOnRow(0);

			// Change policy type to allow
			await n8n.nodeGovernance.fillPolicyForm({
				policyType: 'allow',
				targetValue: 'n8n-nodes-base.code',
			});

			// Submit form
			await n8n.nodeGovernance.submitPolicyForm();
			await n8n.nodeGovernance.waitForPolicyUpdated();

			// Verify policy is now showing as Allowed
			await expect(n8n.page.getByText('Allowed')).toBeVisible();

			// Cleanup
			await api.nodeGovernance.deletePolicy(policy.id);
		});

		test.skip('can delete a policy with confirmation dialog', async ({ n8n, api }) => {
			// Create a policy via API
			await api.nodeGovernance.createGlobalBlockPolicy('n8n-nodes-base.executeCommand');

			await n8n.navigate.toNodeGovernance();

			// Verify policy is visible
			await expect(n8n.page.getByText('n8n-nodes-base.executeCommand')).toBeVisible();

			// Click delete button
			await n8n.nodeGovernance.clickDeletePolicyOnRow(0);

			// Confirm deletion
			await n8n.nodeGovernance.confirmDelete();
			await n8n.nodeGovernance.waitForPolicyDeleted();

			// Verify policy is removed (empty state should appear)
			await expect(n8n.page.getByText('n8n-nodes-base.executeCommand')).not.toBeVisible();
		});

		test('newly created policy appears in the table', async ({ n8n, api }) => {
			// Cleanup first
			await api.nodeGovernance.deleteAllPolicies();

			// Create a policy via API
			await api.nodeGovernance.createGlobalBlockPolicy('n8n-nodes-base.ftp');

			await n8n.navigate.toNodeGovernance();

			// Verify policy is visible in table
			await expect(n8n.page.getByText('n8n-nodes-base.ftp')).toBeVisible();
			await expect(n8n.page.getByText('Blocked')).toBeVisible();
			await expect(n8n.page.getByText('Global', { exact: true })).toBeVisible();

			// Cleanup
			await api.nodeGovernance.deleteAllPolicies();
		});
	});

	// Skip search/sort/filter tests - require complex setup
	test.describe.skip('Policies Tab - Search, Sort, and Filter', () => {
		test.beforeEach(async ({ api }) => {
			// Create test policies
			await api.nodeGovernance.createGlobalBlockPolicy('n8n-nodes-base.httpRequest');
			await api.nodeGovernance.createGlobalAllowPolicy('n8n-nodes-base.code');
			await api.nodeGovernance.createGlobalBlockPolicy('n8n-nodes-base.executeCommand');
		});

		test.afterEach(async ({ api }) => {
			await api.nodeGovernance.cleanupAll();
		});

		test('can search policies by target value', async ({ n8n }) => {
			await n8n.navigate.toNodeGovernance();

			// Wait for policies to load
			await expect(n8n.page.getByText('n8n-nodes-base.httpRequest')).toBeVisible();

			// Search for 'code'
			await n8n.nodeGovernance.searchPolicies('code');

			// Verify only code policy is visible
			await expect(n8n.page.getByText('n8n-nodes-base.code')).toBeVisible();
			await expect(n8n.page.getByText('n8n-nodes-base.httpRequest')).not.toBeVisible();

			// Clear search
			await n8n.nodeGovernance.clearPoliciesSearch();
			await expect(n8n.page.getByText('n8n-nodes-base.httpRequest')).toBeVisible();
		});

		test('can sort policies by status or name', async ({ n8n }) => {
			await n8n.navigate.toNodeGovernance();

			// Wait for policies to load
			await expect(n8n.page.getByText('n8n-nodes-base.httpRequest')).toBeVisible();

			// Change sort to name ascending
			await n8n.nodeGovernance.getPoliciesSort().click();
			await n8n.page.getByRole('option', { name: /Name.*A-Z/i }).click();

			// First policy should now be sorted alphabetically
			// Code < ExecuteCommand < HttpRequest
			const firstRow = n8n.nodeGovernance.getPolicyRows().first();
			await expect(firstRow).toContainText('code');
		});

		test('can filter policies by status (allow/block)', async ({ n8n }) => {
			await n8n.navigate.toNodeGovernance();

			// Wait for policies to load
			await expect(n8n.page.getByText('n8n-nodes-base.httpRequest')).toBeVisible();

			// Open filter dropdown
			await n8n.nodeGovernance.openPoliciesFilters();

			// Filter by status: allow
			await n8n.nodeGovernance.selectPoliciesFilterStatus('allow');

			// Should only show the allow policy (code)
			await expect(n8n.page.getByText('n8n-nodes-base.code')).toBeVisible();
			await expect(n8n.page.getByText('n8n-nodes-base.httpRequest')).not.toBeVisible();
		});

		test('can filter policies by type (node/category)', async ({ n8n, api }) => {
			// Create a category and category policy
			const category = await api.nodeGovernance.createCategory({
				displayName: 'Test Category',
				slug: `test-cat-${nanoid(6).toLowerCase()}`,
			});
			await api.nodeGovernance.createPolicy({
				policyType: 'block',
				scope: 'global',
				targetType: 'category',
				targetValue: category.slug,
			});

			await n8n.navigate.toNodeGovernance();

			// Wait for policies to load
			await expect(n8n.page.getByText('Test Category')).toBeVisible();

			// Open filter dropdown
			await n8n.nodeGovernance.openPoliciesFilters();

			// Filter by type: category
			await n8n.nodeGovernance.selectPoliciesFilterType('category');

			// Should only show category policies
			await expect(n8n.page.getByText('Test Category')).toBeVisible();
			await expect(n8n.page.getByText('n8n-nodes-base.httpRequest')).not.toBeVisible();
		});

		test('filter count badge shows number of active filters', async ({ n8n }) => {
			await n8n.navigate.toNodeGovernance();

			// Initially no filters
			await expect(n8n.nodeGovernance.getPoliciesFiltersCount()).not.toBeVisible();

			// Open filter dropdown and apply a filter
			await n8n.nodeGovernance.openPoliciesFilters();
			await n8n.nodeGovernance.selectPoliciesFilterStatus('block');

			// Click outside to close dropdown
			await n8n.page.keyboard.press('Escape');

			// Badge should show 1
			await expect(n8n.nodeGovernance.getPoliciesFiltersCount()).toBeVisible();
			await expect(n8n.nodeGovernance.getPoliciesFiltersCount()).toContainText('1');
		});

		test('can reset filters', async ({ n8n }) => {
			await n8n.navigate.toNodeGovernance();

			// Apply a filter
			await n8n.nodeGovernance.openPoliciesFilters();
			await n8n.nodeGovernance.selectPoliciesFilterStatus('block');

			// Verify filter is applied
			await expect(n8n.page.getByText('n8n-nodes-base.code')).not.toBeVisible();

			// Reset filters
			await n8n.page.getByText('Reset').click();

			// Verify all policies are visible again
			await expect(n8n.page.getByText('n8n-nodes-base.code')).toBeVisible();
			await expect(n8n.page.getByText('n8n-nodes-base.httpRequest')).toBeVisible();
		});
	});

	test.describe('Categories Tab - CRUD Operations', () => {
		test('shows empty state when no categories exist', async ({ n8n, api }) => {
			// Ensure no categories exist
			await api.nodeGovernance.deleteAllCategories();

			await n8n.navigate.toNodeGovernance();
			await n8n.nodeGovernance.clickCategoriesTab();

			// Verify empty state is shown
			await expect(n8n.nodeGovernance.getEmptyState()).toBeVisible();
		});

		test('can create a new category with name, slug, description, and color', async ({
			n8n,
			api,
		}) => {
			// Cleanup first
			await api.nodeGovernance.deleteAllCategories();

			await n8n.navigate.toNodeGovernance();
			await n8n.nodeGovernance.clickCategoriesTab();

			// Click the action box button in empty state
			await n8n.nodeGovernance.getEmptyState().getByRole('button').click();

			// Fill category form
			await n8n.nodeGovernance.fillCategoryForm({
				displayName: 'External APIs',
				slug: 'external-apis',
				description: 'Nodes for external API integrations',
				color: '#FF5733',
			});

			// Submit form
			await n8n.nodeGovernance.submitCategoryForm();
			await n8n.nodeGovernance.waitForCategoryCreated();

			// Verify category appears
			await expect(n8n.page.getByText('External APIs')).toBeVisible();
			await expect(n8n.page.getByText('Nodes for external API integrations')).toBeVisible();

			// Cleanup
			await api.nodeGovernance.deleteAllCategories();
		});

		test.skip('can edit an existing category', async ({ n8n, api }) => {
			// Create a category via API
			const category = await api.nodeGovernance.createCategory({
				displayName: 'Original Name',
				slug: `orig-${nanoid(6).toLowerCase()}`,
			});

			await n8n.navigate.toNodeGovernance();
			await n8n.nodeGovernance.clickCategoriesTab();

			// Verify category is visible
			await expect(n8n.page.getByText('Original Name')).toBeVisible();

			// Click edit button
			await n8n.nodeGovernance.clickEditCategoryOnCard(0);

			// Update the name
			await n8n.nodeGovernance.fillCategoryForm({
				displayName: 'Updated Name',
				slug: category.slug,
			});

			// Submit form
			await n8n.nodeGovernance.submitCategoryForm();
			await n8n.nodeGovernance.waitForCategoryUpdated();

			// Verify updated name appears
			await expect(n8n.page.getByText('Updated Name')).toBeVisible();

			// Cleanup
			await api.nodeGovernance.deleteCategory(category.id);
		});

		test.skip('can delete a category with confirmation dialog', async ({ n8n, api }) => {
			// Create a category via API
			await api.nodeGovernance.createCategory({
				displayName: 'Category To Delete',
				slug: `del-${nanoid(6).toLowerCase()}`,
			});

			await n8n.navigate.toNodeGovernance();
			await n8n.nodeGovernance.clickCategoriesTab();

			// Verify category is visible
			await expect(n8n.page.getByText('Category To Delete')).toBeVisible();

			// Click delete button
			await n8n.nodeGovernance.clickDeleteCategoryOnCard(0);

			// Confirm deletion
			await n8n.nodeGovernance.confirmDelete();
			await n8n.nodeGovernance.waitForCategoryDeleted();

			// Verify category is removed
			await expect(n8n.page.getByText('Category To Delete')).not.toBeVisible();
		});

		test.skip('category card shows node count', async ({ n8n, api }) => {
			// Create a category and assign nodes to it
			const category = await api.nodeGovernance.createCategory({
				displayName: 'Category With Nodes',
				slug: `with-nodes-${nanoid(6).toLowerCase()}`,
			});

			// Assign nodes
			await api.nodeGovernance.assignNodeToCategory(category.id, 'n8n-nodes-base.httpRequest');
			await api.nodeGovernance.assignNodeToCategory(category.id, 'n8n-nodes-base.code');

			await n8n.navigate.toNodeGovernance();
			await n8n.nodeGovernance.clickCategoriesTab();

			// Verify node count is displayed
			await expect(n8n.page.getByText('2 nodes')).toBeVisible();

			// Cleanup
			await api.nodeGovernance.deleteCategory(category.id);
		});
	});

	// Skip manage nodes tests - requires more complex UI interactions
	test.describe.skip('Categories Tab - Manage Nodes', () => {
		test('can open Manage Nodes modal for a category', async ({ n8n, api }) => {
			// Create a category
			const category = await api.nodeGovernance.createCategory({
				displayName: 'Manageable Category',
				slug: `manage-${nanoid(6).toLowerCase()}`,
			});

			await n8n.navigate.toNodeGovernance();
			await n8n.nodeGovernance.clickCategoriesTab();

			// Click Manage Nodes button
			await n8n.nodeGovernance.clickManageNodesOnCard(0);

			// Verify modal is visible
			await expect(n8n.nodeGovernance.getCategoryNodesModal()).toBeVisible();

			// Close modal
			await n8n.page.keyboard.press('Escape');

			// Cleanup
			await api.nodeGovernance.deleteCategory(category.id);
		});

		test('can assign a node to a category', async ({ n8n, api }) => {
			// Create a category
			const category = await api.nodeGovernance.createCategory({
				displayName: 'Assignable Category',
				slug: `assign-${nanoid(6).toLowerCase()}`,
			});

			await n8n.navigate.toNodeGovernance();
			await n8n.nodeGovernance.clickCategoriesTab();

			// Click Manage Nodes button
			await n8n.nodeGovernance.clickManageNodesOnCard(0);

			// Wait for modal
			await expect(n8n.nodeGovernance.getCategoryNodesModal()).toBeVisible();

			// Type node type to add
			const modal = n8n.nodeGovernance.getCategoryNodesModal();
			await modal.locator('input').first().fill('n8n-nodes-base.httpRequest');
			await modal.getByRole('button', { name: /Add/i }).click();

			// Verify node is added
			await expect(modal.getByText('n8n-nodes-base.httpRequest')).toBeVisible();

			// Close modal
			await modal
				.getByRole('button', { name: /Close|Done/i })
				.first()
				.click();

			// Verify node count updated
			await expect(n8n.page.getByText('1 node')).toBeVisible();

			// Cleanup
			await api.nodeGovernance.deleteCategory(category.id);
		});

		test('can remove a node from a category', async ({ n8n, api }) => {
			// Create a category with a node assigned
			const category = await api.nodeGovernance.createCategory({
				displayName: 'Removable Category',
				slug: `remove-${nanoid(6).toLowerCase()}`,
			});
			await api.nodeGovernance.assignNodeToCategory(category.id, 'n8n-nodes-base.code');

			await n8n.navigate.toNodeGovernance();
			await n8n.nodeGovernance.clickCategoriesTab();

			// Verify initial node count
			await expect(n8n.page.getByText('1 node')).toBeVisible();

			// Click Manage Nodes button
			await n8n.nodeGovernance.clickManageNodesOnCard(0);

			// Wait for modal
			await expect(n8n.nodeGovernance.getCategoryNodesModal()).toBeVisible();

			// Find the remove button for the node
			const modal = n8n.nodeGovernance.getCategoryNodesModal();
			await modal
				.getByRole('button', { name: /Remove|Delete/i })
				.first()
				.click();

			// Close modal
			await modal
				.getByRole('button', { name: /Close|Done/i })
				.first()
				.click();

			// Verify node count is now 0
			await expect(n8n.page.getByText('0 nodes')).toBeVisible();

			// Cleanup
			await api.nodeGovernance.deleteCategory(category.id);
		});
	});

	// Skip requests tests for now - requires access request backend to be fully working
	test.describe.skip('Requests Tab - Review Access Requests', () => {
		test('shows empty state when no pending requests exist', async ({ n8n }) => {
			await n8n.navigate.toNodeGovernance();
			await n8n.nodeGovernance.clickRequestsTab();

			// Verify empty state is shown
			await expect(n8n.nodeGovernance.getEmptyState()).toBeVisible();
		});

		test('can approve a request (creates allow policy)', async ({ n8n, api }) => {
			// Create setup: project, block policy, and access request
			const project = await api.projects.createProject('Request Test Project');
			await api.nodeGovernance.createGlobalBlockPolicy('n8n-nodes-base.httpRequest');
			await api.nodeGovernance.createAccessRequest({
				projectId: project.id,
				nodeType: 'n8n-nodes-base.httpRequest',
				justification: 'Need HTTP node for API integration',
			});

			await n8n.navigate.toNodeGovernance();
			await n8n.nodeGovernance.clickRequestsTab();

			// Verify request is visible
			await expect(n8n.page.getByText('httpRequest')).toBeVisible();
			await expect(n8n.page.getByText('Need HTTP node for API integration')).toBeVisible();

			// Click approve button
			await n8n.nodeGovernance.clickApproveRequestOnCard(0);

			// Wait for modal
			await expect(n8n.nodeGovernance.getApproveRequestModal()).toBeVisible();

			// Submit approval
			await n8n.nodeGovernance.submitApproveRequest();
			await n8n.nodeGovernance.waitForRequestReviewed();

			// Verify request is removed from pending
			await expect(n8n.page.getByText('httpRequest')).not.toBeVisible();

			// Cleanup
			await api.nodeGovernance.cleanupAll();
			await api.projects.deleteProject(project.id);
		});

		test('can reject a request with a comment', async ({ n8n, api }) => {
			// Create setup: project, block policy, and access request
			const project = await api.projects.createProject('Reject Test Project');
			await api.nodeGovernance.createGlobalBlockPolicy('n8n-nodes-base.executeCommand');
			await api.nodeGovernance.createAccessRequest({
				projectId: project.id,
				nodeType: 'n8n-nodes-base.executeCommand',
				justification: 'Need to run shell commands',
			});

			await n8n.navigate.toNodeGovernance();
			await n8n.nodeGovernance.clickRequestsTab();

			// Verify request is visible
			await expect(n8n.page.getByText('executeCommand')).toBeVisible();

			// Click reject button
			await n8n.nodeGovernance.clickRejectRequestOnCard(0);

			// Wait for modal
			await expect(n8n.nodeGovernance.getRejectRequestModal()).toBeVisible();

			// Submit rejection with comment
			await n8n.nodeGovernance.submitRejectRequest('Security policy does not allow shell access');
			await n8n.nodeGovernance.waitForRequestReviewed();

			// Verify request is removed from pending
			await expect(n8n.page.getByText('executeCommand')).not.toBeVisible();

			// Cleanup
			await api.nodeGovernance.cleanupAll();
			await api.projects.deleteProject(project.id);
		});

		test('approved/rejected request is removed from pending list', async ({ n8n, api }) => {
			// Create multiple requests
			const project = await api.projects.createProject('Multi Request Project');
			await api.nodeGovernance.createGlobalBlockPolicy('n8n-nodes-base.httpRequest');
			await api.nodeGovernance.createGlobalBlockPolicy('n8n-nodes-base.code');

			await api.nodeGovernance.createAccessRequest({
				projectId: project.id,
				nodeType: 'n8n-nodes-base.httpRequest',
				justification: 'HTTP request is needed for API integration',
			});
			await api.nodeGovernance.createAccessRequest({
				projectId: project.id,
				nodeType: 'n8n-nodes-base.code',
				justification: 'Code node is required for data transformation',
			});

			await n8n.navigate.toNodeGovernance();
			await n8n.nodeGovernance.clickRequestsTab();

			// Verify both requests are visible
			await expect(n8n.page.getByText('httpRequest')).toBeVisible();
			await expect(n8n.page.getByText('code')).toBeVisible();

			// Approve first request
			await n8n.nodeGovernance.clickApproveRequestOnCard(0);
			await expect(n8n.nodeGovernance.getApproveRequestModal()).toBeVisible();
			await n8n.nodeGovernance.submitApproveRequest();
			await n8n.nodeGovernance.waitForRequestReviewed();

			// Verify only one request remains
			await expect(n8n.page.getByText('code')).toBeVisible();

			// Cleanup
			await api.nodeGovernance.cleanupAll();
			await api.projects.deleteProject(project.id);
		});

		test('can search requests by node type or requester', async ({ n8n, api }) => {
			// Create requests
			const project = await api.projects.createProject('Search Request Project');
			await api.nodeGovernance.createGlobalBlockPolicy('n8n-nodes-base.httpRequest');
			await api.nodeGovernance.createGlobalBlockPolicy('n8n-nodes-base.code');

			await api.nodeGovernance.createAccessRequest({
				projectId: project.id,
				nodeType: 'n8n-nodes-base.httpRequest',
				justification: 'HTTP request needed',
			});
			await api.nodeGovernance.createAccessRequest({
				projectId: project.id,
				nodeType: 'n8n-nodes-base.code',
				justification: 'Code node needed',
			});

			await n8n.navigate.toNodeGovernance();
			await n8n.nodeGovernance.clickRequestsTab();

			// Verify both requests are visible
			await expect(n8n.page.getByText('httpRequest')).toBeVisible();
			await expect(n8n.page.getByText('code')).toBeVisible();

			// Search for 'code'
			await n8n.nodeGovernance.searchRequests('code');

			// Verify only code request is visible
			await expect(n8n.page.getByText('code')).toBeVisible();
			await expect(n8n.page.getByText('httpRequest')).not.toBeVisible();

			// Clear search
			await n8n.nodeGovernance.clearRequestsSearch();
			await expect(n8n.page.getByText('httpRequest')).toBeVisible();

			// Cleanup
			await api.nodeGovernance.cleanupAll();
			await api.projects.deleteProject(project.id);
		});
	});
});
