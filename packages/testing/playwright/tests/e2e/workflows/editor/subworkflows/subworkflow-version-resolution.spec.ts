import { readFileSync } from 'fs';
import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect } from '../../../../../fixtures/base';
import { resolveFromRoot } from '../../../../../utils/path-helper';

test.describe('Sub-workflow Version Resolution', () => {
	test('manual execution should use draft version of sub-workflow', async ({ api }) => {
		const { workflowId: childWorkflowId, createdWorkflow: childWorkflow } =
			await api.workflows.importWorkflowFromFile('subworkflow-version-child.json');

		await api.workflows.activate(childWorkflowId, childWorkflow.versionId!);

		childWorkflow.nodes[1].parameters.assignments.assignments[0].value = 'draft-version';

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
	});

	test('production execution should use published version of sub-workflow', async ({ api }) => {
		const childFilePath = resolveFromRoot('workflows', 'subworkflow-version-child.json');
		const childDefinition = JSON.parse(readFileSync(childFilePath, 'utf8')) as IWorkflowBase;
		childDefinition.nodes[1].parameters.assignments.assignments[0].value = 'published-version';

		const { workflowId: childWorkflowId, createdWorkflow: childWorkflow } =
			await api.workflows.createWorkflowFromDefinition(childDefinition);
		await api.workflows.activate(childWorkflowId, childWorkflow.versionId!);

		childDefinition.nodes[1].parameters.assignments.assignments[0].value = 'draft-version';
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
		parentDefinition.nodes[1].parameters.workflowId.value = childWorkflowId;

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
		expect(webhookResponse!.ok()).toBe(true);

		const responseData = await webhookResponse!.json();
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
		} catch (error) {
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
