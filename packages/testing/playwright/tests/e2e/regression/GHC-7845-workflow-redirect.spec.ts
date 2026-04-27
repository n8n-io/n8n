import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * Regression test for GHC-7845: Opening Workflows Redirecting to wrong workflow
 * https://github.com/n8n-io/n8n/issues/28946
 *
 * Bug: When clicking on a workflow from the list, it redirects to a different workflow
 * instead of opening the clicked workflow.
 */
test.describe(
	'GHC-7845: Workflow redirect bug',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should open the correct workflow when clicking on a workflow card', async ({
			n8n,
			api,
		}) => {
			const uniqueId = nanoid(8);

			// Create multiple workflows via API to set up test data
			const workflowAlpha = await api.workflows.createWorkflow({
				name: `Workflow Alpha ${uniqueId}`,
				nodes: [],
				connections: {},
			});

			const workflowBeta = await api.workflows.createWorkflow({
				name: `Workflow Beta ${uniqueId}`,
				nodes: [],
				connections: {},
			});

			const workflowGamma = await api.workflows.createWorkflow({
				name: `Workflow Gamma ${uniqueId}`,
				nodes: [],
				connections: {},
			});

			// Navigate to workflows list
			await n8n.goHome();

			// Click on Workflow Beta (the middle one)
			await n8n.workflows.cards.clickWorkflowCard(workflowBeta.name);

			// Verify we're on the correct workflow by checking the URL
			await expect(n8n.page).toHaveURL(new RegExp(`/workflow/${workflowBeta.id}(\\?.*)?$`));

			// Verify the workflow name displayed matches what we clicked
			await expect(n8n.canvas.getWorkflowName()).toHaveAttribute('title', workflowBeta.name);

			// Go back and test opening a different workflow
			await n8n.goHome();

			// Click on Workflow Gamma
			await n8n.workflows.cards.clickWorkflowCard(workflowGamma.name);

			// Verify we're on the correct workflow
			await expect(n8n.page).toHaveURL(new RegExp(`/workflow/${workflowGamma.id}(\\?.*)?$`));
			await expect(n8n.canvas.getWorkflowName()).toHaveAttribute('title', workflowGamma.name);

			// Go back and test the first workflow
			await n8n.goHome();

			// Click on Workflow Alpha
			await n8n.workflows.cards.clickWorkflowCard(workflowAlpha.name);

			// Verify we're on the correct workflow
			await expect(n8n.page).toHaveURL(new RegExp(`/workflow/${workflowAlpha.id}(\\?.*)?$`));
			await expect(n8n.canvas.getWorkflowName()).toHaveAttribute('title', workflowAlpha.name);
		});

		test('should open the correct workflow when clicking on workflow card in rapid succession', async ({
			n8n,
			api,
		}) => {
			const uniqueId = nanoid(8);

			// Create multiple workflows
			const workflows = await Promise.all([
				api.workflows.createWorkflow({
					name: `Workflow 1 ${uniqueId}`,
					nodes: [],
					connections: {},
				}),
				api.workflows.createWorkflow({
					name: `Workflow 2 ${uniqueId}`,
					nodes: [],
					connections: {},
				}),
				api.workflows.createWorkflow({
					name: `Workflow 3 ${uniqueId}`,
					nodes: [],
					connections: {},
				}),
				api.workflows.createWorkflow({
					name: `Workflow 4 ${uniqueId}`,
					nodes: [],
					connections: {},
				}),
			]);

			// Navigate to workflows list
			await n8n.goHome();

			// Test each workflow sequentially
			for (const workflow of workflows) {
				await n8n.workflows.cards.clickWorkflowCard(workflow.name);

				// Verify the correct workflow is opened
				await expect(n8n.page).toHaveURL(new RegExp(`/workflow/${workflow.id}(\\?.*)?$`));
				await expect(n8n.canvas.getWorkflowName()).toHaveAttribute('title', workflow.name);

				// Go back to list for next iteration
				await n8n.goHome();
			}
		});

		test('should open the correct workflow after search filter', async ({ n8n, api }) => {
			const uniqueId = nanoid(8);

			// Create multiple workflows with different names
			const targetWorkflow = await api.workflows.createWorkflow({
				name: `Target Workflow ${uniqueId}`,
				nodes: [],
				connections: {},
			});

			await api.workflows.createWorkflow({
				name: `Other Workflow ${uniqueId}`,
				nodes: [],
				connections: {},
			});

			await api.workflows.createWorkflow({
				name: `Another Workflow ${uniqueId}`,
				nodes: [],
				connections: {},
			});

			// Navigate to workflows list
			await n8n.goHome();

			// Search for the target workflow
			await n8n.workflows.search('Target');

			// Only the target workflow should be visible
			await expect(n8n.workflows.cards.getWorkflow(targetWorkflow.name)).toBeVisible();

			// Click on the target workflow
			await n8n.workflows.cards.clickWorkflowCard(targetWorkflow.name);

			// Verify the correct workflow is opened
			await expect(n8n.page).toHaveURL(new RegExp(`/workflow/${targetWorkflow.id}(\\?.*)?$`));
			await expect(n8n.canvas.getWorkflowName()).toHaveAttribute('title', targetWorkflow.name);
		});
	},
);
