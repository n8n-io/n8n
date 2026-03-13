import { nanoid } from 'nanoid';

import { MANUAL_TRIGGER_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

const EXECUTE_WORKFLOW_NODE_NAME = 'Execute Sub-workflow';

test.use({ capability: { env: { TEST_ISOLATION: 'subworkflow-project-isolation' } } });

test.describe(
	'Sub-workflow Project Isolation',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.goHome();
			// Enable features required for project workflows
			await n8n.api.enableFeature('sharing');
			await n8n.api.enableFeature('folders');
			await n8n.api.enableFeature('advancedPermissions');
			await n8n.api.enableFeature('projectRole:admin');
			await n8n.api.enableFeature('projectRole:editor');
			await n8n.api.setMaxTeamProjectsQuota(-1);
		});

		test('should not show sub-workflow from another project when callerPolicy is workflowsFromSameOwner', async ({
			n8n,
		}) => {
			// Create Project A
			const projectA = await n8n.api.projects.createProject(`Project A ${nanoid(8)}`);

			// Create a sub-workflow in Project A with Execute Workflow Trigger
			// and set callerPolicy to 'workflowsFromSameOwner'
			const subWorkflowData = {
				name: `Sub-workflow in Project A ${nanoid(8)}`,
				nodes: [
					{
						id: 'execute-workflow-trigger',
						name: 'When Executed by Another Workflow',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						position: [0, 0] as [number, number],
						parameters: {},
						typeVersion: 1,
					},
				],
				connections: {},
				settings: {
					callerPolicy: 'workflowsFromSameOwner',
				},
				active: false,
				// @ts-expect-error - projectId is not part of IWorkflowBase but is accepted by the API
				projectId: projectA.id,
			};

			const subWorkflow = await n8n.api.workflows.createWorkflow(subWorkflowData);
			// Activate the workflow so it appears in the workflow selector
			await n8n.api.workflows.activate(subWorkflow.id, subWorkflow.versionId);

			// Create Project B
			const projectB = await n8n.api.projects.createProject(`Project B ${nanoid(8)}`);

			// Create a workflow in Project B with Execute Workflow node
			const mainWorkflowData = {
				name: `Main workflow in Project B ${nanoid(8)}`,
				nodes: [
					{
						id: 'manual-trigger',
						name: MANUAL_TRIGGER_NODE_NAME,
						type: 'n8n-nodes-base.manualTrigger',
						position: [0, 0] as [number, number],
						parameters: {},
						typeVersion: 1,
					},
				],
				connections: {},
				settings: {},
				active: false,
				// @ts-expect-error - projectId is not part of IWorkflowBase but is accepted by the API
				projectId: projectB.id,
			};

			const mainWorkflow = await n8n.api.workflows.createWorkflow(mainWorkflowData);

			// Navigate to the main workflow in Project B
			await n8n.page.goto(`/workflow/${mainWorkflow.id}`);

			// Wait for canvas to load
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);

			// Add Execute Workflow node
			await n8n.canvas.addNode(EXECUTE_WORKFLOW_NODE_NAME, { action: 'Execute A Sub Workflow' });

			// Open the workflow selector
			await n8n.ndv.openResourceLocator('workflowId');

			// The sub-workflow from Project A should NOT be visible in the list
			// because it has callerPolicy 'workflowsFromSameOwner' and belongs to a different project
			const items = n8n.ndv.getResourceLocatorItems();
			await expect(items.filter({ hasText: subWorkflow.name })).toHaveCount(0);
		});

		test('should show error when executing a workflow with cross-project sub-workflow restriction', async ({
			n8n,
		}) => {
			// Create Project A
			const projectA = await n8n.api.projects.createProject(`Project A ${nanoid(8)}`);

			// Create a sub-workflow in Project A with Execute Workflow Trigger
			const subWorkflowData = {
				name: `Restricted Sub-workflow ${nanoid(8)}`,
				nodes: [
					{
						id: 'execute-workflow-trigger',
						name: 'When Executed by Another Workflow',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						position: [0, 0] as [number, number],
						parameters: {},
						typeVersion: 1,
					},
				],
				connections: {},
				settings: {
					callerPolicy: 'workflowsFromSameOwner',
				},
				active: false,
				// @ts-expect-error - projectId is not part of IWorkflowBase but is accepted by the API
				projectId: projectA.id,
			};

			const subWorkflow = await n8n.api.workflows.createWorkflow(subWorkflowData);
			await n8n.api.workflows.activate(subWorkflow.id, subWorkflow.versionId);

			// Create Project B
			const projectB = await n8n.api.projects.createProject(`Project B ${nanoid(8)}`);

			// Create a workflow in Project B that references the sub-workflow
			const mainWorkflowData = {
				name: `Main workflow ${nanoid(8)}`,
				nodes: [
					{
						id: 'manual-trigger',
						name: MANUAL_TRIGGER_NODE_NAME,
						type: 'n8n-nodes-base.manualTrigger',
						position: [0, 0] as [number, number],
						parameters: {},
						typeVersion: 1,
					},
					{
						id: 'execute-workflow',
						name: 'Execute Sub-workflow',
						type: 'n8n-nodes-base.executeWorkflow',
						position: [200, 0] as [number, number],
						parameters: {
							// Reference the sub-workflow by ID
							workflowId: {
								__rl: true,
								mode: 'id',
								value: subWorkflow.id,
							},
						},
						typeVersion: 1.2,
					},
				],
				connections: {
					[MANUAL_TRIGGER_NODE_NAME]: {
						main: [[{ node: 'Execute Sub-workflow', type: 'main', index: 0 }]],
					},
				},
				settings: {},
				active: false,
				// @ts-expect-error - projectId is not part of IWorkflowBase but is accepted by the API
				projectId: projectB.id,
			};

			const mainWorkflow = await n8n.api.workflows.createWorkflow(mainWorkflowData);

			// Navigate to the main workflow
			await n8n.page.goto(`/workflow/${mainWorkflow.id}`);

			// Wait for canvas to load
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);

			// Try to execute the workflow - should fail with an error about caller policy
			await n8n.canvas.clickExecuteWorkflowButton();

			// Wait for the execution to complete and check for error
			// The error should indicate that the sub-workflow cannot be executed due to caller policy restrictions
			await expect(
				n8n.notifications.getNotificationByTitle(/error|failed|denied|policy/i),
			).toBeVisible({ timeout: 10000 });
		});
	},
);
