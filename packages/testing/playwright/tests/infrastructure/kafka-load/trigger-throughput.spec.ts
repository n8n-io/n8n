import type { MetricsHelper } from 'n8n-containers';
import { BASE_PERFORMANCE_PLANS } from 'n8n-containers/performance-plans';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import { preloadQueue, type PayloadSize } from '../../../utils/kafka-load-helper';
import {
	buildKafkaTriggeredWorkflow,
	type NodeOutputSize,
} from '../../../utils/kafka-workflow-builder';
import {
	waitForThroughput,
	getBaselineCounter,
	attachThroughputResults,
} from '../../../utils/throughput-helper';

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
	nodeOutputSize: NodeOutputSize;
	partitions: number;
	timeoutMs: number;
}

const SCENARIOS: ThroughputScenario[] = [
	{
		name: '1-node-1KB-1k',
		nodeCount: 1,
		messageCount: 1_000,
		payloadSize: '1KB',
		nodeOutputSize: 'noop',
		partitions: 3,
		timeoutMs: 120_000,
	},
	{
		name: '10-nodes-1KB-5k',
		nodeCount: 10,
		messageCount: 5_000,
		payloadSize: '1KB',
		nodeOutputSize: 'noop',
		partitions: 3,
		timeoutMs: 300_000,
	},
	{
		name: '30-nodes-1KB-5k',
		nodeCount: 30,
		messageCount: 5_000,
		payloadSize: '1KB',
		nodeOutputSize: 'noop',
		partitions: 3,
		timeoutMs: 300_000,
	},
	{
		name: '60-nodes-1KB-5k',
		nodeCount: 60,
		messageCount: 5_000,
		payloadSize: '1KB',
		nodeOutputSize: 'noop',
		partitions: 3,
		timeoutMs: 600_000,
	},
	{
		name: '10-nodes-100KB-noop-5k',
		nodeCount: 10,
		messageCount: 5_000,
		payloadSize: '100KB',
		nodeOutputSize: 'noop',
		partitions: 3,
		timeoutMs: 300_000,
	},
	{
		name: '10-nodes-1KB-10kb-out-5k',
		nodeCount: 10,
		messageCount: 5_000,
		payloadSize: '1KB',
		nodeOutputSize: '10KB',
		partitions: 3,
		timeoutMs: 300_000,
	},
	{
		name: '10-nodes-1KB-100kb-out-5k',
		nodeCount: 10,
		messageCount: 5_000,
		payloadSize: '1KB',
		nodeOutputSize: '100KB',
		partitions: 3,
		timeoutMs: 600_000,
	},
];

async function collectDiagnostics(metrics: MetricsHelper, durationMs: number) {
	const fmt = (v: number | undefined, unit = '') =>
		v !== undefined ? `${v.toFixed(2)}${unit}` : 'N/A';

	// Use the test duration (with padding) as the rate window so we capture
	// the full burst rather than just the tail end after completion.
	const windowSecs = Math.ceil(durationMs / 1000) + 30;
	const window = `${windowSecs}s`;

	// Try both with and without _total suffix — varies by exporter version
	const [eventLoopLag, pgTxA, pgTxB, pgInsA, pgInsB, pgActive] = await Promise.all([
		metrics.query('n8n_nodejs_eventloop_lag_seconds').catch(() => []),
		metrics.query(`rate(pg_stat_database_xact_commit_total[${window}])`).catch(() => []),
		metrics.query(`rate(pg_stat_database_xact_commit[${window}])`).catch(() => []),
		metrics.query(`rate(pg_stat_database_tup_inserted_total[${window}])`).catch(() => []),
		metrics.query(`rate(pg_stat_database_tup_inserted[${window}])`).catch(() => []),
		metrics.query('pg_stat_activity_count').catch(() => []),
	]);

	const pgTxRate = pgTxA.length > 0 ? pgTxA : pgTxB;
	const pgInsertRate = pgInsA.length > 0 ? pgInsA : pgInsB;

	return {
		eventLoopLag: fmt(eventLoopLag[0]?.value, 's'),
		pgTxRate: fmt(pgTxRate[0]?.value, ' tx/s'),
		pgInsertRate: fmt(pgInsertRate[0]?.value, ' rows/s'),
		pgActiveConnections: fmt(pgActive[0]?.value),
	};
}

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
					nodeOutputSize: scenario.nodeOutputSize,
				});

				const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
					workflowDef,
					{
						makeUnique: true,
					},
				);

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

				// 6. Activate workflow and wait for consumer group
				await api.workflows.activate(workflowId, createdWorkflow.versionId!);
				await kafka.waitForConsumerGroup(groupId, { timeoutMs: 30_000 });

				// 8. Wait for throughput
				// eslint-disable-next-line playwright/no-conditional-in-test
				const nodeLabel = scenario.nodeOutputSize === 'noop' ? 'noop' : scenario.nodeOutputSize;
				console.log(
					`[BENCH] Draining ${messageCount} messages through ${scenario.nodeCount}-node (${nodeLabel}) workflow (timeout: ${scenario.timeoutMs}ms)`,
				);
				const result = await waitForThroughput(obs.metrics, {
					expectedCount: messageCount,
					nodeCount: scenario.nodeCount,
					timeoutMs: scenario.timeoutMs,
					baselineValue: baselineCounter,
				});

				// 9. Attach results
				await attachThroughputResults(testInfo, scenario.name, result);

				// 10. Diagnostics — query PG and event loop metrics
				const diagnostics = await collectDiagnostics(obs.metrics, result.durationMs);
				console.log(
					`[DIAGNOSTICS] ${scenario.name}\n` +
						`  Event Loop Lag: ${diagnostics.eventLoopLag}\n` +
						`  PG Transactions/s: ${diagnostics.pgTxRate}\n` +
						`  PG Rows Inserted/s: ${diagnostics.pgInsertRate}\n` +
						`  PG Active Connections: ${diagnostics.pgActiveConnections}`,
				);

				// 11. Summary
				console.log(
					`[BENCH RESULT] ${scenario.name}\n` +
						`  Plan: enterprise (${plan.memory}GB RAM, ${plan.cpu} CPU)\n` +
						`  Nodes: ${scenario.nodeCount} (${nodeLabel}) | Messages: ${messageCount}\n` +
						`  Completed: ${result.totalCompleted}/${messageCount}\n` +
						`  Throughput: ${result.avgExecPerSec.toFixed(1)} exec/s | ${result.actionsPerSec.toFixed(1)} actions/s\n` +
						`  Peak: ${result.peakExecPerSec.toFixed(1)} exec/s | ${result.peakActionsPerSec.toFixed(1)} actions/s\n` +
						`  Duration: ${(result.durationMs / 1000).toFixed(1)}s`,
				);

				// 11. Assertions
				expect(result.totalCompleted).toBeGreaterThan(0);
				expect(result.totalCompleted).toBeGreaterThanOrEqual(Math.floor(messageCount * 0.95));

				// 12. Cleanup
				await api.workflows.deactivate(workflowId);
			});
		}
	},
);
