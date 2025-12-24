import { readFileSync } from 'fs';
import type {
	AssignmentCollectionValue,
	INodeParameterResourceLocator,
	IWorkflowBase,
	NodeParameterValueType,
} from 'n8n-workflow';

import { test, expect } from '../../../../../fixtures/base';
import { resolveFromRoot } from '../../../../../utils/path-helper';

function isAssignmentCollectionValue(
	param: NodeParameterValueType,
): param is AssignmentCollectionValue {
	return (
		typeof param === 'object' &&
		param !== null &&
		'assignments' in param &&
		Array.isArray((param as AssignmentCollectionValue).assignments)
	);
}

function isResourceLocator(param: NodeParameterValueType): param is INodeParameterResourceLocator {
	return typeof param === 'object' && param !== null && '__rl' in param && 'value' in param;
}

function assertAssignmentCollectionValue(
	param: NodeParameterValueType,
): asserts param is AssignmentCollectionValue {
	if (!isAssignmentCollectionValue(param)) {
		throw new Error('Expected AssignmentCollectionValue');
	}
}

function assertResourceLocator(
	param: NodeParameterValueType,
): asserts param is INodeParameterResourceLocator {
	if (!isResourceLocator(param)) {
		throw new Error('Expected INodeParameterResourceLocator');
	}
}

function assertIsError(error: unknown): asserts error is Error {
	if (!(error instanceof Error)) {
		throw new Error('Expected Error instance');
	}
}

