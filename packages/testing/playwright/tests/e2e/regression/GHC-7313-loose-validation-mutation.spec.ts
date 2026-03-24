/**
 * Regression test for GHC-7313
 *
 * Bug: Opening and closing an IF or Switch node (Rules mode) silently changes
 * typeValidation from "loose" to "strict", causing workflows to break.
 *
 * Expected: Opening and closing a node without changes should not modify workflow.
 * Actual: The editor mutates node options, changing typeValidation to "strict".
 */

import { test, expect } from '../../../fixtures/base';

test.describe(
	'GHC-7313 - IF/Switch nodes silently mutate typeValidation',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('should not mutate IF node options when opening and closing without changes', async ({
			n8n,
			api,
		}) => {
			// Import workflow with IF node that has typeValidation: "loose"
			await n8n.start.fromImportedWorkflow('GHC-7313_If_loose_validation.json');

			// Get initial workflow state via API
			const workflows = await api.workflows.getWorkflows();
			const workflowId = workflows[0].id;
			const workflowResponse = await api.request.get(`/rest/workflows/${workflowId}`);
			const initialWorkflow = await workflowResponse.json();
			const initialNode = initialWorkflow.data.nodes.find((node: any) => node.name === 'If');

			// Verify initial state has loose validation
			expect(initialNode.parameters.conditions.options.typeValidation).toBe('loose');
			expect(initialNode.parameters.conditions.options).not.toHaveProperty('leftValue');

			// Open the IF node
			await n8n.canvas.openNode('If');

			// Verify the node details view is open
			await expect(n8n.ndv.getContainer()).toBeVisible();

			// Close the node WITHOUT making any changes
			await n8n.ndv.close();

			// Verify no unsaved changes indicator appears
			// (attempting to navigate away should not show save dialog)
			await n8n.sideBar.clickHomeButton();

			// If the bug exists, the SaveChangesModal will appear
			// because the editor silently mutated the node options
			await expect(n8n.canvas.saveChangesModal.getModal()).not.toBeVisible();
		});

		test('should not mutate Switch node options when opening and closing without changes', async ({
			n8n,
			api,
		}) => {
			// Import workflow with Switch node that has typeValidation: "loose"
			await n8n.start.fromImportedWorkflow('GHC-7313_Switch_loose_validation.json');

			// Get initial workflow state via API
			const workflows = await api.workflows.getWorkflows();
			const workflowId = workflows[0].id;
			const workflowResponse = await api.request.get(`/rest/workflows/${workflowId}`);
			const initialWorkflow = await workflowResponse.json();
			const initialNode = initialWorkflow.data.nodes.find((node: any) => node.name === 'Switch');

			// Verify initial state has loose validation
			expect(initialNode.parameters.rules.options.typeValidation).toBe('loose');
			expect(initialNode.parameters.rules.options).not.toHaveProperty('leftValue');

			// Open the Switch node
			await n8n.canvas.openNode('Switch');

			// Verify the node details view is open
			await expect(n8n.ndv.getContainer()).toBeVisible();

			// Close the node WITHOUT making any changes
			await n8n.ndv.close();

			// Verify no unsaved changes indicator appears
			await n8n.sideBar.clickHomeButton();

			// If the bug exists, the SaveChangesModal will appear
			await expect(n8n.canvas.saveChangesModal.getModal()).not.toBeVisible();
		});

		test('should preserve loose validation after opening and closing IF node', async ({
			n8n,
			api,
		}) => {
			// Import workflow with IF node that has typeValidation: "loose"
			await n8n.start.fromImportedWorkflow('GHC-7313_If_loose_validation.json');

			// Get initial workflow state via API
			const workflows = await api.workflows.getWorkflows();
			const workflowId = workflows[0].id;

			// Open and close the IF node
			await n8n.canvas.openNode('If');
			await expect(n8n.ndv.getContainer()).toBeVisible();
			await n8n.ndv.close();

			// Wait for any auto-save to complete
			await n8n.canvas.waitForSaveWorkflowCompleted();

			// Get workflow state after opening/closing node
			const updatedResponse = await api.request.get(`/rest/workflows/${workflowId}`);
			const updatedWorkflow = await updatedResponse.json();
			const updatedNode = updatedWorkflow.data.nodes.find((node: any) => node.name === 'If');

			// Verify typeValidation is still "loose" (not mutated to "strict")
			expect(updatedNode.parameters.conditions.options.typeValidation).toBe('loose');

			// Verify no stray "leftValue" was added
			expect(updatedNode.parameters.conditions.options).not.toHaveProperty('leftValue');
		});

		test('should preserve loose validation after opening and closing Switch node', async ({
			n8n,
			api,
		}) => {
			// Import workflow with Switch node that has typeValidation: "loose"
			await n8n.start.fromImportedWorkflow('GHC-7313_Switch_loose_validation.json');

			// Get initial workflow state via API
			const workflows = await api.workflows.getWorkflows();
			const workflowId = workflows[0].id;

			// Open and close the Switch node
			await n8n.canvas.openNode('Switch');
			await expect(n8n.ndv.getContainer()).toBeVisible();
			await n8n.ndv.close();

			// Wait for any auto-save to complete
			await n8n.canvas.waitForSaveWorkflowCompleted();

			// Get workflow state after opening/closing node
			const updatedResponse = await api.request.get(`/rest/workflows/${workflowId}`);
			const updatedWorkflow = await updatedResponse.json();
			const updatedNode = updatedWorkflow.data.nodes.find(
				(node: any) => node.name === 'Switch',
			);

			// Verify typeValidation is still "loose" (not mutated to "strict")
			expect(updatedNode.parameters.rules.options.typeValidation).toBe('loose');

			// Verify no stray "leftValue" was added
			expect(updatedNode.parameters.rules.options).not.toHaveProperty('leftValue');
		});
	},
);
