import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';

const MANUAL_TRIGGER_NODE_NAME = 'Manual Trigger';
const EXECUTE_WORKFLOW_NODE_NAME = 'Execute Sub-workflow';
const NOTION_NODE_NAME = 'Notion';
const NOTION_API_KEY = 'abc123Playwright';

// Example of using API calls in a test
async function getCredentialsForProject(n8n: n8nPage, projectId?: string) {
	const params = new URLSearchParams({
		includeScopes: 'true',
		includeData: 'true',
		...(projectId && { filter: JSON.stringify({ projectId }) }),
	});
	return await n8n.api.get('/rest/credentials', params);
}

test.describe('Projects', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
	});

	test('should not show project add button and projects to a member if not invited to any project @auth:member', async ({
		n8n,
	}) => {
		await expect(n8n.sideBar.getAddFirstProjectButton()).toBeDisabled();
		await expect(n8n.sideBar.getProjectMenuItems()).toHaveCount(0);
	});

	test('should filter credentials by project ID', async ({ n8n }) => {
		const { projectName, projectId } = await n8n.projectComposer.createProject();
		await n8n.projectComposer.addCredentialToProject(
			projectName,
			'Notion API',
			'apiKey',
			NOTION_API_KEY,
		);

		const credentials = await getCredentialsForProject(n8n, projectId);
		expect(credentials).toHaveLength(1);

		const { projectId: project2Id } = await n8n.projectComposer.createProject();
		const credentials2 = await getCredentialsForProject(n8n, project2Id);
		expect(credentials2).toHaveLength(0);
	});

	test('should create sub-workflow and credential in the sub-workflow in the same project @auth:owner', async ({
		n8n,
	}) => {
		const { projectName } = await n8n.projectComposer.createProject();
		await n8n.sideBar.addWorkflowFromUniversalAdd(projectName);
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();
		await expect(
			n8n.page.getByText('Workflow successfully created', { exact: false }),
		).toBeVisible();

		await n8n.canvas.addNode(EXECUTE_WORKFLOW_NODE_NAME, { action: 'Execute A Sub Workflow' });

		const subn8n = await n8n.start.fromNewPage(() =>
			n8n.ndv.selectWorkflowResource(`Create a Sub-Workflow in '${projectName}'`),
		);

		await subn8n.ndv.clickBackToCanvasButton();

		await subn8n.canvas.deleteNodeByName('Replace me with your logic');
		await subn8n.canvas.addNode(NOTION_NODE_NAME, { action: 'Append a block' });
		await subn8n.credentialsComposer.createFromNdv({
			apiKey: NOTION_API_KEY,
		});

		await subn8n.ndv.clickBackToCanvasButton();
		await subn8n.canvas.saveWorkflow();

		await subn8n.page.goto('/home/workflows');
		await subn8n.sideBar.clickProjectMenuItem(projectName);
		await subn8n.page.getByRole('link', { name: 'Workflows' }).click();

		// Get Workflow Count

		await expect(subn8n.workflows.cards.getWorkflows()).toHaveCount(2);

		// Assert that the sub-workflow is in the list
		await expect(subn8n.page.getByRole('heading', { name: 'My Sub-Workflow' })).toBeVisible();

		// Navigate to Credentials
		await subn8n.page.getByRole('link', { name: 'Credentials', exact: true }).click();

		// Assert that the credential is in the list
		await expect(subn8n.credentials.cards.getCredentials()).toHaveCount(1);
		await expect(subn8n.page.getByRole('heading', { name: 'Notion account' })).toBeVisible();
	});

	test.describe('Project Settings - Member Management', () => {
		test('should display project settings page with correct layout @auth:owner', async ({
			n8n,
		}) => {
			// Create a new project
			const { projectId } = await n8n.projectComposer.createProject('UI Test Project');

			// Navigate to project settings
			await n8n.page.goto(`/projects/${projectId}/settings`);
			await expect(n8n.projectSettings.getTitle()).toHaveText('UI Test Project');

			// Verify basic project settings form elements are visible (inner controls)
			await expect(n8n.projectSettings.getNameInput()).toBeVisible();
			await expect(n8n.projectSettings.getDescriptionTextarea()).toBeVisible();
			await n8n.projectSettings.expectMembersSelectIsVisible();

			// Verify members table is visible when there are members
			await n8n.projectSettings.expectTableIsVisible();

			// Initially should have only the owner (current user)
			await n8n.projectSettings.expectTableHasMemberCount(1);

			// Verify save/cancel buttons are not visible initially (no changes)
			await expect(n8n.page.getByTestId('project-settings-save-button')).toBeHidden();
			await expect(n8n.page.getByTestId('project-settings-cancel-button')).toBeHidden();

			// Delete button should always be visible
			await expect(n8n.page.getByTestId('project-settings-delete-button')).toBeVisible();
		});

		test('should allow editing project name and description @auth:owner', async ({ n8n }) => {
			// Create a new project
			const { projectId } = await n8n.projectComposer.createProject('Edit Test Project');

			// Navigate to project settings
			await n8n.page.goto(`/projects/${projectId}/settings`);
			await expect(n8n.projectSettings.getTitle()).toHaveText('Edit Test Project');

			// Update project name
			const newName = 'Updated Project Name';
			await n8n.projectSettings.fillProjectName(newName);

			// Update project description
			const newDescription = 'This is an updated project description.';
			await n8n.projectSettings.fillProjectDescription(newDescription);

			// Save changes
			await n8n.projectSettings.clickSaveButton();

			// Wait for success notification
			await expect(
				n8n.page.getByText('Project Updated Project Name saved successfully', { exact: false }),
			).toBeVisible();

			// Verify the form shows the updated values
			await n8n.projectSettings.expectProjectNameValue(newName);
			await n8n.projectSettings.expectProjectDescriptionValue(newDescription);
		});

		test('should display members table with correct structure @auth:owner', async ({ n8n }) => {
			// Create a new project
			const { projectId } = await n8n.projectComposer.createProject('Table Structure Test');

			// Navigate to project settings
			await n8n.page.goto(`/projects/${projectId}/settings`);
			await expect(n8n.projectSettings.getTitle()).toHaveText('Table Structure Test');

			const table = n8n.projectSettings.getMembersTable();

			// Verify table headers are present
			await expect(table.getByText('User')).toBeVisible();
			await expect(table.getByText('Role')).toBeVisible();

			// Verify the owner is displayed in the table
			const memberRows = table.locator('tbody tr');
			await expect(memberRows).toHaveCount(1);

			// Verify owner cannot change their own role
			const ownerRow = memberRows.first();
			const roleDropdown = ownerRow.getByTestId('project-member-role-dropdown');
			await expect(roleDropdown).toBeHidden();
		});

		test('should display role dropdown for members but not for current user @auth:owner', async ({
			n8n,
		}) => {
			// Create a new project
			const { projectId } = await n8n.projectComposer.createProject('Role Dropdown Test');

			// Navigate to project settings
			await n8n.page.goto(`/projects/${projectId}/settings`);
			await expect(n8n.projectSettings.getTitle()).toHaveText('Role Dropdown Test');

			// Current user (owner) should not have a role dropdown
			const currentUserRow = n8n.page.locator('tbody tr').first();
			await expect(currentUserRow.getByTestId('project-member-role-dropdown')).toBeHidden();

			// The role should be displayed as static text for the current user
			await expect(currentUserRow.getByText('Admin')).toBeVisible();
		});

		test('should handle member search functionality when search input is used', async ({ n8n }) => {
			// Create a new project
			const { projectId } = await n8n.projectComposer.createProject('Search Test Project');

			// Navigate to project settings
			await n8n.page.goto(`/projects/${projectId}/settings`);
			await expect(n8n.projectSettings.getTitle()).toHaveText('Search Test Project');

			// Verify search input is visible
			const searchInput = n8n.page.getByTestId('project-members-search');
			await expect(searchInput).toBeVisible();

			// Test search functionality - enter search term
			await searchInput.fill('nonexistent');

			// Since we only have the owner, searching for nonexistent should show no filtered results
			// But the table structure should still be present
			await expect(searchInput).toHaveValue('nonexistent');

			// Clear search
			await n8n.projectSettings.clearMemberSearch();
			await expect(searchInput).toHaveValue('');
		});

		test('should show project settings form validation @auth:owner', async ({ n8n }) => {
			// Create a new project
			const { projectId } = await n8n.projectComposer.createProject('Validation Test');

			// Navigate to project settings
			await n8n.page.goto(`/projects/${projectId}/settings`);
			await expect(n8n.projectSettings.getTitle()).toHaveText('Validation Test');

			// Clear the project name (required field)
			await n8n.projectSettings.fillProjectName('');

			// Save button should be disabled when required field is empty
			const saveButton = n8n.page.getByTestId('project-settings-save-button');
			await expect(saveButton).toBeDisabled();

			// Fill in a valid name
			await n8n.projectSettings.fillProjectName('Valid Project Name');

			// Save button should now be enabled
			await expect(saveButton).toBeEnabled();
		});

		test('should handle unsaved changes state @auth:owner', async ({ n8n }) => {
			// Create a new project
			const { projectId } = await n8n.projectComposer.createProject('Unsaved Changes Test');

			// Navigate to project settings
			await n8n.page.goto(`/projects/${projectId}/settings`);
			await expect(n8n.projectSettings.getTitle()).toHaveText('Unsaved Changes Test');

			// Initially, save and cancel buttons should not be visible (no changes)
			await expect(n8n.page.getByTestId('project-settings-save-button')).toBeHidden();
			await expect(n8n.page.getByTestId('project-settings-cancel-button')).toBeHidden();

			// Make a change to the project name
			await n8n.projectSettings.fillProjectName('Modified Name');

			// Save and cancel buttons should now be enabled
			await expect(n8n.page.getByTestId('project-settings-save-button')).toBeEnabled();
			await expect(n8n.page.getByTestId('project-settings-cancel-button')).toBeEnabled();

			// Unsaved changes message should be visible
			await expect(n8n.page.getByText('You have unsaved changes')).toBeVisible();

			// Cancel changes
			await n8n.projectSettings.clickCancelButton();

			// Buttons should not be visible again (no changes)
			await expect(n8n.page.getByTestId('project-settings-save-button')).toBeHidden();
			await expect(n8n.page.getByTestId('project-settings-cancel-button')).toBeHidden();
		});

		test('should display delete project section with warning @auth:owner', async ({ n8n }) => {
			// Create a new project
			const { projectId } = await n8n.projectComposer.createProject('Delete Test Project');

			// Navigate to project settings
			await n8n.page.goto(`/projects/${projectId}/settings`);
			await expect(n8n.projectSettings.getTitle()).toHaveText('Delete Test Project');

			// Scroll to bottom to see delete section
			await n8n.page
				.locator('[data-test-id="project-settings-delete-button"]')
				.scrollIntoViewIfNeeded();

			// Verify danger section is visible with warning
			// Copy was updated in UI to use sentence case and expanded description
			await expect(n8n.page.getByText('Danger zone')).toBeVisible();
			await expect(
				n8n.page.getByText(
					'When deleting a project, you can also choose to move all workflows and credentials to another project.',
				),
			).toBeVisible();
			await expect(n8n.page.getByTestId('project-settings-delete-button')).toBeVisible();
		});

		test('should persist settings after page reload @auth:owner', async ({ n8n }) => {
			// Create a new project
			const { projectId } = await n8n.projectComposer.createProject('Persistence Test');

			// Navigate to project settings
			await n8n.page.goto(`/projects/${projectId}/settings`);
			await expect(n8n.projectSettings.getTitle()).toHaveText('Persistence Test');

			// Update project details
			const projectName = 'Persisted Project Name';
			const projectDescription = 'This description should persist after reload';

			await n8n.projectSettings.fillProjectName(projectName);
			await n8n.projectSettings.fillProjectDescription(projectDescription);
			await n8n.projectSettings.clickSaveButton();

			// Wait for save confirmation (partial match to include project name)
			await expect(
				n8n.page.getByText('Project Persisted Project Name saved successfully', { exact: false }),
			).toBeVisible();

			// Reload the page
			await n8n.page.reload();
			await expect(n8n.projectSettings.getTitle()).toHaveText('Persisted Project Name');

			// Verify data persisted
			await n8n.projectSettings.expectProjectNameValue(projectName);
			await n8n.projectSettings.expectProjectDescriptionValue(projectDescription);

			// Verify table still shows the owner
			await n8n.projectSettings.expectTableHasMemberCount(1);
		});
	});
});
