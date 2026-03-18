import { test, expect } from '../../../fixtures/base';
import { nanoid } from 'nanoid';

test.use({ capability: { env: { TEST_ISOLATION: 'n8n-9813-setup-panel' } } });

test.describe(
	'Bug N8N-9813: Setup panel message disappears when trigger position changes',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('should show setup panel message consistently regardless of chat trigger position', async ({
			n8n,
			api,
		}) => {
			const workflowName = `Test Workflow ${nanoid()}`;

			// Create workflow with chat trigger LEFT of manual trigger (smaller X coordinate)
			// Chat trigger at x=100, Manual trigger at x=300
			const workflow = await api.workflows.createWorkflow({
				name: workflowName,
				nodes: [
					{
						id: nanoid(),
						name: 'Chat Trigger',
						type: '@n8n/n8n-nodes-langchain.chatTrigger',
						typeVersion: 1.1,
						position: [100, 250] as [number, number],
						parameters: {},
					},
					{
						id: nanoid(),
						name: 'When clicking Test workflow',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [300, 250] as [number, number],
						parameters: {},
					},
				],
				connections: {},
				settings: {},
				active: false,
			});

			// Navigate to the workflow
			await n8n.navigate.toWorkflow(workflow.id);

			// Wait for canvas to load
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);

			// Verify setup panel message is visible when chat trigger is LEFT (first in execution order)
			const setupMessage = n8n.page.getByTestId('trigger-listening-callout');
			await expect(setupMessage).toBeVisible();

			// Now update the workflow to swap positions
			// Chat trigger at x=500 (RIGHT), Manual trigger at x=100 (LEFT)
			await api.workflows.update(workflow.id, workflow.versionId, {
				nodes: [
					{
						id: nanoid(),
						name: 'Chat Trigger',
						type: '@n8n/n8n-nodes-langchain.chatTrigger',
						typeVersion: 1.1,
						position: [500, 250] as [number, number],
						parameters: {},
					},
					{
						id: nanoid(),
						name: 'When clicking Test workflow',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [100, 250] as [number, number],
						parameters: {},
					},
				],
			});

			// Reload the page to pick up the position change
			await n8n.page.reload();
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);

			// BUG: Setup message should still be visible for chat trigger
			// but it disappears when chat trigger is positioned RIGHT of manual trigger
			// because the "first trigger" is now determined by X position (leftmost)
			await expect(setupMessage).toBeVisible();
		});

		test('should show setup message for chat trigger even when positioned right of manual trigger', async ({
			n8n,
			api,
		}) => {
			const workflowName = `Test Workflow ${nanoid()}`;

			// Create workflow with chat trigger RIGHT of manual trigger from the start
			// Manual trigger at x=100 (LEFT), Chat trigger at x=400 (RIGHT)
			const workflow = await api.workflows.createWorkflow({
				name: workflowName,
				nodes: [
					{
						id: nanoid(),
						name: 'When clicking Test workflow',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [100, 250] as [number, number],
						parameters: {},
					},
					{
						id: nanoid(),
						name: 'Chat Trigger',
						type: '@n8n/n8n-nodes-langchain.chatTrigger',
						typeVersion: 1.1,
						position: [400, 250] as [number, number],
						parameters: {},
					},
				],
				connections: {},
				settings: {},
				active: false,
			});

			// Navigate to the workflow
			await n8n.navigate.toWorkflow(workflow.id);

			// Wait for canvas to load
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);

			// BUG: Setup message should be visible for chat trigger
			// but it's not visible when chat trigger is positioned RIGHT of manual trigger
			const setupMessage = n8n.page.getByTestId('trigger-listening-callout');
			await expect(setupMessage).toBeVisible();
		});
	},
);
