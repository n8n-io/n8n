import { expect, test } from '@playwright/test';
import { TEST_CONTAINER_IMAGES } from 'n8n-containers/test-containers';

import { assertContainerImage, assertN8nImage, runDeploymentCell } from './probe';
import { readBullJobCounter, readContainerLogsUntil } from './queue-cell-helpers';

test(
	'Queue mode (main + worker)',
	{
		tag: '@cell:LAY-03',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		await runDeploymentCell({
			stack: { workers: 1 },
			probe: async ({ stack, probe }) => {
				const bullJobCountBefore = await readBullJobCounter(stack);
				const webhook = await probe.runWebhook();
				const execution = await probe.readExecution(webhook.workflowId);
				const bullJobCountAfter = await readBullJobCounter(stack);
				return { webhook, execution, bullJobCountBefore, bullJobCountAfter };
			},
			check: async ({ stack, probeOutput }) => {
				assertN8nImage(stack);

				expect(
					stack.serviceResults.postgres,
					'Expected a PostgreSQL container in the stack',
				).toBeDefined();
				expect(stack.serviceResults.redis, 'Expected a Redis container in the stack').toBeDefined();

				expect(
					probeOutput.bullJobCountBefore,
					'Expected Redis Bull job counter before webhook probe',
				).not.toBeNull();
				expect(
					probeOutput.bullJobCountAfter,
					'Expected Redis Bull queue to record at least one enqueued job',
				).toBeGreaterThan(probeOutput.bullJobCountBefore ?? 0);

				const main = stack.findContainers(/-n8n(-main-1)?$/)[0];
				const worker = stack.findContainers(/-n8n-worker-1$/)[0];
				expect(main, 'Expected a main n8n container in the stack').toBeDefined();
				expect(worker, 'Expected a worker n8n container in the stack').toBeDefined();
				assertContainerImage(worker.getId(), TEST_CONTAINER_IMAGES.n8n, 'worker');

				const { executionId } = probeOutput.execution;
				const expectedEnqueuedLog = `Enqueued execution ${executionId}`;
				const expectedWorkerStartLog = `Worker started execution ${executionId}`;
				const expectedWorkerFinishLog = `Worker finished execution ${executionId}`;

				const mainLogs = await readContainerLogsUntil(main, [expectedEnqueuedLog]);
				expect(
					mainLogs,
					`Expected main logs to record enqueuing execution ${executionId}`,
				).toContain(expectedEnqueuedLog);

				const workerLogs = await readContainerLogsUntil(worker, [
					expectedWorkerStartLog,
					expectedWorkerFinishLog,
				]);
				expect(
					workerLogs,
					`Expected worker logs to record starting execution ${executionId}`,
				).toContain(expectedWorkerStartLog);
				expect(
					workerLogs,
					`Expected worker logs to record finishing execution ${executionId}`,
				).toContain(expectedWorkerFinishLog);
			},
		});
	},
);