test.describe('Sub-workflow Version Resolution', () => {
	test('manual execution should use draft version of sub-workflow', async ({ api }) => {
		const { workflowId: childWorkflowId, createdWorkflow: childWorkflow } =
			await api.workflows.importWorkflowFromFile('subworkflow-version-child.json');

		await api.workflows.activate(childWorkflowId, childWorkflow.versionId!);

		const assignmentsParam = childWorkflow.nodes[1].parameters.assignments;
		assertAssignmentCollectionValue(assignmentsParam);
		assignmentsParam.assignments[0].value = 'draft-version';

		await api.request.patch(`/rest/workflows/${childWorkflowId}`, {
			data: {
				versionId: childWorkflow.versionId,
				name: childWorkflow.name,
				nodes: childWorkflow.nodes,
				connections: childWorkflow.connections,
			},
		});

		const { workflowId: parentWorkflowId, createdWorkflow: parentWorkflow } =
			await api.workflows.createWorkflowFromDefinition({
				name: 'Parent Workflow - Manual',
				nodes: [
					{
						parameters: {},
						id: 'manual-trigger',
						name: 'When clicking Test workflow',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						parameters: {
							source: 'database',
							workflowId: {
								__rl: true,
								value: childWorkflowId,
								mode: 'id',
							},
						},
						id: 'execute-workflow',
						name: 'Execute Workflow',
						type: 'n8n-nodes-base.executeWorkflow',
						typeVersion: 1.1,
						position: [200, 0],
					},
				],
				connections: {
					'When clicking Test workflow': {
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

		const runResponse = await api.request.post(`/rest/workflows/${parentWorkflowId}/run`, {
			data: {
				workflowData: parentWorkflow,
				triggerToStartFrom: { name: 'When clicking Test workflow' },
			},
		});

		expect(runResponse.ok()).toBe(true);

		const execution = await api.workflows.waitForExecution(parentWorkflowId, 10000, 'manual');
		expect(execution.status).toBe('success');

		const executionDetails = await api.workflows.getExecution(execution.id);
		expect(executionDetails.data).toContain('draft-version');
	});

	test('production execution should use published version of sub-workflow', async ({ api }) => {
		const childFilePath = resolveFromRoot('workflows', 'subworkflow-version-child.json');
		const childDefinition = JSON.parse(readFileSync(childFilePath, 'utf8')) as IWorkflowBase;
		const childAssignmentsParam = childDefinition.nodes[1].parameters.assignments;
		assertAssignmentCollectionValue(childAssignmentsParam);
		childAssignmentsParam.assignments[0].value = 'published-version';

		const { workflowId: childWorkflowId, createdWorkflow: childWorkflow } =
			await api.workflows.createWorkflowFromDefinition(childDefinition);
		await api.workflows.activate(childWorkflowId, childWorkflow.versionId!);

		assertAssignmentCollectionValue(childAssignmentsParam);
		childAssignmentsParam.assignments[0].value = 'draft-version';
		await api.request.patch(`/rest/workflows/${childWorkflowId}`, {
			data: {
				versionId: childWorkflow.versionId,
				name: childDefinition.name,
				nodes: childDefinition.nodes,
				connections: childDefinition.connections,
			},
		});

		const parentFilePath = resolveFromRoot('workflows', 'subworkflow-version-parent.json');
		const parentDefinition = JSON.parse(readFileSync(parentFilePath, 'utf8')) as IWorkflowBase;
		const workflowIdParam = parentDefinition.nodes[1].parameters.workflowId;
		assertResourceLocator(workflowIdParam);
		workflowIdParam.value = childWorkflowId;

		const {
			webhookPath,
			workflowId: parentWorkflowId,
			createdWorkflow: parentWorkflow,
		} = await api.workflows.importWorkflowFromDefinition(parentDefinition);

		await api.workflows.activate(parentWorkflowId, parentWorkflow.versionId!);

		const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
			method: 'POST',
			data: { test: 'data' },
		});

		expect(webhookResponse).toBeDefined();
		expect(webhookResponse.ok()).toBe(true);

		const responseData = await webhookResponse.json();
		expect(responseData['wf-version']).toBe('published-version');
	});

	test('should prevent publishing parent workflow when sub-workflow is not published', async ({
		api,
	}) => {
		const childWorkflowId = (
			await api.workflows.importWorkflowFromFile('subworkflow-version-child.json')
		).workflowId;

		const { workflowId: parentWorkflowId, createdWorkflow: parentWorkflow } =
			await api.workflows.createWorkflowFromDefinition({
				name: 'Parent Workflow',
				nodes: [
					{
						parameters: {},
						id: 'manual-trigger',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						parameters: {
							source: 'database',
							workflowId: {
								__rl: true,
								value: childWorkflowId,
								mode: 'id',
							},
						},
						id: 'execute-workflow',
						name: 'Execute Workflow',
						type: 'n8n-nodes-base.executeWorkflow',
						typeVersion: 1.1,
						position: [200, 0],
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

		try {
			await api.workflows.activate(parentWorkflowId, parentWorkflow.versionId!);
			expect(true).toBe(false);
		} catch (error: unknown) {
			assertIsError(error);
			expect(error.message).toContain('Failed to activate workflow');
			expect(error.message).toContain('Workflow cannot be activated');
		}
	});

	test('should allow self-referencing workflows', async ({ api }) => {
		const { workflowId, createdWorkflow: workflow } =
			await api.workflows.createWorkflowFromDefinition({
				name: 'Self-Referencing Workflow',
				nodes: [
					{
						parameters: {
							path: 'self-ref-webhook',
							responseMode: 'lastNode',
							options: {},
						},
						id: 'webhook-trigger',
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2.1,
						position: [0, 0],
						webhookId: 'self-ref-webhook-id',
					},
					{
						parameters: {
							source: 'database',
							workflowId: {
								__rl: true,
								value: 'SELF',
								mode: 'id',
							},
						},
						id: 'execute-workflow',
						name: 'Execute Workflow',
						type: 'n8n-nodes-base.executeWorkflow',
						typeVersion: 1.1,
						position: [200, 0],
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

		workflow.nodes[1].parameters = {
			...workflow.nodes[1].parameters,
			workflowId: {
				__rl: true,
				value: workflowId,
				mode: 'id',
			},
		};

		const patchResponse = await api.request.patch(`/rest/workflows/${workflowId}`, {
			data: {
				versionId: workflow.versionId,
				name: workflow.name,
				nodes: workflow.nodes,
				connections: workflow.connections,
			},
		});

		const updatedWorkflowData = await patchResponse.json();

		await api.workflows.activate(workflowId, updatedWorkflowData.data.versionId);
	});
});
