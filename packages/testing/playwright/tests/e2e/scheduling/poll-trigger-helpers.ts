import type { ProxyServer } from 'n8n-containers/services/proxy';
import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import type { makePollTriggerWorkflow } from './poll-trigger-workflow';
import { expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

type PollTriggerWorkflow = ReturnType<typeof makePollTriggerWorkflow>;

// Programs the mock poll response before activation, so the inline seed poll
// that every fresh activation runs is itself the fire under test.
export async function expectPollTriggerFires(
	api: ApiHelpers,
	proxy: ProxyServer,
	makeWorkflow: (path: string) => PollTriggerWorkflow,
): Promise<{ workflowId: string; nodeId: string; path: string }> {
	const path = `/${nanoid()}`;
	await proxy.createGetExpectation(path, { items: [{ id: 1 }] });

	const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
		makeWorkflow(path).toJSON() as IWorkflowBase,
	);

	await api.workflows.activate(workflowId, createdWorkflow.versionId!);

	const execution = await api.workflows.waitForExecution(workflowId, 90_000, 'trigger');
	expect(execution.status).toBe('success');

	const triggerNode = createdWorkflow.nodes.find(
		(node) => node.type === 'n8n-nodes-base.e2eTestPollingTrigger',
	);
	if (!triggerNode) throw new Error('Poll trigger node not found in created workflow');

	return { workflowId, nodeId: triggerNode.id, path };
}
