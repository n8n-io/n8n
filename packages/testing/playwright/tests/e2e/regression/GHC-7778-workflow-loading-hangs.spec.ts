import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * Regression test for GHC-7778: Starting a workflow takes forever
 * Issue: https://github.com/n8n-io/n8n/issues/28651
 *
 * User reports that creating a new workflow results in infinite loading state.
 * The loading indicator never disappears and the canvas never becomes interactive.
 */
test.describe(
	'GHC-7778 - Workflow loading hangs',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should load blank canvas without hanging', async ({ n8n }) => {
			// Attempt to create a new workflow from blank canvas
			// This should complete within a reasonable time (5 seconds)
			test.setTimeout(10000); // Set 10s timeout for this test

			// Navigate to new workflow
			await n8n.navigate.toWorkflow('new');

			// Verify loading completes and canvas becomes visible
			// If bug exists, these assertions will timeout
			await expect(n8n.canvas.canvasPane()).toBeVisible({ timeout: 5000 });
			await expect(n8n.canvas.getNodeViewLoader()).toBeHidden({ timeout: 5000 });
			await expect(n8n.canvas.getLoadingMask()).toBeHidden({ timeout: 5000 });
			await expect(n8n.canvas.getChoicePrompt()).toBeVisible({ timeout: 5000 });
		});

		test('should load existing workflow without hanging', async ({ n8n, api }) => {
			test.setTimeout(10000); // Set 10s timeout for this test

			// Create a workflow via API
			const workflowName = `Test Workflow ${nanoid()}`;
			const workflow = await api.workflows.createWorkflow({
				name: workflowName,
				nodes: [],
				connections: {},
			});

			// Navigate to the workflow
			await n8n.page.goto(`workflow/${workflow.id}`);

			// Verify loading completes and canvas becomes visible
			// If bug exists, these assertions will timeout
			await expect(n8n.canvas.canvasPane()).toBeVisible({ timeout: 5000 });
			await expect(n8n.canvas.getNodeViewLoader()).toBeHidden({ timeout: 5000 });
			await expect(n8n.canvas.getLoadingMask()).toBeHidden({ timeout: 5000 });
		});

		test('should create workflow from project without hanging', async ({ n8n, api }) => {
			test.setTimeout(10000); // Set 10s timeout for this test

			// Enable project features
			await api.enableProjectFeatures();

			// Create a project
			const project = await api.projects.createProject();

			// Navigate to create new workflow in project
			await n8n.page.goto(`workflow/new?projectId=${project.id}`);

			// Verify loading completes and canvas becomes visible
			// If bug exists, these assertions will timeout
			await expect(n8n.canvas.canvasPane()).toBeVisible({ timeout: 5000 });
			await expect(n8n.canvas.getNodeViewLoader()).toBeHidden({ timeout: 5000 });
			await expect(n8n.canvas.getLoadingMask()).toBeHidden({ timeout: 5000 });
			await expect(n8n.canvas.getChoicePrompt()).toBeVisible({ timeout: 5000 });
		});
	},
);
