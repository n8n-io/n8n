import { test, expect } from '../../../fixtures/base';

/**
 * E2E tests for sub-workflow version resolution (ADO-4535)
 *
 * This test suite validates that:
 * 1. Manual/test executions use DRAFT versions of sub-workflows
 * 2. Production executions (webhooks/triggers) use PUBLISHED versions of sub-workflows
 * 3. Publishing a parent workflow validates that all referenced sub-workflows are published
 * 4. Self-referencing workflows can be published
 */
test.describe('Sub-workflow Version Resolution', () => {
	test('manual execution should use draft version of sub-workflow', async ({ api }) => {
		// Create a simple sub-workflow that returns a value
		const subWorkflowResult = await api.workflows.createWorkflowFromDefinition({
			name: 'Sub-workflow',
			nodes: [
				{
					parameters: {},
					id: 'execute-workflow-trigger',
					name: 'Execute Workflow Trigger',
					type: 'n8n-nodes-base.executeWorkflowTrigger',
					typeVersion: 1,
					position: [300, 300],
				},
				{
					parameters: {
						assignments: {
							assignments: [
								{
									id: 'value-field',
									name: 'value',
									value: 'published-version',
									type: 'string',
								},
							],
						},
					},
					id: 'sub-set-node',
					name: 'Set Value',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.3,
					position: [500, 300],
				},
			],
			connections: {
				'Execute Workflow Trigger': {
					main: [
						[
							{
								node: 'Set Value',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			},
		});

		const subWorkflowId = subWorkflowResult.workflowId;
		const subWorkflow = subWorkflowResult.createdWorkflow;

		// Publish the sub-workflow
		await api.workflows.activate(subWorkflowId, subWorkflow.versionId!);

		// Now modify the sub-workflow (create a draft change)
		const updateResponse = await api.request.patch(`/rest/workflows/${subWorkflowId}`, {
			data: {
				versionId: subWorkflow.versionId,
				name: subWorkflow.name,
				nodes: [
					{
						parameters: {},
						id: 'execute-workflow-trigger',
						name: 'Execute Workflow Trigger',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						typeVersion: 1,
						position: [300, 300],
					},
					{
						parameters: {
							assignments: {
								assignments: [
									{
										id: 'value-field',
										name: 'value',
										value: 'draft-version', // Changed value
										type: 'string',
									},
								],
							},
						},
						id: 'sub-set-node',
						name: 'Set Value',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.3,
						position: [500, 300],
					},
				],
				connections: {
					'Execute Workflow Trigger': {
						main: [
							[
								{
									node: 'Set Value',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		});

		expect(updateResponse.ok()).toBe(true);

		// Create a parent workflow that calls the sub-workflow
		const parentWorkflowResult = await api.workflows.createWorkflowFromDefinition({
			name: 'Parent Workflow',
			nodes: [
				{
					parameters: {},
					id: 'manual-trigger',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [300, 300],
				},
				{
					parameters: {
						source: 'database',
						workflowId: {
							__rl: true,
							value: subWorkflowId,
							mode: 'id',
						},
					},
					id: 'execute-workflow',
					name: 'Execute Workflow',
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1.1,
					position: [500, 300],
				},
			],
			connections: {
				'Manual Trigger': {
					main: [
						[
							{
								node: 'Execute Workflow',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			},
		});

		const parentWorkflowId = parentWorkflowResult.workflowId;
		const parentWorkflow = parentWorkflowResult.createdWorkflow;

		// Execute the parent workflow manually
		const manualExecResponse = await api.request.post(`/rest/workflows/${parentWorkflowId}/run`, {
			data: {
				workflowData: parentWorkflow,
				triggerToStartFrom: {
					name: 'Manual Trigger',
				},
			},
		});

		expect(manualExecResponse.ok()).toBe(true);
		const manualExecution = await manualExecResponse.json();

		// Wait for execution to complete
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Get execution details
		const executionDetails = await api.workflows.getExecution(manualExecution.data.executionId);
		const executionData =
			typeof executionDetails.data === 'string'
				? JSON.parse(executionDetails.data)
				: executionDetails.data;

		// The execution data is in a flattened format with references
		// executionData[0] is the root, with resultData pointing to index 2
		const root = executionData[0];
		const resultDataIndex = parseInt(root.resultData, 10);
		const resultData = executionData[resultDataIndex];

		// resultData.runData points to the actual node execution data
		const runDataIndex = parseInt(resultData.runData, 10);
		const runData = executionData[runDataIndex];

		// Now we can access the Execute Workflow node data
		const executeWorkflowIndex = parseInt(runData['Execute Workflow'], 10);
		const executeWorkflowNodeData = executionData[executeWorkflowIndex];

		expect(executeWorkflowNodeData).toBeDefined();
		expect(Array.isArray(executeWorkflowNodeData)).toBe(true);

		// executeWorkflowNodeData is an array of string references, dereference the first one
		const firstExecutionIndex = parseInt(executeWorkflowNodeData[0], 10);
		const firstExecution = executionData[firstExecutionIndex];

		// firstExecution should have a data property that points to the actual output data
		const dataIndex = parseInt(firstExecution.data, 10);
		const actualData = executionData[dataIndex];

		// actualData.main is a string reference, dereference it
		const mainIndex = parseInt(actualData.main, 10);
		const mainData = executionData[mainIndex]; // This is an array like ['35']

		// mainData[0] is another string reference to the first output branch
		const outputBranchIndex = parseInt(mainData[0], 10);
		const outputBranch = executionData[outputBranchIndex]; // This is an array of items like ['37']

		// outputBranch[0] is a string reference to the first item
		const itemIndex = parseInt(outputBranch[0], 10);
		const item = executionData[itemIndex]; // This should be the actual item with json property

		// item.json is a string reference, dereference it
		const jsonIndex = parseInt(item.json, 10);
		const jsonData = executionData[jsonIndex];

		// jsonData.value is also a string reference, dereference it to get the actual value
		const valueIndex = parseInt(jsonData.value, 10);
		const actualValue = executionData[valueIndex];

		// Now we can verify the actual value
		expect(actualValue).toBeDefined();
		expect(actualValue).toBe('draft-version');
	});

	test('production execution should use published version of sub-workflow', async ({ api }) => {
		// Create a simple sub-workflow that returns a value
		const subWorkflowResult = await api.workflows.createWorkflowFromDefinition({
			name: 'Sub-workflow Production',
			nodes: [
				{
					parameters: {},
					id: 'execute-workflow-trigger',
					name: 'Execute Workflow Trigger',
					type: 'n8n-nodes-base.executeWorkflowTrigger',
					typeVersion: 1,
					position: [300, 300],
				},
				{
					parameters: {
						assignments: {
							assignments: [
								{
									id: 'value-field',
									name: 'value',
									value: 'published-version',
									type: 'string',
								},
							],
						},
					},
					id: 'sub-set-node',
					name: 'Set Value',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.3,
					position: [500, 300],
				},
			],
			connections: {
				'Execute Workflow Trigger': {
					main: [
						[
							{
								node: 'Set Value',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			},
		});

		const subWorkflowId = subWorkflowResult.workflowId;
		const subWorkflow = subWorkflowResult.createdWorkflow;

		// Publish the sub-workflow
		await api.workflows.activate(subWorkflowId, subWorkflow.versionId!);

		// Now modify the sub-workflow (create a draft change)
		const updateResponse = await api.request.patch(`/rest/workflows/${subWorkflowId}`, {
			data: {
				versionId: subWorkflow.versionId,
				name: subWorkflow.name,
				nodes: [
					{
						parameters: {},
						id: 'execute-workflow-trigger',
						name: 'Execute Workflow Trigger',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						typeVersion: 1,
						position: [300, 300],
					},
					{
						parameters: {
							assignments: {
								assignments: [
									{
										id: 'value-field',
										name: 'value',
										value: 'draft-version', // Changed value
										type: 'string',
									},
								],
							},
						},
						id: 'sub-set-node',
						name: 'Set Value',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.3,
						position: [500, 300],
					},
				],
				connections: {
					'Execute Workflow Trigger': {
						main: [
							[
								{
									node: 'Set Value',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		});

		expect(updateResponse.ok()).toBe(true);

		// Create a parent workflow with a webhook trigger
		const parentWorkflowResult = await api.workflows.createWorkflowFromDefinition({
			name: 'Parent Webhook Workflow',
			nodes: [
				{
					parameters: {
						httpMethod: 'POST',
						path: 'test-webhook',
						options: {},
					},
					id: 'webhook-trigger',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					position: [300, 300],
					webhookId: 'test-webhook-id',
				},
				{
					parameters: {
						source: 'database',
						workflowId: {
							__rl: true,
							value: subWorkflowId,
							mode: 'id',
						},
					},
					id: 'execute-workflow',
					name: 'Execute Workflow',
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1.1,
					position: [500, 300],
				},
			],
			connections: {
				Webhook: {
					main: [
						[
							{
								node: 'Execute Workflow',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			},
		});

		const parentWorkflowId = parentWorkflowResult.workflowId;
		const parentWorkflow = parentWorkflowResult.createdWorkflow;
		const webhookPath = parentWorkflowResult.webhookPath;

		// Publish the parent workflow (this should succeed because sub-workflow is published)
		await api.workflows.activate(parentWorkflowId, parentWorkflow.versionId!);

		// Trigger the parent workflow via webhook (production execution)
		const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
			method: 'POST',
			data: { test: 'data' },
		});

		expect(webhookResponse.ok()).toBe(true);

		// Wait for execution to complete
		const execution = await api.workflows.waitForExecution(parentWorkflowId, 5000);
		expect(execution.status).toBe('success');

		// Get execution details
		const executionDetails = await api.workflows.getExecution(execution.id);
		const executionData =
			typeof executionDetails.data === 'string'
				? JSON.parse(executionDetails.data)
				: executionDetails.data;

		// The execution data is in a flattened format with references
		const root = executionData[0];
		const resultDataIndex = parseInt(root.resultData, 10);
		const resultData = executionData[resultDataIndex];
		const runDataIndex = parseInt(resultData.runData, 10);
		const runData = executionData[runDataIndex];
		const executeWorkflowIndex = parseInt(runData['Execute Workflow'], 10);
		const executeWorkflowNodeData = executionData[executeWorkflowIndex];

		expect(executeWorkflowNodeData).toBeDefined();

		// Dereference the execution data
		const firstExecutionIndex = parseInt(executeWorkflowNodeData[0], 10);
		const firstExecution = executionData[firstExecutionIndex];
		const dataIndex = parseInt(firstExecution.data, 10);
		const actualData = executionData[dataIndex];

		// Navigate through the flattened structure to get the actual item
		const mainIndex = parseInt(actualData.main, 10);
		const mainData = executionData[mainIndex];
		const outputBranchIndex = parseInt(mainData[0], 10);
		const outputBranch = executionData[outputBranchIndex];
		const itemIndex = parseInt(outputBranch[0], 10);
		const item = executionData[itemIndex];

		// Dereference item.json and then jsonData.value
		const jsonIndex = parseInt(item.json, 10);
		const jsonData = executionData[jsonIndex];
		const valueIndex = parseInt(jsonData.value, 10);
		const actualValue = executionData[valueIndex];

		// Verify that the published version was used, not the draft
		expect(actualValue).toBeDefined();
		expect(actualValue).toBe('published-version');
	});

	test('should prevent publishing parent workflow when sub-workflow is not published', async ({
		api,
	}) => {
		// Create a sub-workflow (not published)
		const subWorkflowResult = await api.workflows.createWorkflowFromDefinition({
			name: 'Unpublished Sub-workflow',
			nodes: [
				{
					parameters: {},
					id: 'execute-workflow-trigger',
					name: 'Execute Workflow Trigger',
					type: 'n8n-nodes-base.executeWorkflowTrigger',
					typeVersion: 1,
					position: [300, 300],
				},
				{
					parameters: {
						assignments: {
							assignments: [
								{
									id: 'value-field',
									name: 'value',
									value: 'test',
									type: 'string',
								},
							],
						},
					},
					id: 'sub-set-node',
					name: 'Set Value',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.3,
					position: [500, 300],
				},
			],
			connections: {
				'Execute Workflow Trigger': {
					main: [
						[
							{
								node: 'Set Value',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			},
		});

		const subWorkflowId = subWorkflowResult.workflowId;
		const subWorkflow = subWorkflowResult.createdWorkflow;

		// Create a parent workflow with webhook trigger that references the unpublished sub-workflow
		const parentWorkflowResult = await api.workflows.createWorkflowFromDefinition({
			name: 'Parent With Unpublished Sub',
			nodes: [
				{
					parameters: {
						httpMethod: 'POST',
						path: 'test-webhook-validation',
						options: {},
					},
					id: 'webhook-trigger',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					position: [300, 300],
					webhookId: 'test-webhook-validation-id',
				},
				{
					parameters: {
						source: 'database',
						workflowId: {
							__rl: true,
							value: subWorkflowId,
							mode: 'id',
						},
					},
					id: 'execute-workflow',
					name: 'Execute Workflow',
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1.1,
					position: [500, 300],
				},
			],
			connections: {
				Webhook: {
					main: [
						[
							{
								node: 'Execute Workflow',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			},
		});

		const parentWorkflowId = parentWorkflowResult.workflowId;
		const parentWorkflow = parentWorkflowResult.createdWorkflow;

		// Try to publish the parent workflow - should fail
		const activateResponse = await api.request.post(
			`/rest/workflows/${parentWorkflowId}/activate`,
			{
				data: { versionId: parentWorkflow.versionId },
			},
		);

		expect(activateResponse.ok()).toBe(false);
		const errorResponse = await activateResponse.json();

		// Verify error message mentions the unpublished sub-workflow
		expect(errorResponse.message).toContain('not published');
		expect(errorResponse.message).toContain(subWorkflowId);
	});

	test('should allow publishing workflow that references itself (self-reference)', async ({
		api,
	}) => {
		// Create a workflow with a placeholder Execute Workflow node
		const workflowResult = await api.workflows.createWorkflowFromDefinition({
			name: 'Self-referencing Workflow',
			nodes: [
				{
					parameters: {
						httpMethod: 'POST',
						path: 'test-self-ref',
						options: {},
					},
					id: 'webhook-trigger',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					position: [300, 300],
					webhookId: 'test-self-ref-id',
				},
				{
					parameters: {
						source: 'database',
						workflowId: {
							__rl: true,
							value: '', // Will be set to workflow's own ID
							mode: 'id',
						},
					},
					id: 'execute-workflow',
					name: 'Execute Workflow',
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1.1,
					position: [500, 300],
				},
			],
			connections: {
				Webhook: {
					main: [
						[
							{
								node: 'Execute Workflow',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			},
		});

		const workflowId = workflowResult.workflowId;
		const workflow = workflowResult.createdWorkflow;

		// Update the workflow to reference itself
		const updateResponse = await api.request.patch(`/rest/workflows/${workflowId}`, {
			data: {
				versionId: workflow.versionId,
				name: workflow.name,
				nodes: [
					{
						parameters: {
							httpMethod: 'POST',
							path: 'test-self-ref',
							options: {},
						},
						id: 'webhook-trigger',
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 1,
						position: [300, 300],
						webhookId: 'test-self-ref-id',
					},
					{
						parameters: {
							source: 'database',
							workflowId: {
								__rl: true,
								value: workflowId, // Self-reference
								mode: 'id',
							},
						},
						id: 'execute-workflow',
						name: 'Execute Workflow',
						type: 'n8n-nodes-base.executeWorkflow',
						typeVersion: 1.1,
						position: [500, 300],
					},
				],
				connections: {
					Webhook: {
						main: [
							[
								{
									node: 'Execute Workflow',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		});

		expect(updateResponse.ok()).toBe(true);
		const updatedWorkflow = (await updateResponse.json()).data;

		// Try to publish the self-referencing workflow - should succeed
		const activateResponse = await api.request.post(`/rest/workflows/${workflowId}/activate`, {
			data: { versionId: updatedWorkflow.versionId },
		});

		expect(activateResponse.ok()).toBe(true);
	});

	test('should allow publishing after sub-workflow is published', async ({ api }) => {
		// Create a sub-workflow
		const subWorkflowResult = await api.workflows.createWorkflowFromDefinition({
			name: 'Sub-workflow To Be Published',
			nodes: [
				{
					parameters: {},
					id: 'execute-workflow-trigger',
					name: 'Execute Workflow Trigger',
					type: 'n8n-nodes-base.executeWorkflowTrigger',
					typeVersion: 1,
					position: [300, 300],
				},
				{
					parameters: {
						assignments: {
							assignments: [
								{
									id: 'value-field',
									name: 'value',
									value: 'test',
									type: 'string',
								},
							],
						},
					},
					id: 'sub-set-node',
					name: 'Set Value',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.3,
					position: [500, 300],
				},
			],
			connections: {
				'Execute Workflow Trigger': {
					main: [
						[
							{
								node: 'Set Value',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			},
		});

		const subWorkflowId = subWorkflowResult.workflowId;
		const subWorkflow = subWorkflowResult.createdWorkflow;

		// Create a parent workflow
		const parentWorkflowResult = await api.workflows.createWorkflowFromDefinition({
			name: 'Parent To Be Published',
			nodes: [
				{
					parameters: {
						httpMethod: 'POST',
						path: 'test-publish-flow',
						options: {},
					},
					id: 'webhook-trigger',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					position: [300, 300],
					webhookId: 'test-publish-flow-id',
				},
				{
					parameters: {
						source: 'database',
						workflowId: {
							__rl: true,
							value: subWorkflowId,
							mode: 'id',
						},
					},
					id: 'execute-workflow',
					name: 'Execute Workflow',
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1.1,
					position: [500, 300],
				},
			],
			connections: {
				Webhook: {
					main: [
						[
							{
								node: 'Execute Workflow',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			},
		});

		const parentWorkflowId = parentWorkflowResult.workflowId;
		const parentWorkflow = parentWorkflowResult.createdWorkflow;

		// First attempt to publish parent - should fail
		const firstAttempt = await api.request.post(`/rest/workflows/${parentWorkflowId}/activate`, {
			data: { versionId: parentWorkflow.versionId },
		});
		expect(firstAttempt.ok()).toBe(false);

		// Now publish the sub-workflow
		await api.workflows.activate(subWorkflowId, subWorkflow.versionId!);

		// Second attempt to publish parent - should succeed
		const secondAttempt = await api.request.post(`/rest/workflows/${parentWorkflowId}/activate`, {
			data: { versionId: parentWorkflow.versionId },
		});
		expect(secondAttempt.ok()).toBe(true);
	});
});
