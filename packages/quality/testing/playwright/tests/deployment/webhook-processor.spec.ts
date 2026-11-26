import { expect, test } from '@playwright/test';
import { TEST_CONTAINER_IMAGES } from 'n8n-containers/test-containers';

import { assertContainerImage, assertN8nImage, runDeploymentCell } from './probe';
import { readContainerLogsSnapshot, readContainerLogsUntil } from './queue-cell-helpers';

test(
	'Dedicated webhook processor',
	{
		tag: '@cell:LAY-05',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		await runDeploymentCell({
			stack: { workers: 1, webhooks: 1 },
			probe: async ({ probe }) => {
				const webhook = await probe.runWebhook();
				const execution = await probe.readExecution(webhook.workflowId);
				return { webhook, execution };
			},
			check: async ({ stack, probeOutput }) => {
				assertN8nImage(stack);

				expect(
					stack.serviceResults.loadBalancer,
					'Expected a Caddy load balancer container in the stack',
				).toBeDefined();
				expect(
					stack.serviceResults.postgres,
					'Expected a PostgreSQL container in the stack',
				).toBeDefined();
				expect(stack.serviceResults.redis, 'Expected a Redis container in the stack').toBeDefined();

				const main = stack.findContainers(/-n8n(-main-1)?$/)[0];
				const webhookProcessor = stack.findContainers(/-n8n-webhook-1$/)[0];
				const worker = stack.findContainers(/-n8n-worker-1$/)[0];
				expect(main, 'Expected a main n8n container in the stack').toBeDefined();
				expect(
					webhookProcessor,
					'Expected a webhook processor n8n container in the stack',
				).toBeDefined();
				expect(worker, 'Expected a worker n8n container in the stack').toBeDefined();

				assertContainerImage(
					webhookProcessor.getId(),
					TEST_CONTAINER_IMAGES.n8n,
					'webhook-processor',
				);
				assertContainerImage(worker.getId(), TEST_CONTAINER_IMAGES.n8n, 'worker');

				const { webhookPath } = probeOutput.webhook;
				const { executionId } = probeOutput.execution;
				const expectedWebhookLog = `Received webhook "GET" for path "${webhookPath}"`;
				const expectedEnqueuedLog = `Enqueued execution ${executionId}`;
				const expectedWorkerStartLog = `Worker started execution ${executionId}`;
				const expectedWorkerFinishLog = `Worker finished execution ${executionId}`;

				const webhookProcessorLogs = await readContainerLogsUntil(webhookProcessor, [
					expectedWebhookLog,
					expectedEnqueuedLog,
				]);
				expect(
					webhookProcessorLogs,
					`Expected webhook processor logs to record receiving webhook path "${webhookPath}"`,
				).toContain(expectedWebhookLog);
				expect(
					webhookProcessorLogs,
					`Expected webhook processor logs to record enqueuing execution ${executionId}`,
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

				const mainLogs = await readContainerLogsSnapshot(main);
				expect(
					mainLogs,
					`Expected main container not to receive production webhook path "${webhookPath}"`,
				).not.toContain(expectedWebhookLog);
				expect(
					mainLogs,
					`Expected main container not to enqueue execution ${executionId}`,
				).not.toContain(expectedEnqueuedLog);
			},
		});
	},
);
