import { workflow, trigger, node } from '@n8n/workflow-sdk';
import flatted from 'flatted';
import { nanoid } from 'nanoid';
import type { IRunExecutionData, IWorkflowBase } from 'n8n-workflow';

import {
	expectNewTriggerExecution,
	fetchTriggerExecutionIds,
	programPollResponse,
	readNodeStaticData,
} from './poll-trigger-helpers';
import { test, expect } from '../../../fixtures/base';

const TRIGGER_NODE_NAME = 'E2E Test Declarative Polling Trigger';

// Durable scheduler without durable cursors: the cursor stays in the workflow static data.
test.use({
	capability: {
		services: ['proxy'],
		env: {
			N8N_SCHEDULER_ENABLED: 'true',
			N8N_USE_WORKFLOW_PUBLICATION_SERVICE: 'true',
			N8N_SCHEDULER_POLL_TRIGGERS_ENABLED: 'true',
			N8N_SCHEDULER_MATERIALIZATION_INTERVAL: '1',
			N8N_SCHEDULER_EXECUTOR_INTERVAL: '1',
		},
	},
});

const makeWorkflow = (path: string) =>
	workflow(nanoid(), `Declarative Poll Trigger Test ${nanoid()}`).add(
		trigger({
			type: 'n8n-nodes-base.e2eTestDeclarativePollingTrigger',
			version: 1,
			config: {
				name: TRIGGER_NODE_NAME,
				parameters: {
					url: `http://e2e-poll-test.local${path}`,
					pollTimes: { item: [{ mode: 'everyMinute' }] },
				},
			},
		}).to(node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'NoOp' } })),
	);

test.describe(
	'Declarative Poll Trigger',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('should store a starting cursor on activation, then emit only newer items', async ({
			api,
			services,
		}) => {
			const path = `/${nanoid()}`;
			await programPollResponse(services.proxy, path, [{ id: 1 }, { id: 2 }], {
				remainingTimes: 1,
				unlimited: false,
			});
			await programPollResponse(services.proxy, path, [{ id: 2 }, { id: 3 }]);

			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				makeWorkflow(path).toJSON() as IWorkflowBase,
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			// The activation poll only stores the cursor and starts no execution.
			await expect
				.poll(async () => await readNodeStaticData(api, workflowId, TRIGGER_NODE_NAME), {
					timeout: 15_000,
				})
				.toEqual({ cursor: { value: 2 } });
			const afterActivation = await fetchTriggerExecutionIds(api, workflowId);
			expect(afterActivation.size).toBe(0);

			const triggerNode = createdWorkflow.nodes.find((n) => n.name === TRIGGER_NODE_NAME)!;
			await api.fireScheduledJobsNow(workflowId, triggerNode.id);
			await expectNewTriggerExecution(api, workflowId, afterActivation);

			// The request sends the stored cursor, and the trigger emits only the newer item.
			expect(
				await services.proxy.wasRequestMade({
					method: 'GET',
					path,
					queryStringParameters: { since: ['2'] },
				}),
			).toBe(true);
			const [executionId] = await fetchTriggerExecutionIds(api, workflowId);
			const execution = await api.workflows.getExecution(executionId, {
				redactExecutionData: false,
			});
			const data = flatted.parse(execution.data) as IRunExecutionData;
			const emitted = data.resultData.runData[TRIGGER_NODE_NAME][0].data?.main[0];
			expect(emitted?.map((item) => item.json)).toEqual([{ id: 3 }]);

			await expect
				.poll(async () => await readNodeStaticData(api, workflowId, TRIGGER_NODE_NAME), {
					timeout: 15_000,
				})
				.toEqual({ cursor: { value: 3 } });
		});
	},
);
