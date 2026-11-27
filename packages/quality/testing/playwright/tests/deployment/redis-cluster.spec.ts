import { expect, test } from '@playwright/test';
import {
	isClusterInfoHealthy,
	isClusterTopologyComplete,
	type RedisClusterHelper,
} from 'n8n-containers';
import { TEST_CONTAINER_IMAGES } from 'n8n-containers/test-containers';

import { assertContainerImage, assertN8nImage, runDeploymentCell } from './probe';
import { readContainerLogsUntil } from './queue-cell-helpers';

const EXPECTED_CLUSTER_NODES = 3;
const EXPECTED_CLUSTER_SLOTS = 16384;
const BULL_CLUSTER_JOB_COUNTER_KEY = '{bull}:jobs:id';
const BULL_STANDALONE_JOB_COUNTER_KEY = 'bull:jobs:id';

async function assertRedisClusterStateAndRouting(
	cluster: RedisClusterHelper,
	expectedNodeCount: number,
	expectedBullJobCount: number,
): Promise<void> {
	const nodeInfos = await cluster.getAllNodeClusterInfo();
	expect(
		nodeInfos,
		`Expected CLUSTER INFO from ${expectedNodeCount} Redis Cluster nodes`,
	).toHaveLength(expectedNodeCount);

	for (const { node, info } of nodeInfos) {
		expect(
			isClusterInfoHealthy(info, expectedNodeCount),
			`Expected ${node.alias} to report healthy cluster state (state=${info.clusterState}, slots_assigned=${info.clusterSlotsAssigned}, slots_ok=${info.clusterSlotsOk}, known_nodes=${info.clusterKnownNodes}, size=${info.clusterSize})`,
		).toBe(true);
		expect(info.clusterSlotsAssigned).toBe(EXPECTED_CLUSTER_SLOTS);
		expect(info.clusterSize).toBe(expectedNodeCount);
	}

	const slotRanges = await cluster.getClusterSlots();
	expect(
		isClusterTopologyComplete(slotRanges, expectedNodeCount),
		`Expected CLUSTER SLOTS to cover all ${EXPECTED_CLUSTER_SLOTS} slots across ${expectedNodeCount} primaries`,
	).toBe(true);

	const routing = await cluster.verifySlotRouting(BULL_CLUSTER_JOB_COUNTER_KEY);
	expect(
		routing.movedRedirect,
		`Expected non-owner node ${routing.nonOwnerNode.alias} to redirect ${BULL_CLUSTER_JOB_COUNTER_KEY} (slot ${routing.slot}) to ${routing.ownerNode.ip}:${routing.ownerNode.internalPort}`,
	).toEqual({
		slot: routing.slot,
		host: routing.ownerNode.ip,
		port: routing.ownerNode.internalPort,
	});
	expect(
		routing.ownerValue,
		`Expected owning primary ${routing.ownerNode.alias} to store ${BULL_CLUSTER_JOB_COUNTER_KEY}`,
	).toBe(String(expectedBullJobCount));
	expect(
		routing.routedValue,
		`Expected cluster client seeded from non-owner ${routing.nonOwnerNode.alias} to route ${BULL_CLUSTER_JOB_COUNTER_KEY} to ${routing.ownerNode.alias}`,
	).toBe(String(expectedBullJobCount));
}

test(
	'Queue mode with Redis Cluster',
	{
		tag: '@cell:ENV-16',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		await runDeploymentCell({
			stack: {
				workers: 1,
				services: ['redisCluster'],
			},
			probe: async ({ stack, probe }) => {
				const bullJobCountBefore = await stack.services.redisCluster.readBullJobCounter();
				const webhook = await probe.runWebhook();
				const execution = await probe.readExecution(webhook.workflowId);
				const bullJobCountAfter = await stack.services.redisCluster.readBullJobCounter();
				return { webhook, execution, bullJobCountBefore, bullJobCountAfter };
			},
			check: async ({ stack, probeOutput }) => {
				assertN8nImage(stack);

				expect(
					stack.serviceResults.postgres,
					'Expected a PostgreSQL container in the stack',
				).toBeDefined();
				expect(
					stack.serviceResults.redis,
					'Expected standalone Redis container not to start when redisCluster is enabled',
				).toBeUndefined();
				expect(
					stack.serviceResults.redisCluster,
					'Expected a Redis Cluster service in the stack',
				).toBeDefined();

				const clusterContainers = stack.findContainers(/-redis-cluster-\d+$/);
				expect(
					clusterContainers,
					`Expected ${EXPECTED_CLUSTER_NODES} Redis Cluster node containers`,
				).toHaveLength(EXPECTED_CLUSTER_NODES);
				for (const container of clusterContainers) {
					assertContainerImage(container.getId(), TEST_CONTAINER_IMAGES.redis, 'redis-cluster');
				}

				expect(
					probeOutput.bullJobCountAfter,
					'Expected Redis Cluster Bull job counter ({bull}:jobs:id) to advance after webhook execution',
				).toBeGreaterThan(probeOutput.bullJobCountBefore);

				await assertRedisClusterStateAndRouting(
					stack.services.redisCluster,
					EXPECTED_CLUSTER_NODES,
					probeOutput.bullJobCountAfter,
				);

				expect(
					await stack.services.redisCluster.get(BULL_STANDALONE_JOB_COUNTER_KEY),
					'Expected n8n to use hash-tagged {bull} keys instead of standalone bull keys',
				).toBeNull();

				const main = stack.findContainers(/-n8n(-main-1)?$/)[0];
				const worker = stack.findContainers(/-n8n-worker-1$/)[0];
				expect(main, 'Expected a main n8n container in the stack').toBeDefined();
				expect(worker, 'Expected a worker n8n container in the stack').toBeDefined();
				assertContainerImage(worker.getId(), TEST_CONTAINER_IMAGES.n8n, 'worker');

				const { executionId } = probeOutput.execution;
				const expectedClusterClientLog = 'Started Redis cluster client';
				const expectedEnqueuedLog = `Enqueued execution ${executionId}`;
				const expectedWorkerStartLog = `Worker started execution ${executionId}`;
				const expectedWorkerFinishLog = `Worker finished execution ${executionId}`;

				const mainLogs = await readContainerLogsUntil(main, [
					expectedClusterClientLog,
					expectedEnqueuedLog,
				]);
				expect(
					mainLogs,
					'Expected main logs to confirm connecting with Redis cluster client',
				).toContain(expectedClusterClientLog);
				expect(
					mainLogs,
					`Expected main logs to record enqueuing execution ${executionId}`,
				).toContain(expectedEnqueuedLog);

				const workerLogs = await readContainerLogsUntil(worker, [
					expectedClusterClientLog,
					expectedWorkerStartLog,
					expectedWorkerFinishLog,
				]);
				expect(
					workerLogs,
					'Expected worker logs to confirm connecting with Redis cluster client',
				).toContain(expectedClusterClientLog);
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
