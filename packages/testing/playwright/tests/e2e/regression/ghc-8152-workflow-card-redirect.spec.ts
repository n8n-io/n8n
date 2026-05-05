import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * GHC-8152: Clicking workflow in list redirects to blank "My workflow" with ?new=true
 * instead of opening the existing workflow.
 *
 * Bug Description:
 * - User clicks a workflow from the workflow list
 * - Instead of opening that workflow, n8n redirects to a new blank canvas
 * - The URL shows a different workflow ID with ?new=true appended
 * - The title shows "My workflow" instead of the actual workflow name
 * - Affects workflows in subfolders under Personal project
 *
 * Expected Behavior:
 * - Clicking a workflow card should navigate to /workflow/:workflowId
 * - The URL should NOT contain ?new=true
 * - The workflow name should match the clicked workflow
 * - The canvas should load the existing workflow data
 */
test.describe(
	'GHC-8152: Workflow card navigation regression',
	{
		annotation: [{ type: 'issue', description: 'GHC-8152' }],
	},
	() => {
		test('should open existing workflow from card in root project without ?new=true', async ({
			n8n,
		}) => {
			// GHC-8152: Test clicking workflow at project root level
			const { id: projectId } = await n8n.api.projects.createProject();
			const workflowName = `Test Workflow ${nanoid()}`;
			const workflow = await n8n.api.workflows.createInProject(projectId, {
				name: workflowName,
			});

			// Navigate to project workflows
			await n8n.page.goto(`projects/${projectId}/workflows`);

			// Click the workflow card
			const workflowCard = n8n.workflows.cards.getWorkflow(workflowName);
			await expect(workflowCard).toBeVisible();
			await workflowCard.click();

			// ASSERTION 1: URL should match /workflow/:workflowId WITHOUT ?new=true
			await expect(n8n.page).toHaveURL(new RegExp(`/workflow/${workflow.id}(?!.*new=true)`));

			// ASSERTION 2: Workflow name should match what we created (not "My workflow")
			await expect(n8n.canvas.getWorkflowName()).toHaveValue(workflowName);
		});

		test('should open existing workflow from card in subfolder without ?new=true', async ({
			n8n,
		}) => {
			// GHC-8152: Bug specifically affects workflows in subfolders
			const { id: projectId } = await n8n.api.projects.createProject();
			const folder = await n8n.api.projects.createFolder(projectId, 'DRC Workflows');
			const workflowName = `Test Workflow ${nanoid()}`;
			const workflow = await n8n.api.workflows.createInProject(projectId, {
				name: workflowName,
				settings: {
					folderId: folder.id,
				},
			});

			// Navigate to folder view
			await n8n.navigate.toFolder(folder.id, projectId);

			// Click the workflow card
			const workflowCard = n8n.workflows.cards.getWorkflow(workflowName);
			await expect(workflowCard).toBeVisible();
			await workflowCard.click();

			// ASSERTION 1: URL should match /workflow/:workflowId WITHOUT ?new=true
			// The bug causes redirect to a NEW workflow ID with ?new=true
			await expect(n8n.page).toHaveURL(new RegExp(`/workflow/${workflow.id}(?!.*new=true)`));

			// ASSERTION 2: Workflow name should match what we created (not "My workflow")
			// The bug shows "My workflow" as the default name for new workflows
			await expect(n8n.canvas.getWorkflowName()).toHaveValue(workflowName);

			// ASSERTION 3: URL should contain the CORRECT workflow ID (not a different one)
			expect(n8n.page.url()).toContain(workflow.id);
		});

		test('should open existing workflow from card in nested subfolder without ?new=true', async ({
			n8n,
		}) => {
			// GHC-8152: Test with deeply nested folders to verify folder path doesn't affect routing
			const { id: projectId } = await n8n.api.projects.createProject();
			const parentFolder = await n8n.api.projects.createFolder(projectId, 'Parent Folder');
			const childFolder = await n8n.api.projects.createFolder(
				projectId,
				'Child Folder',
				parentFolder.id,
			);
			const workflowName = `Nested Workflow ${nanoid()}`;
			const workflow = await n8n.api.workflows.createInProject(projectId, {
				name: workflowName,
				settings: {
					folderId: childFolder.id,
				},
			});

			// Navigate to nested folder
			await n8n.navigate.toFolder(childFolder.id, projectId);

			// Click the workflow card
			const workflowCard = n8n.workflows.cards.getWorkflow(workflowName);
			await expect(workflowCard).toBeVisible();
			await workflowCard.click();

			// ASSERTION: Should navigate to correct workflow without ?new=true
			await expect(n8n.page).toHaveURL(new RegExp(`/workflow/${workflow.id}(?!.*new=true)`));
			await expect(n8n.canvas.getWorkflowName()).toHaveValue(workflowName);
			expect(n8n.page.url()).toContain(workflow.id);
		});

		test('should open workflow from card in Personal project subfolder without ?new=true', async ({
			n8n,
		}) => {
			// GHC-8152: Bug report specifically mentions Personal project with subfolder
			await n8n.start.fromHome();

			// Get personal project ID
			const personalProject = await n8n.api.projects.getMyPersonalProject();
			const folder = await n8n.api.projects.createFolder(personalProject.id, 'DRC Workflows');
			const workflowName = `Personal Workflow ${nanoid()}`;
			const workflow = await n8n.api.workflows.createInProject(personalProject.id, {
				name: workflowName,
				settings: {
					folderId: folder.id,
				},
			});

			// Navigate to folder in Personal project
			await n8n.navigate.toFolder(folder.id, personalProject.id);

			// Click the workflow card
			const workflowCard = n8n.workflows.cards.getWorkflow(workflowName);
			await expect(workflowCard).toBeVisible();
			await workflowCard.click();

			// ASSERTION: Should open the correct workflow, not redirect to new workflow
			await expect(n8n.page).toHaveURL(new RegExp(`/workflow/${workflow.id}(?!.*new=true)`));
			await expect(n8n.canvas.getWorkflowName()).toHaveValue(workflowName);
		});
	},
);
