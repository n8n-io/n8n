import type { IWorkflowBase } from 'n8n-workflow';

import { makeScheduleTriggerWorkflow } from './schedule-trigger-workflow';
import { test, expect } from '../../../fixtures/base';

// Flag-off parity control: with the durable scheduler disabled (default), the
// same workflow must still fire via the legacy in-memory path. Guards against the
// durable work regressing the common case.
test.describe(
	'Schedule Trigger (legacy in-memory scheduler)',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should fire an activated Schedule Trigger through the legacy in-memory path', async ({
			api,
		}) => {
			const wf = makeScheduleTriggerWorkflow();
			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				wf.toJSON() as IWorkflowBase,
			);

			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const execution = await api.workflows.waitForExecution(workflowId, 60_000, 'trigger');
			expect(execution.status).toBe('success');
		});
	},
);
