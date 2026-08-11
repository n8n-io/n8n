import type { ProxyServer } from 'n8n-containers/services/proxy';
import type { IDataObject, IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import type { makePollTriggerWorkflow } from './poll-trigger-workflow';
import { expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

type PollTriggerWorkflow = ReturnType<typeof makePollTriggerWorkflow>;

const SEED_POLL_ITEMS: IDataObject[] = [{ id: 1 }];

export async function programPollResponse(
	proxy: ProxyServer,
	path: string,
	items: IDataObject[],
	times?: { remainingTimes: number; unlimited: boolean },
) {
	await proxy.createExpectation({
		httpRequest: { method: 'GET', path },
		httpResponse: {
			statusCode: 200,
			headers: { 'Content-Type': ['application/json'] },
			body: JSON.stringify({ items }),
		},
		times,
	});
}

// Programs the mock poll response before activation, so the inline seed poll
// that every fresh activation runs is itself the fire under test.
export async function expectPollTriggerFires(
	api: ApiHelpers,
	proxy: ProxyServer,
	makeWorkflow: (path: string) => PollTriggerWorkflow,
	options?: { itemsAfterSeedPoll?: IDataObject[] },
): Promise<{ workflowId: string; nodeId: string; path: string }> {
	const path = `/${nanoid()}`;
	const { itemsAfterSeedPoll } = options ?? {};

	await programPollResponse(
		proxy,
		path,
		SEED_POLL_ITEMS,
		itemsAfterSeedPoll && { remainingTimes: 1, unlimited: false },
	);
	if (itemsAfterSeedPoll) await programPollResponse(proxy, path, itemsAfterSeedPoll);

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

export async function fetchTriggerExecutionIds(
	api: ApiHelpers,
	workflowId: string,
): Promise<Set<string>> {
	const executions = await api.workflows.getExecutions(workflowId, 50);
	return new Set(
		executions.filter((execution) => execution.mode === 'trigger').map((execution) => execution.id),
	);
}

async function fetchNewTriggerExecutions(api: ApiHelpers, workflowId: string, known: Set<string>) {
	const executions = await api.workflows.getExecutions(workflowId, 50);
	return executions.filter((execution) => execution.mode === 'trigger' && !known.has(execution.id));
}

// Only an execution whose id is absent from `known` proves a fresh fire;
// `waitForExecution`'s recency fallback would otherwise re-match the
// activation-seed execution. Requires the count to repeat across polls,
// with all executions already 'success', before treating it as settled
// — catches a duplicate re-emit from a racing cursor commit.
export async function expectNewTriggerExecution(
	api: ApiHelpers,
	workflowId: string,
	known: Set<string>,
	timeoutMs = 20_000,
): Promise<void> {
	let previousCount = -1;

	await expect
		.poll(
			async () => {
				const fresh = await fetchNewTriggerExecutions(api, workflowId, known);
				const count = fresh.length;
				const settled =
					count > 0 &&
					count === previousCount &&
					fresh.every((execution) => execution.status === 'success');
				previousCount = count;
				return settled;
			},
			{ timeout: timeoutMs },
		)
		.toBe(true);

	const fresh = await fetchNewTriggerExecutions(api, workflowId, known);

	expect(fresh).toHaveLength(1);
	expect(fresh[0].status).toBe('success');
}

export async function expectNoNewTriggerExecution(
	api: ApiHelpers,
	workflowId: string,
	known: Set<string>,
	windowMs = 8_000,
): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, windowMs));
	expect(await fetchNewTriggerExecutions(api, workflowId, known)).toHaveLength(0);
}

export async function readNodeStaticData(
	api: ApiHelpers,
	workflowId: string,
	nodeName: string,
): Promise<unknown> {
	const { staticData } = await api.workflows.getWorkflow(workflowId);
	const parsed =
		typeof staticData === 'string' ? (JSON.parse(staticData) as IDataObject) : staticData;
	return parsed?.[`node:${nodeName}`] ?? null;
}

// Wipes the static data and forces the poll that reads it back. The workflow stays
// published: every scheduled poll re-reads the static data from the workflow row,
// so a deactivate/reactivate cycle would add nothing but timing.
export async function clearStaticDataAndPoll(
	api: ApiHelpers,
	workflowId: string,
	nodeId: string,
): Promise<void> {
	await api.clearWorkflowStaticData(workflowId);
	await api.fireScheduledJobsNow(workflowId, nodeId);
}
