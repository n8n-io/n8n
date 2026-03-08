import { workflow, trigger, node } from '@n8n/workflow-sdk';
import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../../fixtures/base';

const makeSaveExecutionWorkflow = (saveExecution: boolean) => {
	const webhookTrigger = trigger({
		type: 'n8n-nodes-base.webhook',
		version: 2,
		config: {
			name: 'Webhook',
			parameters: {
				httpMethod: 'POST',
				path: `save-exec-test-${nanoid()}`,
			},
		},
	});

	const saveExecutionNode = node({
		type: 'n8n-nodes-base.saveExecution',
		version: 1,
		config: {
			name: 'Save Execution',
			parameters: { saveExecution },
		},
	});

	const noOp = node({
		type: 'n8n-nodes-base.noOp',
		version: 1,
		config: { name: 'NoOp' },
	});

	return workflow(nanoid(), `Save Execution Test ${nanoid()}`).add(
		webhookTrigger.to(saveExecutionNode).to(noOp),
	);
};

test.describe(
	'Save Execution Node',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should force save when workflow settings say do not save', async ({ api }) => {
			const wf = makeSaveExecutionWorkflow(true);
			const json = wf.toJSON() as IWorkflowBase;
			json.settings = {
				executionOrder: 'v1',
				saveDataSuccessExecution: 'none',
			};

			const { workflowId, createdWorkflow, webhookPath } =
				await api.workflows.createWorkflowFromDefinition(json);

			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
				data: { test: true },
			});
			expect(webhookResponse.ok()).toBe(true);

			const execution = await api.workflows.waitForExecution(workflowId, 10_000);
			expect(execution.status).toBe('success');

			const executions = await api.workflows.getExecutions(workflowId);
			expect(executions.length).toBe(1);
		});

		test('should force discard when workflow settings say save all', async ({ api }) => {
			const discardWf = makeSaveExecutionWorkflow(false);
			const discardJson = discardWf.toJSON() as IWorkflowBase;
			discardJson.settings = {
				executionOrder: 'v1',
				saveDataSuccessExecution: 'all',
			};

			const {
				workflowId: discardWorkflowId,
				createdWorkflow: discardCreated,
				webhookPath: discardWebhookPath,
			} = await api.workflows.createWorkflowFromDefinition(discardJson);

			// Second workflow acts as a timing fence — once its execution is persisted,
			// the discard workflow's save decision must have also been processed
			const fenceWf = makeSaveExecutionWorkflow(true);
			const fenceJson = fenceWf.toJSON() as IWorkflowBase;
			fenceJson.settings = {
				executionOrder: 'v1',
				saveDataSuccessExecution: 'all',
			};

			const {
				workflowId: fenceWorkflowId,
				createdWorkflow: fenceCreated,
				webhookPath: fenceWebhookPath,
			} = await api.workflows.createWorkflowFromDefinition(fenceJson);

			await api.workflows.activate(discardWorkflowId, discardCreated.versionId!);
			await api.workflows.activate(fenceWorkflowId, fenceCreated.versionId!);

			const discardResponse = await api.webhooks.trigger(`/webhook/${discardWebhookPath}`, {
				method: 'POST',
				data: { test: true },
			});
			expect(discardResponse.ok()).toBe(true);

			const fenceResponse = await api.webhooks.trigger(`/webhook/${fenceWebhookPath}`, {
				method: 'POST',
				data: { test: true },
			});
			expect(fenceResponse.ok()).toBe(true);

			await api.workflows.waitForExecution(fenceWorkflowId, 10_000);

			const discardedExecutions = await api.workflows.getExecutions(discardWorkflowId);
			expect(discardedExecutions.length).toBe(0);
		});
	},
);
