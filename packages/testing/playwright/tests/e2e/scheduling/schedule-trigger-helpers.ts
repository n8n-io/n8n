import type { IWorkflowBase } from 'n8n-workflow';

import type { makeScheduleTriggerWorkflow } from './schedule-trigger-workflow';
import { expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

type ScheduleTriggerWorkflow = ReturnType<typeof makeScheduleTriggerWorkflow>;

// Shared happy-path assertion: create + activate a Schedule Trigger workflow and
// assert it produces a successful trigger-mode execution. The fire tests differ
// only in the rule kind (seconds vs cron) and the scheduler flags, so the flow
// lives here once rather than being copy-pasted across specs. Returns the created
// workflow id for callers that go on to inspect further executions.
export async function expectScheduleTriggerFires(
	api: ApiHelpers,
	wf: ScheduleTriggerWorkflow,
): Promise<string> {
	const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
		wf.toJSON() as IWorkflowBase,
	);

	await api.workflows.activate(workflowId, createdWorkflow.versionId!);

	const execution = await api.workflows.waitForExecution(workflowId, 60_000, 'trigger');
	expect(execution.status).toBe('success');

	return workflowId;
}
