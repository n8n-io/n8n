// Test for N8N-9779: Command bar doesn't see workflows
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'Command Bar - Workflow Search @mode:sqlite',
	{
		annotation: [{ type: 'issue', description: 'https://linear.app/n8n/issue/N8N-9779' }],
	},
	() => {
		test('should display workflows when searching by name', async ({ n8n, api }) => {
			// Setup: Create a workflow via API
			const workflowName = `Test Workflow ${nanoid()}`;
			await api.workflows.createWorkflow({
				name: workflowName,
				nodes: [
					{
						id: 'manual-trigger',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [250, 300],
						parameters: {},
					},
				],
				connections: {},
				settings: {},
			});

			// Navigate to the workflows list page
			await n8n.start.fromHome();

			// Open command bar with Cmd+K / Ctrl+K
			await n8n.page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');

			// Wait for command bar to appear
			const commandBar = n8n.page.getByTestId('command-bar');
			await expect(commandBar).toBeVisible();

			// Type the workflow name in the command bar search (>2 chars to trigger search)
			await n8n.page.keyboard.type(workflowName.substring(0, 4));

			// Wait for the command bar items list to be visible
			const itemsList = n8n.page.getByTestId('command-bar-items-list');
			await expect(itemsList).toBeVisible();

			// Verify the workflow appears in the command bar results
			// The workflow should be shown as a command bar item
			const workflowItem = commandBar.getByText(workflowName);
			await expect(workflowItem).toBeVisible({
				timeout: 5000,
			});
		});

		test('should display workflows when navigating to "Open Workflow" submenu', async ({
			n8n,
			api,
		}) => {
			// Setup: Create a workflow via API
			const workflowName = `My Workflow ${nanoid()}`;
			await api.workflows.createWorkflow({
				name: workflowName,
				nodes: [
					{
						id: 'manual-trigger',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [250, 300],
						parameters: {},
					},
				],
				connections: {},
				settings: {},
			});

			// Navigate to the workflows list page
			await n8n.start.fromHome();

			// Open command bar
			await n8n.page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');

			// Wait for command bar to appear
			const commandBar = n8n.page.getByTestId('command-bar');
			await expect(commandBar).toBeVisible();

			// Find and click the "Open Workflow" command to navigate into the submenu
			const openWorkflowCommand = commandBar.getByText('Open Workflow');
			await expect(openWorkflowCommand).toBeVisible();
			await openWorkflowCommand.click();

			// Wait for the workflow list to load in the submenu
			const itemsList = n8n.page.getByTestId('command-bar-items-list');
			await expect(itemsList).toBeVisible();

			// Verify the workflow appears in the submenu
			const workflowItem = commandBar.getByText(workflowName);
			await expect(workflowItem).toBeVisible({
				timeout: 5000,
			});
		});

		test('should display multiple workflows in command bar', async ({ n8n, api }) => {
			// Setup: Create multiple workflows via API
			const workflow1Name = `Alpha Workflow ${nanoid()}`;
			const workflow2Name = `Beta Workflow ${nanoid()}`;
			const workflow3Name = `Gamma Workflow ${nanoid()}`;

			await Promise.all([
				api.workflows.createWorkflow({
					name: workflow1Name,
					nodes: [
						{
							id: 'manual-trigger',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [250, 300],
							parameters: {},
						},
					],
					connections: {},
					settings: {},
				}),
				api.workflows.createWorkflow({
					name: workflow2Name,
					nodes: [
						{
							id: 'manual-trigger',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [250, 300],
							parameters: {},
						},
					],
					connections: {},
					settings: {},
				}),
				api.workflows.createWorkflow({
					name: workflow3Name,
					nodes: [
						{
							id: 'manual-trigger',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [250, 300],
							parameters: {},
						},
					],
					connections: {},
					settings: {},
				}),
			]);

			// Navigate to the workflows list page
			await n8n.start.fromHome();

			// Open command bar
			await n8n.page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');

			// Wait for command bar to appear
			const commandBar = n8n.page.getByTestId('command-bar');
			await expect(commandBar).toBeVisible();

			// Search with a query that should match workflow names
			await n8n.page.keyboard.type('workflow');

			// Wait for search to complete
			const itemsList = n8n.page.getByTestId('command-bar-items-list');
			await expect(itemsList).toBeVisible();

			// Verify all workflows appear in the results
			await expect(commandBar.getByText(workflow1Name)).toBeVisible({ timeout: 5000 });
			await expect(commandBar.getByText(workflow2Name)).toBeVisible({ timeout: 5000 });
			await expect(commandBar.getByText(workflow3Name)).toBeVisible({ timeout: 5000 });
		});
	},
);
