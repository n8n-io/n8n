import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.use({ capability: { env: { TEST_ISOLATION: 'n8n-9777-move-modal' } } });

/**
 * Regression test for N8N-9777
 * Bug: Move modal in workflow editor does not render the folder tree
 *
 * Expected: The Move modal should include the folder tree when opened from the
 * workflow editor, allowing users to select a specific folder as the move destination.
 *
 * Actual: The Move modal in the editor only shows users/projects. No folder tree
 * is rendered. Users must exit the editor and use the workflow list Move modal
 * to move a workflow into a folder.
 *
 * Steps to reproduce:
 * 1. Create a project with folders
 * 2. Open a workflow in the editor
 * 3. Click the workflow menu and select "Change Owner"
 * 4. Observe: modal shows users/projects only, no folder tree
 * 5. For comparison: from workflow list, right-click > Move shows the folder tree
 */
test.describe(
	'Move modal folder tree @db:reset',
	{
		annotation: [{ type: 'issue', description: 'N8N-9777' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			// Enable required features for projects and folders
			await n8n.api.enableFeature('sharing');
			await n8n.api.enableFeature('folders');
			await n8n.api.enableFeature('advancedPermissions');
			await n8n.api.enableFeature('projectRole:admin');
			await n8n.api.enableFeature('projectRole:editor');
			await n8n.api.setMaxTeamProjectsQuota(-1);
		});

		test('should show folder tree in Move modal when opened from workflow editor', async ({
			n8n,
			api,
		}) => {
			// Create a team project
			const projectName = `Test Project ${nanoid()}`;
			const { projectId } = await n8n.projectComposer.createProject(projectName);

			// Create a folder in the project using API
			const folderName = `Test Folder ${nanoid()}`;
			await api.projects.createFolder(projectId, folderName);

			// Navigate to the project and create a workflow
			await n8n.sideBar.clickProjectMenuItem(projectName);
			await n8n.navigate.toWorkflows();
			await n8n.workflows.clickNewWorkflowButtonFromOverview();

			// Add a node and save the workflow
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.waitForSaveWorkflowCompleted();

			// Open the Move modal from the workflow editor (canvas header)
			await n8n.canvas.clickWorkflowMenu();
			await n8n.page.getByTestId('workflow-menu-item-change-owner').click();

			// Wait for the modal to be visible
			await n8n.page
				.getByTestId('project-move-resource-modal')
				.waitFor({ state: 'visible' });

			// ASSERTION 1: Verify the project selector is visible
			await expect(n8n.resourceMoveModal.getProjectSelectCredential()).toBeVisible();

			// ASSERTION 2 (FAILING): Verify the folder tree/dropdown is visible
			// This is the bug - the folder selector should be visible but is not
			await expect(n8n.resourceMoveModal.getFolderSelect()).toBeVisible();

			// ASSERTION 3 (FAILING): Verify we can interact with the folder selector
			// This should work once the folder tree is visible
			await n8n.resourceMoveModal.getFolderSelect().click();
			await expect(n8n.page.getByText(folderName)).toBeVisible();
		});

		test('should show folder tree in Move modal when opened from workflow list (baseline)', async ({
			n8n,
			api,
		}) => {
			// Create a team project
			const projectName = `Test Project ${nanoid()}`;
			const { projectId } = await n8n.projectComposer.createProject(projectName);

			// Create a folder in the project using API
			const folderName = `Test Folder ${nanoid()}`;
			await api.projects.createFolder(projectId, folderName);

			// Create a workflow using API
			const workflowName = `Test Workflow ${nanoid()}`;
			await api.workflows.createWorkflow({
				name: workflowName,
				nodes: [
					{
						id: 'uuid-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [240, 300],
						parameters: {},
					},
				],
				connections: {},
				settings: {
					executionOrder: 'v1' as const,
				},
				projectId,
			});

			// Navigate to the project workflows list
			await n8n.sideBar.clickProjectMenuItem(projectName);
			await n8n.navigate.toWorkflows();

			// Open the Move modal from the workflow list
			const workflowCard = n8n.workflows.cards.getWorkflow(workflowName);
			await n8n.workflows.cards.openCardActions(workflowCard);
			await n8n.workflows.cards.getCardAction('moveToFolder').click();

			// Wait for the modal to be visible
			await n8n.page.waitForSelector('[data-test-id="confirm-move-folder-button"]', {
				state: 'visible',
			});

			// ASSERTION: Verify the folder tree/dropdown is visible in the workflow list modal
			// This should PASS - it's the baseline showing the expected behavior
			await expect(n8n.resourceMoveModal.getFolderSelect()).toBeVisible();

			// Verify we can interact with the folder selector
			await n8n.resourceMoveModal.getFolderSelect().click();
			await expect(n8n.page.getByText(folderName)).toBeVisible();
		});
	},
);
