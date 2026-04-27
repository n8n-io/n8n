import { nanoid } from 'nanoid';

import { test, expect } from '../../../../fixtures/base';

test.describe(
	'Workflow Navigation from List - GHC-7877',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('should navigate to the same empty workflow repeatedly without creating new workflows', async ({
			n8n,
		}) => {
			// Create a project
			const { id: projectId } = await n8n.api.projects.createProject();

			// Create an empty workflow in the project
			const workflowName = `Empty Workflow ${nanoid()}`;
			const workflow = await n8n.api.workflows.createInProject(projectId, {
				name: workflowName,
				nodes: [],
				connections: {},
			});

			// Navigate to the project workflows list
			await n8n.page.goto(`projects/${projectId}/workflows`);

			// First click: Open the workflow
			await n8n.workflows.cards.clickWorkflowCard(workflowName);
			await expect(n8n.page).toHaveURL(new RegExp(`/workflow/${workflow.id}(\\?.*)?$`));

			// Navigate back to the workflows list
			await n8n.page.goto(`projects/${projectId}/workflows`);

			// Second click: Should open the SAME workflow, not create a new one
			await n8n.workflows.cards.clickWorkflowCard(workflowName);
			await expect(n8n.page).toHaveURL(new RegExp(`/workflow/${workflow.id}(\\?.*)?$`));

			// Navigate back again
			await n8n.page.goto(`projects/${projectId}/workflows`);

			// Third click: Should still open the SAME workflow
			await n8n.workflows.cards.clickWorkflowCard(workflowName);
			await expect(n8n.page).toHaveURL(new RegExp(`/workflow/${workflow.id}(\\?.*)?$`));
		});

		test('should open existing empty workflow from command bar without creating a new one', async ({
			n8n,
		}) => {
			// Create a project
			const { id: projectId } = await n8n.api.projects.createProject();

			// Create an empty workflow
			const workflowName = `Command Bar Test ${nanoid()}`;
			const workflow = await n8n.api.workflows.createInProject(projectId, {
				name: workflowName,
				nodes: [],
				connections: {},
			});

			// Navigate to home
			await n8n.goHome();

			// Search for workflow in command bar and open it
			await n8n.commandBar.search(workflowName);
			await n8n.commandBar.waitForLoadingToFinish();
			await n8n.commandBar.selectItem(workflowName);

			// Verify we're on the correct workflow
			await expect(n8n.page).toHaveURL(new RegExp(`/workflow/${workflow.id}(\\?.*)?$`));

			// Go back and try again via command bar
			await n8n.goHome();
			await n8n.commandBar.search(workflowName);
			await n8n.commandBar.waitForLoadingToFinish();
			await n8n.commandBar.selectItem(workflowName);

			// Should still be the same workflow
			await expect(n8n.page).toHaveURL(new RegExp(`/workflow/${workflow.id}(\\?.*)?$`));
		});

	},
);
