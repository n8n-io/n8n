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

export async function programPollErrorResponse(
	proxy: ProxyServer,
	path: string,
	statusCode: number,
	times?: { remainingTimes: number; unlimited: boolean },
) {
	await proxy.createExpectation({
		httpRequest: { method: 'GET', path },
		httpResponse: {
			statusCode,
			headers: { 'Content-Type': ['application/json'] },
			body: JSON.stringify({ error: 'mocked poll failure' }),
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
	options?: {
		itemsAfterSeedPoll?: IDataObject[];
		errorAfterSeedPoll?: { statusCode: number };
	},
): Promise<{ workflowId: string; nodeId: string; path: string }> {
	const path = `/${nanoid()}`;
	const { itemsAfterSeedPoll, errorAfterSeedPoll } = options ?? {};

	await programPollResponse(
		proxy,
		path,
		SEED_POLL_ITEMS,
		(itemsAfterSeedPoll ?? errorAfterSeedPoll) && { remainingTimes: 1, unlimited: false },
	);
	if (itemsAfterSeedPoll) await programPollResponse(proxy, path, itemsAfterSeedPoll);
	if (errorAfterSeedPoll)
		await programPollErrorResponse(proxy, path, errorAfterSeedPoll.statusCode);

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

export async function triggerExecutionIds(
	api: ApiHelpers,
	workflowId: string,
): Promise<Set<string>> {
	const executions = await api.workflows.getExecutions(workflowId, 50);
	return new Set(
		executions.filter((execution) => execution.mode === 'trigger').map((execution) => execution.id),
	);
}

async function newTriggerExecutions(api: ApiHelpers, workflowId: string, known: Set<string>) {
	const executions = await api.workflows.getExecutions(workflowId, 50);
	return executions.filter((execution) => execution.mode === 'trigger' && !known.has(execution.id));
}

// Only an execution whose id is absent from `known` proves a fresh fire;
// `waitForExecution`'s recency fallback would otherwise re-match the
// activation-seed execution. Asserting exactly one new execution (not just
// that the first one succeeded) catches a cursor-commit race that re-emits
// an already-seen item alongside the genuinely new one.
export async function expectNewTriggerExecution(
	api: ApiHelpers,
	workflowId: string,
	known: Set<string>,
	options?: { timeoutMs?: number; expectedStatus?: 'success' | 'error' },
): Promise<void> {
	const { timeoutMs = 20_000, expectedStatus = 'success' } = options ?? {};

	await expect
		.poll(async () => (await newTriggerExecutions(api, workflowId, known)).length, {
			timeout: timeoutMs,
		})
		.toBeGreaterThan(0);

	// Give a straggler execution (e.g. a duplicate re-emit from a racing
	// cursor commit) a chance to land before asserting cardinality.
	await new Promise((resolve) => setTimeout(resolve, 500));
	const fresh = await newTriggerExecutions(api, workflowId, known);

	expect(fresh).toHaveLength(1);
	expect(fresh[0].status).toBe(expectedStatus);
}

export async function expectNoNewTriggerExecution(
	api: ApiHelpers,
	workflowId: string,
	known: Set<string>,
	windowMs = 8_000,
): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, windowMs));
	expect(await newTriggerExecutions(api, workflowId, known)).toHaveLength(0);
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

export async function clearStaticDataAndReactivate(
	api: ApiHelpers,
	workflowId: string,
): Promise<void> {
	await api.workflows.deactivate(workflowId);
	const workflow = await api.workflows.getWorkflow(workflowId);
	const updated = await api.workflows.update(workflowId, workflow.versionId!, { staticData: {} });
	await api.workflows.activate(workflowId, updated.versionId!);
}
