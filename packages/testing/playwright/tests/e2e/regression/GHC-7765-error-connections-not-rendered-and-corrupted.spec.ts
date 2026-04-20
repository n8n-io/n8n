import { test, expect } from '../../../fixtures/base';

test.describe(
	'GHC-7765 SDK .onError() connections not rendered on canvas and corrupted by copy-paste',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		let workflowId: string;

		test.beforeEach(async ({ n8n }) => {
			const result = await n8n.start.fromImportedWorkflow('GHC-7765-error-connections.json');
			workflowId = result.workflowId;
		});

		test('should render error output connections on canvas', async ({ n8n }) => {
			// The workflow has an error connection from Code1 to Merge
			// This should be visible on the canvas but currently is not (BUG #1)

			// Verify nodes are loaded
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(4);

			// Verify main connections are rendered
			await expect(n8n.canvas.connectionBetweenNodes('Trigger', 'Code1')).toBeVisible();
			await expect(n8n.canvas.connectionBetweenNodes('Code1', 'Code2')).toBeVisible();
			await expect(n8n.canvas.connectionBetweenNodes('Code2', 'Merge')).toBeVisible();

			// BUG: This error connection should be visible but is not rendered
			// The workflow JSON has: Code1.error -> Merge
			await expect(n8n.canvas.connectionBetweenNodes('Code1', 'Merge')).toBeVisible();
		});

		test('should preserve error connections when copying and pasting nodes', async ({
			n8n,
			api,
		}) => {
			// Get initial workflow to verify the error connection structure
			const getResponse = await api.request.get(`/rest/workflows/${workflowId}`);
			const workflow = await getResponse.json();

			// Verify original workflow has error connection in correct format
			expect(workflow.connections.Code1).toHaveProperty('error');
			expect(workflow.connections.Code1.error).toEqual([
				[{ node: 'Merge', type: 'main', index: 1 }],
			]);

			// Grant clipboard permissions
			await n8n.clipboard.grant();

			// Select Code1 and Merge nodes
			await n8n.canvas.nodeByName('Code1').click();
			await n8n.page.keyboard.down('Shift');
			await n8n.canvas.nodeByName('Merge').click();
			await n8n.page.keyboard.up('Shift');

			// Copy the nodes
			await n8n.canvas.copyNodes();
			await n8n.notifications.waitForNotificationAndClose('Copied to clipboard');

			// Get clipboard content
			const clipboardText = await n8n.clipboard.readText();
			const copiedWorkflow = JSON.parse(clipboardText);

			// Verify copied workflow preserves error connection structure
			expect(copiedWorkflow.connections.Code1).toHaveProperty('error');
			expect(copiedWorkflow.connections.Code1.error).toEqual([
				[{ node: 'Merge', type: 'main', index: 1 }],
			]);

			// Paste the nodes
			await n8n.canvas.canvasPane().click();
			await n8n.clipboard.paste(clipboardText);

			// Wait for paste to complete
			await n8n.canvas.nodeByName('Code11').waitFor();

			// BUG #2: After paste, the error connection is corrupted
			// It gets flattened into the main connections array
			const updatedResponse = await api.request.get(`/rest/workflows/${workflowId}`);
			const updatedWorkflow = await updatedResponse.json();

			// The pasted Code11 node should have separate error connections
			// but instead they get merged into main
			// This is the bug: error connections should NOT be in main
			// They should be in a separate "error" key
			expect(updatedWorkflow.connections.Code11).toHaveProperty('error');

			// The error array should contain the connection to Merge1
			expect(updatedWorkflow.connections.Code11.error).toEqual([
				[{ node: 'Merge1', type: 'main', index: 1 }],
			]);

			// And main should only have the connection to Code2 (not Code21)
			expect(updatedWorkflow.connections.Code11.main).toHaveLength(1);
			expect(updatedWorkflow.connections.Code11.main[0]).toHaveLength(1);
		});

		test('should preserve onError setting on copied nodes', async ({ n8n, api }) => {
			// Grant clipboard permissions
			await n8n.clipboard.grant();

			// Select and copy Code1 which has onError: 'continueErrorOutput'
			await n8n.canvas.nodeByName('Code1').click();
			await n8n.canvas.copyNodes();
			await n8n.notifications.waitForNotificationAndClose('Copied to clipboard');

			// Get clipboard content
			const clipboardText = await n8n.clipboard.readText();
			const copiedWorkflow = JSON.parse(clipboardText);

			// Verify the onError setting is preserved in clipboard
			const copiedCode1 = copiedWorkflow.nodes.find(
				(n: { name: string }) => n.name === 'Code1',
			);
			expect(copiedCode1?.onError).toBe('continueErrorOutput');

			// Paste the node
			await n8n.canvas.canvasPane().click();
			await n8n.clipboard.paste(clipboardText);

			// Wait for paste
			await n8n.canvas.nodeByName('Code11').waitFor();

			// Verify onError setting is preserved in pasted node
			const updatedResponse = await api.request.get(`/rest/workflows/${workflowId}`);
			const updatedWorkflow = await updatedResponse.json();

			const pastedCode1 = updatedWorkflow.nodes.find(
				(n: { name: string }) => n.name === 'Code11',
			);
			expect(pastedCode1?.onError).toBe('continueErrorOutput');
		});
	},
);
