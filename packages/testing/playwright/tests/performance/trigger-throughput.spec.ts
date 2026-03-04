import { nanoid } from 'nanoid';

import { test, expect } from '../../fixtures/base';
import { BASE_PERFORMANCE_PLANS } from 'n8n-containers/performance-plans';
import { preloadQueue, type PayloadSize } from '../../utils/kafka-load-helper';
import { buildKafkaTriggeredWorkflow } from '../../utils/kafka-workflow-builder';
import { attachMetric } from '../../utils/performance-helper';
import {
	waitForThroughput,
	getBaselineCounter,
	collectMemoryFromMetrics,
	attachThroughputResults,
} from '../../utils/throughput-helper';

const plan = BASE_PERFORMANCE_PLANS.enterprise;
const MESSAGE_COUNT = parseInt(process.env.BENCHMARK_MESSAGES ?? '0', 10);

test.use({
	capability: {
		services: ['kafka', 'victoriaLogs', 'victoriaMetrics', 'vector'],
		postgres: true,
		resourceQuota: { memory: plan.memory, cpu: plan.cpu },
		env: {
			N8N_METRICS_INCLUDE_MESSAGE_EVENT_BUS_METRICS: 'true',
		},
	},
});

interface ThroughputScenario {
	name: string;
	nodeCount: number;
	messageCount: number;
	payloadSize: PayloadSize;
	partitions: number;
	timeoutMs: number;
}

const SCENARIOS: ThroughputScenario[] = [
	{
		name: 'kafka-1node-1k',
		nodeCount: 1,
		messageCount: 1_000,
		payloadSize: '1KB',
		partitions: 3,
		timeoutMs: 120_000,
	},
	{
		name: 'kafka-10nodes-5k',
		nodeCount: 10,
		messageCount: 5_000,
		payloadSize: '1KB',
		partitions: 3,
		timeoutMs: 300_000,
	},
	{
		name: 'kafka-30nodes-5k',
		nodeCount: 30,
		messageCount: 5_000,
		payloadSize: '1KB',
		partitions: 3,
		timeoutMs: 300_000,
	},
	{
		name: 'kafka-60nodes-5k',
		nodeCount: 60,
		messageCount: 5_000,
		payloadSize: '1KB',
		partitions: 3,
		timeoutMs: 600_000,
	},
];

test.describe(
	'Trigger Throughput Benchmarks @capability:kafka @capability:observability @mode:postgres',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		for (const scenario of SCENARIOS) {
			const messageCount = MESSAGE_COUNT || scenario.messageCount;

			test(`${scenario.name}`, async ({ api, services }, testInfo) => {
				test.setTimeout(scenario.timeoutMs + 120_000);

				const kafka = services.kafka;
				const obs = services.observability;
				const topic = `bench-${scenario.name}-${nanoid()}`;
				const groupId = `bench-group-${nanoid()}`;

				// 1. Create topic
				await kafka.createTopic(topic, scenario.partitions);

				// 2. Create credential
				const credential = await api.credentials.createCredential({
					name: `Kafka Bench ${nanoid()}`,
					type: 'kafka',
					data: {
						brokers: 'kafka:9092',
						clientId: `bench-${nanoid()}`,
						ssl: false,
						authentication: false,
					},
				});

				// 3. Build and create workflow
				const workflowDef = buildKafkaTriggeredWorkflow({
					topic,
					groupId,
					credentialId: credential.id,
					credentialName: credential.name,
					nodeCount: scenario.nodeCount,
				});

				const { workflowId, createdWorkflow } =
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					await api.workflows.createWorkflowFromDefinition(workflowDef as any, {
						makeUnique: true,
					});

				// 4. Preload queue
				const publishResult = await preloadQueue(kafka, topic, {
					messageCount,
					payloadSize: scenario.payloadSize,
				});
				console.log(
					`[BENCH] Preloaded ${publishResult.totalPublished} messages in ${publishResult.publishDurationMs}ms`,
				);

				// 5. Wait for VictoriaMetrics to be scraping n8n, then record baseline
				// We check for a default metric (always present) rather than the success counter
				// which only appears after the first workflow completes.
				await obs.metrics.waitForMetric('n8n_version_info', {
					timeoutMs: 30_000,
					intervalMs: 2000,
					predicate: (results) => results.length > 0,
				});
				const baselineCounter = await getBaselineCounter(obs.metrics);

				// 6. Collect baseline memory
				const memBefore = await collectMemoryFromMetrics(obs.metrics);

				// 7. Activate workflow and wait for consumer group
				await api.workflows.activate(workflowId, createdWorkflow.versionId!);
				await kafka.waitForConsumerGroup(groupId, { timeoutMs: 30_000 });

				// 8. Wait for throughput
				console.log(
					`[BENCH] Draining ${messageCount} messages through ${scenario.nodeCount}-node workflow (timeout: ${scenario.timeoutMs}ms)`,
				);
				const result = await waitForThroughput(obs.metrics, {
					expectedCount: messageCount,
					nodeCount: scenario.nodeCount,
					timeoutMs: scenario.timeoutMs,
					baselineValue: baselineCounter,
				});

				// 9. Collect final memory
				const memAfter = await collectMemoryFromMetrics(obs.metrics);

				// 10. Attach results
				await attachThroughputResults(testInfo, scenario.name, result, memAfter);
				await attachMetric(
					testInfo,
					`${scenario.name}-memory-delta`,
					memAfter.heapUsedMB - memBefore.heapUsedMB,
					'MB',
				);

				// 11. Summary
				console.log(
					`[BENCH RESULT] ${scenario.name}\n` +
						`  Plan: enterprise (${plan.memory}GB RAM, ${plan.cpu} CPU)\n` +
						`  Nodes: ${scenario.nodeCount} | Messages: ${messageCount}\n` +
						`  Completed: ${result.totalCompleted}/${messageCount}\n` +
						`  Throughput: ${result.avgExecPerSec.toFixed(1)} exec/s | ${result.actionsPerSec.toFixed(1)} actions/s\n` +
						`  Peak: ${result.peakExecPerSec.toFixed(1)} exec/s | ${result.peakActionsPerSec.toFixed(1)} actions/s\n` +
						`  Duration: ${(result.durationMs / 1000).toFixed(1)}s\n` +
						`  Memory: heap=${memAfter.heapUsedMB.toFixed(1)}MB rss=${memAfter.rssMB.toFixed(1)}MB ` +
						`delta=${(memAfter.heapUsedMB - memBefore.heapUsedMB).toFixed(1)}MB`,
				);

				// 12. Assertions
				expect(result.totalCompleted).toBeGreaterThan(0);
				expect(result.totalCompleted).toBeGreaterThanOrEqual(Math.floor(messageCount * 0.95));

				// 13. Cleanup
				await api.workflows.deactivate(workflowId);
			});
		}
	},
);
