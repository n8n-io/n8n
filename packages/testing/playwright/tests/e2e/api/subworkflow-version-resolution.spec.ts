import type { INode } from 'n8n-workflow';

import { test, expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

/**
 * E2E tests for sub-workflow version resolution (ADO-4535)
 *
 * This test suite validates that:
 * 1. Manual/test executions use DRAFT versions of sub-workflows
 * 2. Production executions (webhooks/triggers) use PUBLISHED versions of sub-workflows
 * 3. Publishing a parent workflow validates that all referenced sub-workflows are published
 * 4. Self-referencing workflows can be published
 */

// Helper functions to reduce duplication
const helpers = {
	/**
	 * Creates a sub-workflow with Execute Workflow Trigger and Set Value nodes
	 */
	async createSubWorkflow(api: ApiHelpers, name: string, value: string) {
		return await api.workflows.createWorkflowFromDefinition({
			name,
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
									value,
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
	},

	/**
	 * Updates a sub-workflow to set a new value (creates a draft version)
	 */
	async updateSubWorkflowValue(
		api: ApiHelpers,
		workflowId: string,
		versionId: string,
		name: string,
		newValue: string,
	) {
		const updateResponse = await api.request.patch(`/rest/workflows/${workflowId}`, {
			data: {
				versionId,
				name,
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
										value: newValue,
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
		return updateResponse;
	},

	/**
	 * Creates a parent workflow with Manual Trigger and Execute Workflow node
	 */
	async createParentWorkflowWithManualTrigger(
		api: ApiHelpers,
		name: string,
		subWorkflowId: string,
	) {
		return await api.workflows.createWorkflowFromDefinition({
			name,
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
	},

	/**
	 * Creates a parent workflow with Webhook trigger and Execute Workflow node
	 */
	async createParentWorkflowWithWebhook(
		api: ApiHelpers,
		name: string,
		subWorkflowId: string,
		webhookPath: string,
		webhookId: string,
	) {
		return await api.workflows.createWorkflowFromDefinition({
			name,
			nodes: [
				{
					parameters: {
						httpMethod: 'POST',
						path: webhookPath,
						options: {},
					},
					id: 'webhook-trigger',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					position: [300, 300],
					webhookId,
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
	},

	/**
	 * Extracts the 'value' field from the complex flattened execution data structure
	 * returned by n8n's Execute Workflow node
	 */
	extractValueFromExecutionData(executionData: unknown[]): string {
		// Navigate through the flattened structure with string references
		const root = executionData[0] as Record<string, unknown>;
		const resultDataIndex = parseInt(root.resultData as string, 10);
		const resultData = executionData[resultDataIndex] as Record<string, unknown>;
		const runDataIndex = parseInt(resultData.runData as string, 10);
		const runData = executionData[runDataIndex] as Record<string, unknown>;
		const executeWorkflowIndex = parseInt(runData['Execute Workflow'] as string, 10);
		const executeWorkflowNodeData = executionData[executeWorkflowIndex] as unknown[];

		// Dereference through multiple levels
		const firstExecutionIndex = parseInt(executeWorkflowNodeData[0] as string, 10);
		const firstExecution = executionData[firstExecutionIndex] as Record<string, unknown>;
		const dataIndex = parseInt(firstExecution.data as string, 10);
		const actualData = executionData[dataIndex] as Record<string, unknown>;
		const mainIndex = parseInt(actualData.main as string, 10);
		const mainData = executionData[mainIndex] as unknown[];
		const outputBranchIndex = parseInt(mainData[0] as string, 10);
		const outputBranch = executionData[outputBranchIndex] as unknown[];
		const itemIndex = parseInt(outputBranch[0] as string, 10);
		const item = executionData[itemIndex] as Record<string, unknown>;
		const jsonIndex = parseInt(item.json as string, 10);
		const jsonData = executionData[jsonIndex] as Record<string, unknown>;
		const valueIndex = parseInt(jsonData.value as string, 10);

		return executionData[valueIndex] as string;
	},

	/**
	 * Parses execution data string to JSON if needed
	 */
	parseExecutionData(data: unknown): unknown[] {
		return typeof data === 'string' ? JSON.parse(data) : (data as unknown[]);
	},
};

test.describe('Sub-workflow Version Resolution', () => {
	test('manual execution should use draft version of sub-workflow', async ({ api }) => {
		// Create and publish a sub-workflow with published value
		const subWorkflowResult = await helpers.createSubWorkflow(
			api,
			'Sub-workflow',
			'published-version',
		);
		const subWorkflowId = subWorkflowResult.workflowId;
		const subWorkflow = subWorkflowResult.createdWorkflow;

		await api.workflows.activate(subWorkflowId, subWorkflow.versionId!);

		// Update to create a draft with a different value
		await helpers.updateSubWorkflowValue(
			api,
			subWorkflowId,
			subWorkflow.versionId!,
			subWorkflow.name,
			'draft-version',
		);

		// Create parent workflow with manual trigger
		const parentWorkflowResult = await helpers.createParentWorkflowWithManualTrigger(
			api,
			'Parent Workflow',
			subWorkflowId,
		);
		const parentWorkflowId = parentWorkflowResult.workflowId;
		const parentWorkflow = parentWorkflowResult.createdWorkflow;

		// Execute manually
		const manualExecResponse = await api.request.post(`/rest/workflows/${parentWorkflowId}/run`, {
			data: {
				workflowData: parentWorkflow,
				triggerToStartFrom: { name: 'Manual Trigger' },
			},
		});

		expect(manualExecResponse.ok()).toBe(true);
		const manualExecution = await manualExecResponse.json();

		// Wait for execution to complete
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Get and verify execution result
		const executionDetails = await api.workflows.getExecution(manualExecution.data.executionId);
		const executionData = helpers.parseExecutionData(executionDetails.data);

		const actualValue = helpers.extractValueFromExecutionData(executionData);
		expect(actualValue).toBe('draft-version');
	});

	test('production execution should use published version of sub-workflow', async ({ api }) => {
		// Create and publish a sub-workflow with published value
		const subWorkflowResult = await helpers.createSubWorkflow(
			api,
			'Sub-workflow Production',
			'published-version',
		);
		const subWorkflowId = subWorkflowResult.workflowId;
		const subWorkflow = subWorkflowResult.createdWorkflow;

		await api.workflows.activate(subWorkflowId, subWorkflow.versionId!);

		// Update to create a draft with a different value
		await helpers.updateSubWorkflowValue(
			api,
			subWorkflowId,
			subWorkflow.versionId!,
			subWorkflow.name,
			'draft-version',
		);

		// Create parent workflow with webhook trigger
		const parentWorkflowResult = await helpers.createParentWorkflowWithWebhook(
			api,
			'Parent Webhook Workflow',
			subWorkflowId,
			'test-webhook',
			'test-webhook-id',
		);
		const parentWorkflowId = parentWorkflowResult.workflowId;
		const parentWorkflow = parentWorkflowResult.createdWorkflow;
		const webhookPath = parentWorkflowResult.webhookPath;

		// Publish parent workflow
		await api.workflows.activate(parentWorkflowId, parentWorkflow.versionId!);

		// Trigger via webhook (production execution)
		const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
			method: 'POST',
			data: { test: 'data' },
		});

		expect(webhookResponse.ok()).toBe(true);

		// Wait for execution and verify result
		const execution = await api.workflows.waitForExecution(parentWorkflowId, 5000);
		expect(execution.status).toBe('success');

		const executionDetails = await api.workflows.getExecution(execution.id);
		const executionData = helpers.parseExecutionData(executionDetails.data);

		const actualValue = helpers.extractValueFromExecutionData(executionData);
		expect(actualValue).toBe('published-version');
	});

	test('should prevent publishing parent workflow when sub-workflow is not published', async ({
		api,
	}) => {
		// Create unpublished sub-workflow
		const subWorkflowResult = await helpers.createSubWorkflow(
			api,
			'Unpublished Sub-workflow',
			'test',
		);
		const subWorkflowId = subWorkflowResult.workflowId;

		// Create parent workflow referencing unpublished sub-workflow
		const parentWorkflowResult = await helpers.createParentWorkflowWithWebhook(
			api,
			'Parent With Unpublished Sub',
			subWorkflowId,
			'test-webhook-validation',
			'test-webhook-validation-id',
		);
		const parentWorkflowId = parentWorkflowResult.workflowId;
		const parentWorkflow = parentWorkflowResult.createdWorkflow;

		// Try to publish - should fail
		const activateResponse = await api.request.post(
			`/rest/workflows/${parentWorkflowId}/activate`,
			{ data: { versionId: parentWorkflow.versionId } },
		);

		expect(activateResponse.ok()).toBe(false);
		const errorResponse = await activateResponse.json();

		// Verify error mentions unpublished sub-workflow
		expect(errorResponse.message).toContain('not published');
		expect(errorResponse.message).toContain(subWorkflowId);
	});

	test('should allow publishing workflow that references itself (self-reference)', async ({
		api,
	}) => {
		// Create workflow with placeholder Execute Workflow node
		const workflowResult = await helpers.createParentWorkflowWithWebhook(
			api,
			'Self-referencing Workflow',
			'', // Empty workflow ID initially
			'test-self-ref',
			'test-self-ref-id',
		);
		const workflowId = workflowResult.workflowId;
		const workflow = workflowResult.createdWorkflow;

		// Update workflow to reference itself
		const updateResponse = await api.request.patch(`/rest/workflows/${workflowId}`, {
			data: {
				versionId: workflow.versionId,
				name: workflow.name,
				nodes: workflow.nodes.map((node: INode) =>
					node.type === 'n8n-nodes-base.executeWorkflow'
						? {
								...node,
								parameters: {
									...node.parameters,
									workflowId: { __rl: true, value: workflowId, mode: 'id' },
								},
							}
						: node,
				),
				connections: workflow.connections,
			},
		});

		expect(updateResponse.ok()).toBe(true);
		const updatedWorkflow = (await updateResponse.json()).data;

		// Try to publish self-referencing workflow - should succeed
		const activateResponse = await api.request.post(`/rest/workflows/${workflowId}/activate`, {
			data: { versionId: updatedWorkflow.versionId },
		});

		expect(activateResponse.ok()).toBe(true);
	});

	test('should allow publishing after sub-workflow is published', async ({ api }) => {
		// Create unpublished sub-workflow
		const subWorkflowResult = await helpers.createSubWorkflow(
			api,
			'Sub-workflow To Be Published',
			'test',
		);
		const subWorkflowId = subWorkflowResult.workflowId;
		const subWorkflow = subWorkflowResult.createdWorkflow;

		// Create parent workflow
		const parentWorkflowResult = await helpers.createParentWorkflowWithWebhook(
			api,
			'Parent To Be Published',
			subWorkflowId,
			'test-publish-flow',
			'test-publish-flow-id',
		);
		const parentWorkflowId = parentWorkflowResult.workflowId;
		const parentWorkflow = parentWorkflowResult.createdWorkflow;

		// First attempt - should fail
		const firstAttempt = await api.request.post(`/rest/workflows/${parentWorkflowId}/activate`, {
			data: { versionId: parentWorkflow.versionId },
		});
		expect(firstAttempt.ok()).toBe(false);

		// Publish sub-workflow
		await api.workflows.activate(subWorkflowId, subWorkflow.versionId!);

		// Second attempt - should succeed
		const secondAttempt = await api.request.post(`/rest/workflows/${parentWorkflowId}/activate`, {
			data: { versionId: parentWorkflow.versionId },
		});
		expect(secondAttempt.ok()).toBe(true);
	});
});
