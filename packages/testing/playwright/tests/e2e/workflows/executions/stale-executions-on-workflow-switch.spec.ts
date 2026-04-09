import { nanoid } from 'nanoid';

import { test, expect } from '../../../../fixtures/base';

/**
 * Regression test for GHC-7610:
 * When switching between workflows, the execution panel shows stale state
 * from the previously opened workflow instead of updating to show executions
 * from the currently active workflow.
 *
 * Expected behavior: Each workflow should display only its own executions
 * Actual behavior: After switching workflows, the previous workflow's executions remain visible
 *
 * Issue: https://github.com/n8n-io/n8n/issues/28061
 *
 * NOTE: Tests currently pass, suggesting either:
 * 1. The bug has been fixed in the current version
 * 2. The bug requires specific conditions not yet captured in these tests
 * 3. The bug manifests through different navigation patterns (e.g., using workflow dropdown/command bar)
 */
test.describe(
	'Stale Executions on Workflow Switch',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should update executions when switching between workflows', async ({ n8n, api }) => {
			const uniqueId = nanoid(8);
			const workflowAName = `Workflow A ${uniqueId}`;
			const workflowBName = `Workflow B ${uniqueId}`;

			// Create Workflow A with Manual Trigger
			const workflowA = await api.workflows.createWorkflow({
				name: workflowAName,
				nodes: [
					{
						id: 'manual-trigger-a',
						name: 'Manual',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [250, 300],
						parameters: {},
					},
				],
				connections: {},
			});

			// Create Workflow B with Manual Trigger
			const workflowB = await api.workflows.createWorkflow({
				name: workflowBName,
				nodes: [
					{
						id: 'manual-trigger-b',
						name: 'Manual',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [250, 300],
						parameters: {},
					},
				],
				connections: {},
			});

			// Execute Workflow A to create 2 executions
			await api.workflows.runManually(workflowA.id, 'Manual');
			await api.workflows.runManually(workflowA.id, 'Manual');

			// Execute Workflow B to create 3 executions
			await api.workflows.runManually(workflowB.id, 'Manual');
			await api.workflows.runManually(workflowB.id, 'Manual');
			await api.workflows.runManually(workflowB.id, 'Manual');

			// Open Workflow A and navigate to executions tab
			await n8n.page.goto(`/workflow/${workflowA.id}`);
			await n8n.canvas.clickExecutionsTab();

			// Should show 2 executions for Workflow A
			await expect(n8n.executions.getExecutionItems()).toHaveCount(2, { timeout: 10000 });

			// Switch to Workflow B
			await n8n.page.goto(`/workflow/${workflowB.id}`);
			await n8n.canvas.clickExecutionsTab();

			// BUG: This should show 3 executions, but if the bug exists, it will still show 2 (stale data from Workflow A)
			await expect(n8n.executions.getExecutionItems()).toHaveCount(3, { timeout: 10000 });

			// Switch back to Workflow A
			await n8n.page.goto(`/workflow/${workflowA.id}`);
			await n8n.canvas.clickExecutionsTab();

			// Should show 2 executions again (not 3 from Workflow B)
			await expect(n8n.executions.getExecutionItems()).toHaveCount(2, { timeout: 10000 });
		});

		test('should show correct executions when navigating via workflow cards', async ({
			n8n,
			api,
		}) => {
			const uniqueId = nanoid(8);
			const workflowXName = `Workflow X ${uniqueId}`;
			const workflowYName = `Workflow Y ${uniqueId}`;

			// Create two simple workflows
			const workflowX = await api.workflows.createWorkflow({
				name: workflowXName,
				nodes: [
					{
						id: 'manual-x',
						name: 'Manual',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [250, 300],
						parameters: {},
					},
				],
				connections: {},
			});

			const workflowY = await api.workflows.createWorkflow({
				name: workflowYName,
				nodes: [
					{
						id: 'manual-y',
						name: 'Manual',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [250, 300],
						parameters: {},
					},
				],
				connections: {},
			});

			// Create different numbers of executions to make the bug more obvious
			await api.workflows.runManually(workflowX.id, 'Manual');

			await api.workflows.runManually(workflowY.id, 'Manual');
			await api.workflows.runManually(workflowY.id, 'Manual');
			await api.workflows.runManually(workflowY.id, 'Manual');
			await api.workflows.runManually(workflowY.id, 'Manual');

			// Start from home/workflows list
			await n8n.goHome();

			// Click on Workflow X card to open it
			await n8n.workflows.cards.getWorkflow(workflowXName).click();
			await n8n.canvas.clickExecutionsTab();

			// Should show 1 execution for Workflow X
			await expect(n8n.executions.getExecutionItems()).toHaveCount(1, { timeout: 10000 });

			// Go back home and open Workflow Y
			await n8n.goHome();
			await n8n.workflows.cards.getWorkflow(workflowYName).click();
			await n8n.canvas.clickExecutionsTab();

			// BUG: Should show 4 executions for Workflow Y (not 1 from the previous workflow)
			await expect(n8n.executions.getExecutionItems()).toHaveCount(4, { timeout: 10000 });
		});
	},
);
