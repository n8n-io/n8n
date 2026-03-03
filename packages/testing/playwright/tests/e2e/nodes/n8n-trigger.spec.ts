import { workflow, trigger, node } from '@n8n/workflow-sdk';
import type { INode, IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

type TriggerEventType = 'activate' | 'update';

const makeN8nTriggerWorkflow = (events: TriggerEventType[]) => {
	const n8nTrigger = trigger({
		type: 'n8n-nodes-base.n8nTrigger',
		version: 1,
		config: {
			name: 'n8n Trigger',
			parameters: { events },
		},
	});

	const noOp = node({
		type: 'n8n-nodes-base.noOp',
		version: 1,
		config: {
			name: 'NoOp',
		},
	});

	return workflow(nanoid(), `n8n Trigger Test ${nanoid()}`).add(n8nTrigger.to(noOp));
};

test.describe(
	'n8n Trigger node',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should fire "activate" event when workflow is published', async ({ api }) => {
			const wf = makeN8nTriggerWorkflow(['activate']);
			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				wf.toJSON() as IWorkflowBase,
			);

			// First activation — activationMode = 'activate'
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const execution = await api.workflows.waitForExecution(workflowId, 15_000, 'trigger');
			expect(execution.status).toBe('success');
		});

		test('should fire "update" event when active workflow is re-published', async ({ api }) => {
			const wf = makeN8nTriggerWorkflow(['update']);
			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				wf.toJSON() as IWorkflowBase,
			);

			// First activation — activationMode = 'activate', trigger should NOT fire
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			// Update the workflow nodes to create a new version (simulates editing)
			const updatedNodes = wf.add(
				node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'NoOp2' } }),
			);
			const updatedWorkflow = await api.workflows.update(workflowId, createdWorkflow.versionId!, {
				nodes: updatedNodes.toJSON().nodes as INode[],
			});

			// Re-activation with new version — activationMode = 'update', trigger should fire
			await api.workflows.activate(workflowId, updatedWorkflow.versionId!);

			const execution = await api.workflows.waitForExecution(workflowId, 15_000, 'trigger');
			expect(execution.status).toBe('success');
		});
	},
);
