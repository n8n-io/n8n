import { test, expect } from '../../../../../fixtures/base';
import { nanoid } from 'nanoid';

/**
 * Regression test for GHC-7788
 * Bug: Convert to sub-workflow creates workflow at root instead of parent folder
 * and loses node connections
 */
test.describe(
	'Subworkflow Extraction - Folder Placement (GHC-7788)',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should create sub-workflow in same folder as parent workflow', async ({ n8n, api }) => {
			// GHC-7788: Sub-workflow should be created in the same folder as parent workflow

			// Create a project and folder
			const projectId = await n8n.start.fromNewProject();
			const folder = await api.projects.createFolder(projectId, `Test Folder ${nanoid()}`);

			// Create a workflow with nodes in the folder via API
			const workflow = await api.workflows.createWorkflow({
				name: `Parent Workflow ${nanoid()}`,
				projectId,
				parentFolderId: folder.id,
				nodes: [
					{
						id: '1',
						name: 'Edit Fields',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [250, 300],
						parameters: {},
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [450, 300],
						parameters: {},
					},
					{
						id: '3',
						name: 'Edit Fields1',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [650, 300],
						parameters: {},
					},
				],
				connections: {
					'Edit Fields': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
					'HTTP Request': {
						main: [[{ node: 'Edit Fields1', type: 'main', index: 0 }]],
					},
				},
			});

			// Navigate to the workflow
			await n8n.navigate.toWorkflow(workflow.id);

			// Select the nodes (all 3)
			await n8n.canvas.nodeByName('Edit Fields').click();
			await n8n.canvas.extendSelectionWithArrows('right');
			await n8n.canvas.extendSelectionWithArrows('right');

			// Convert to sub-workflow
			await n8n.canvas.openCanvasContextMenu();
			await n8n.canvas.clickContextMenuAction('Convert 3 nodes to sub-workflow');
			await n8n.canvas.convertToSubworkflowModal.waitForModal();
			await n8n.canvas.convertToSubworkflowModal.clickSubmitButton();
			await n8n.canvas.convertToSubworkflowModal.waitForClose();

			// Wait for the Execute Workflow node to be created
			const executeWorkflowNode = n8n.canvas.getCanvasNodes().filter({
				hasText: 'Call My Sub-workflow',
			});
			await expect(executeWorkflowNode).toHaveCount(1);

			// Get all workflows in the project
			const workflows = await api.workflows.getWorkflows();

			// Find the newly created sub-workflow (not the parent)
			const subworkflow = workflows.find(
				(w: { name: string; id: string }) =>
					w.name === 'My Sub-workflow' && w.id !== workflow.id,
			);

			expect(subworkflow).toBeDefined();

			// Get full workflow details to check parentFolderId
			const subworkflowDetails = await api.workflows.getWorkflow(subworkflow.id);

			// ASSERTION 1: Sub-workflow should be in the same folder as parent
			expect(subworkflowDetails.parentFolderId).toBe(folder.id);
		});

		test('should preserve connections inside the generated sub-workflow', async ({ n8n, api }) => {
			// GHC-7788: Connections between nodes should be preserved in the sub-workflow

			// Create a project
			const projectId = await n8n.start.fromNewProject();
			const folder = await api.projects.createFolder(projectId, `Test Folder ${nanoid()}`);

			// Create a workflow with nodes in the folder via API
			const workflow = await api.workflows.createWorkflow({
				name: `Parent Workflow ${nanoid()}`,
				projectId,
				parentFolderId: folder.id,
				nodes: [
					{
						id: '0',
						name: "When clicking 'Execute workflow'",
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [50, 300],
						parameters: {},
					},
					{
						id: '1',
						name: 'Edit Fields',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [250, 300],
						parameters: {},
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [450, 300],
						parameters: {},
					},
					{
						id: '3',
						name: 'Edit Fields1',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [650, 300],
						parameters: {},
					},
				],
				connections: {
					"When clicking 'Execute workflow'": {
						main: [[{ node: 'Edit Fields', type: 'main', index: 0 }]],
					},
					'Edit Fields': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
					'HTTP Request': {
						main: [[{ node: 'Edit Fields1', type: 'main', index: 0 }]],
					},
				},
			});

			// Navigate to the workflow
			await n8n.navigate.toWorkflow(workflow.id);

			// Select only the last 3 nodes (Edit Fields → HTTP Request → Edit Fields1)
			await n8n.canvas.nodeByName('Edit Fields').click();
			await n8n.canvas.extendSelectionWithArrows('right');
			await n8n.canvas.extendSelectionWithArrows('right');

			// Convert to sub-workflow
			await n8n.canvas.openCanvasContextMenu();
			await n8n.canvas.clickContextMenuAction('Convert 3 nodes to sub-workflow');
			await n8n.canvas.convertToSubworkflowModal.waitForModal();
			await n8n.canvas.convertToSubworkflowModal.clickSubmitButton();
			await n8n.canvas.convertToSubworkflowModal.waitForClose();

			// Wait for the Execute Workflow node to be created
			const executeWorkflowNode = n8n.canvas.getCanvasNodes().filter({
				hasText: 'Call My Sub-workflow',
			});
			await expect(executeWorkflowNode).toHaveCount(1);

			// Get all workflows
			const workflows = await api.workflows.getWorkflows();

			// Find the sub-workflow
			const subworkflow = workflows.find(
				(w: { name: string; id: string }) =>
					w.name === 'My Sub-workflow' && w.id !== workflow.id,
			);

			expect(subworkflow).toBeDefined();

			// Get full workflow details to check connections
			const subworkflowDetails = await api.workflows.getWorkflow(subworkflow.id);

			// ASSERTION 2: Sub-workflow should have connections between the extracted nodes
			// Expected connections:
			// - Start → Edit Fields (added by extraction)
			// - Edit Fields → HTTP Request (preserved from original)
			// - HTTP Request → Edit Fields1 (preserved from original)

			expect(subworkflowDetails.connections).toBeDefined();
			expect(Object.keys(subworkflowDetails.connections).length).toBeGreaterThan(0);

			// Check that Edit Fields has a connection to HTTP Request
			const editFieldsConnections = subworkflowDetails.connections['Edit Fields'];
			expect(editFieldsConnections).toBeDefined();
			expect(editFieldsConnections.main).toBeDefined();
			expect(editFieldsConnections.main[0]).toBeDefined();
			expect(editFieldsConnections.main[0][0].node).toBe('HTTP Request');

			// Check that HTTP Request has a connection to Edit Fields1
			const httpRequestConnections = subworkflowDetails.connections['HTTP Request'];
			expect(httpRequestConnections).toBeDefined();
			expect(httpRequestConnections.main).toBeDefined();
			expect(httpRequestConnections.main[0]).toBeDefined();
			expect(httpRequestConnections.main[0][0].node).toBe('Edit Fields1');
		});
	},
);
