import { expect, test } from '@playwright/test';
import type { N8NStack } from 'n8n-containers/stack';
import { TEST_CONTAINER_IMAGES } from 'n8n-containers/test-containers';

import { assertContainerImage, assertN8nImage, runDeploymentCell } from './probe';
import { readBullJobCounter, readRedisServerInfo } from './queue-cell-helpers';

const EXPECTED_VALKEY_MAJOR = 9;

function requireRedisContainer(stack: N8NStack): N8NStack['containers'][number] {
	const redis = stack.serviceResults.redis?.container;
	if (!redis) {
		throw new Error('Expected a Valkey container in the stack');
	}
	return redis;
}

test(
	'Queue mode with Valkey',
	{
		tag: '@cell:DEP-06',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		await runDeploymentCell({
			stack: { workers: 1 },
			probe: async ({ stack, probe }) => {
				const bullJobCountBefore = await readBullJobCounter(stack);
				const webhook = await probe.runWebhook();
				const codeNodes = await probe.runCodeNodes();
				const bullJobCountAfter = await readBullJobCounter(stack);
				return { webhook, codeNodes, bullJobCountBefore, bullJobCountAfter };
			},
			check: async ({ stack, probeOutput }) => {
				assertN8nImage(stack);

				expect(
					stack.serviceResults.postgres,
					'Expected a PostgreSQL container in the stack',
				).toBeDefined();

				const worker = stack.findContainers(/-n8n-worker-1$/)[0];
				expect(worker, 'Expected a worker n8n container in the stack').toBeDefined();
				assertContainerImage(worker.getId(), TEST_CONTAINER_IMAGES.n8n, 'worker');

				const redisContainer = requireRedisContainer(stack);
				assertContainerImage(redisContainer.getId(), TEST_CONTAINER_IMAGES.redis, 'valkey');

				const serverInfo = await readRedisServerInfo(stack);
				expect(
					serverInfo.engine,
					`Expected INFO server engine to be "valkey", got "${serverInfo.engine}" (version: ${serverInfo.version}, image: ${TEST_CONTAINER_IMAGES.redis})`,
				).toBe('valkey');
				expect(
					serverInfo.fields.server_name,
					`Expected INFO server server_name to be "valkey", got "${serverInfo.fields.server_name ?? ''}" (image: ${TEST_CONTAINER_IMAGES.redis})`,
				).toBe('valkey');
				expect(
					serverInfo.majorVersion,
					`Expected Valkey major version ${EXPECTED_VALKEY_MAJOR}, got ${serverInfo.majorVersion} (version: ${serverInfo.version}, image: ${TEST_CONTAINER_IMAGES.redis})`,
				).toBe(EXPECTED_VALKEY_MAJOR);

				expect(
					probeOutput.codeNodes.js.responseBody,
					'Expected JavaScript Code node to complete through the worker',
				).toMatchObject({
					runtime: 'js',
					result: 42,
				});
				expect(
					probeOutput.bullJobCountBefore,
					'Expected Valkey Bull job counter before probes',
				).not.toBeNull();
				expect(
					probeOutput.bullJobCountAfter,
					'Expected Valkey Bull queue to record webhook and Code node jobs',
				).toBeGreaterThanOrEqual((probeOutput.bullJobCountBefore ?? 0) + 2);
			},
		});
	},
);
