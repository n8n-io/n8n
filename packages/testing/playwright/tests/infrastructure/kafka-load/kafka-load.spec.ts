import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import {
	publishAtRate,
	preloadQueue,
	waitForExecutions,
	attachLoadTestResults,
	type PayloadSize,
} from '../../../utils/kafka-load-helper';
import { buildKafkaTriggeredWorkflow } from '../../../utils/kafka-workflow-builder';
import { attachMetric, collectMemorySnapshot } from '../../../utils/performance-helper';

// Resource profile: override via env for different hardware profiles
const RESOURCE_MEMORY = parseFloat(process.env.KAFKA_LOAD_MEMORY ?? '2');
const RESOURCE_CPU = parseFloat(process.env.KAFKA_LOAD_CPU ?? '2');

test.use({
	capability: {
		services: ['kafka', 'victoriaLogs', 'victoriaMetrics', 'vector'],
		postgres: true,
		resourceQuota: { memory: RESOURCE_MEMORY, cpu: RESOURCE_CPU },
	},
});

interface LoadScenario {
	name: string;
	nodeCount: number;
	payloadSize: PayloadSize;
	loadType: 'steady' | 'preloaded';
	ratePerSecond?: number;
	durationSeconds?: number;
	messageCount?: number;
	partitions?: number;
	timeoutMs: number;
}

const SCENARIOS: LoadScenario[] = [
	// Baseline: small workflow, small messages, low rate
	{
		name: '10-nodes-1KB-10mps',
		nodeCount: 10,
		payloadSize: '1KB',
		loadType: 'steady',
		ratePerSecond: 10,
		durationSeconds: 30,
		timeoutMs: 120_000,
	},
	// Medium workflow, medium messages, higher rate
	{
		name: '30-nodes-10KB-100mps',
		nodeCount: 30,
		payloadSize: '10KB',
		loadType: 'steady',
		ratePerSecond: 100,
		durationSeconds: 30,
		timeoutMs: 300_000,
	},
	// Large workflow, small messages, burst from preloaded queue
	{
		name: '60-nodes-1KB-preload-10k',
		nodeCount: 60,
		payloadSize: '1KB',
		loadType: 'preloaded',
		messageCount: 10_000,
		partitions: 3,
		timeoutMs: 600_000,
	},
	// Large messages stress test
	{
		name: '10-nodes-100KB-10mps',
		nodeCount: 10,
		payloadSize: '100KB',
		loadType: 'steady',
		ratePerSecond: 10,
		durationSeconds: 30,
		timeoutMs: 300_000,
	},
];

test.describe(
	'Kafka Load Tests @mode:postgres @capability:kafka @capability:observability @kafka-load',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		for (const scenario of SCENARIOS) {
			test(`${scenario.name}`, async ({ api, services }, testInfo) => {
				test.setTimeout(scenario.timeoutMs + 120_000);

				const kafka = services.kafka;
				const obs = services.observability;
				const topic = `load-${scenario.name}-${nanoid()}`;
				const groupId = `load-group-${nanoid()}`;

				// Setup: create topic and credential
				await kafka.createTopic(topic, scenario.partitions ?? 1);

				const credential = await api.credentials.createCredential({
					name: `Kafka Load ${nanoid()}`,
					type: 'kafka',
					data: {
						brokers: 'kafka:9092',
						clientId: `load-${nanoid()}`,
						ssl: false,
						authentication: false,
					},
				});

				// Build and create workflow
				const workflowDef = buildKafkaTriggeredWorkflow({
					topic,
					groupId,
					credentialId: credential.id,
					credentialName: credential.name,
					nodeCount: scenario.nodeCount,
				});

				const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
					workflowDef,
					{
						makeUnique: true,
					},
				);

				// Baseline memory
				const memBefore = await collectMemorySnapshot(obs.metrics);
				console.log(
					`[LOAD] Baseline: heap=${memBefore.heapUsedMB.toFixed(1)}MB rss=${memBefore.rssMB.toFixed(1)}MB`,
				);

				let expectedExecutions: number;

				if (scenario.loadType === 'preloaded') {
					// Preloaded: publish all messages before activating
					const publishResult = await preloadQueue(kafka, topic, {
						messageCount: scenario.messageCount!,
						payloadSize: scenario.payloadSize,
					});
					console.log(
						`[LOAD] Preloaded ${publishResult.totalPublished} messages in ${publishResult.publishDurationMs}ms`,
					);
					expectedExecutions = scenario.messageCount!;

					await api.workflows.activate(workflowId, createdWorkflow.versionId!);
					await kafka.waitForConsumerGroup(groupId, { timeoutMs: 30_000 });
				} else {
					// Steady: activate first, then publish at rate
					await api.workflows.activate(workflowId, createdWorkflow.versionId!);
					await kafka.waitForConsumerGroup(groupId, { timeoutMs: 30_000 });

					const publishResult = await publishAtRate(kafka, topic, {
						ratePerSecond: scenario.ratePerSecond!,
						durationSeconds: scenario.durationSeconds!,
						payloadSize: scenario.payloadSize,
					});
					console.log(
						`[LOAD] Published ${publishResult.totalPublished} messages in ${publishResult.actualDurationMs}ms`,
					);
					expectedExecutions = publishResult.totalPublished;
				}

				// Wait for executions
				console.log(
					`[LOAD] Waiting for ${expectedExecutions} executions (timeout: ${scenario.timeoutMs}ms)`,
				);
				const metrics = await waitForExecutions(api.workflows, workflowId, kafka, {
					expectedCount: expectedExecutions,
					groupId,
					topic,
					timeoutMs: scenario.timeoutMs,
				});

				// Final memory
				const memAfter = await collectMemorySnapshot(obs.metrics);

				// Attach results
				await attachLoadTestResults(testInfo, scenario.name, metrics, memAfter);
				await attachMetric(
					testInfo,
					`${scenario.name}-memory-delta`,
					memAfter.heapUsedMB - memBefore.heapUsedMB,
					'MB',
				);

				// Summary
				console.log(
					`[LOAD RESULT] ${scenario.name}\n` +
						`  Resources: ${RESOURCE_MEMORY}GB RAM, ${RESOURCE_CPU} CPU\n` +
						`  Completed: ${metrics.totalCompleted}/${expectedExecutions}\n` +
						`  Errors: ${metrics.totalErrors}\n` +
						`  Throughput: ${metrics.throughputPerSecond.toFixed(2)} exec/s\n` +
						`  Duration avg: ${metrics.avgDurationMs.toFixed(0)}ms | ` +
						`p50: ${metrics.p50DurationMs.toFixed(0)}ms | ` +
						`p95: ${metrics.p95DurationMs.toFixed(0)}ms | ` +
						`p99: ${metrics.p99DurationMs.toFixed(0)}ms\n` +
						`  Memory: heap=${memAfter.heapUsedMB.toFixed(1)}MB rss=${memAfter.rssMB.toFixed(1)}MB ` +
						`delta=${(memAfter.heapUsedMB - memBefore.heapUsedMB).toFixed(1)}MB`,
				);

				// Soft assertions - at least some executions should complete
				expect(metrics.totalCompleted).toBeGreaterThan(0);
				expect(metrics.totalCompleted).toBeGreaterThanOrEqual(Math.floor(expectedExecutions * 0.5));

				// Cleanup
				await api.workflows.deactivate(workflowId);
			});
		}
	},
);
