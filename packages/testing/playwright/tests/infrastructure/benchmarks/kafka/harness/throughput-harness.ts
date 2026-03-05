import type { MetricsHelper } from 'n8n-containers';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../../../fixtures/base';
import { preloadQueue } from '../../../../../utils/kafka-load-helper';
import { buildKafkaTriggeredWorkflow } from '../../../../../utils/kafka-workflow-builder';
import {
	waitForThroughput,
	getBaselineCounter,
	attachThroughputResults,
	WORKFLOW_SUCCESS_QUERY,
} from '../../../../../utils/throughput-helper';
import { THROUGHPUT_SCENARIOS } from '../scenarios/throughput-scenarios';

export interface ThroughputConfig {
	plan: { memory: number; cpu: number };
	messageCountOverride?: number;
	pollIntervalMs?: number;
}

interface ProfileInfo {
	name: string;
	workers: number;
	resourceSummary: string;
}

function deriveProfile(
	testInfo: { project: { name: string; use: Record<string, unknown> } },
	plan: { memory: number; cpu: number },
): ProfileInfo {
	const name = testInfo.project.name.replace(':infrastructure', '').replace('benchmark-', '');
	const workers =
		(testInfo.project.use as { containerConfig?: { workers?: number } }).containerConfig?.workers ??
		0;

	const resourceSummary =
		workers > 0
			? `  Mode: queue (1 main + ${workers} workers)\n` +
				`  Plan: enterprise (${plan.memory}GB RAM, ${plan.cpu} CPU per container, ` +
				`${1 + workers} containers = ${(plan.memory * (1 + workers)).toFixed(1)}GB total)`
			: `  Plan: enterprise (${plan.memory}GB RAM, ${plan.cpu} CPU)`;

	return { name, workers, resourceSummary };
}

async function collectDiagnostics(metrics: MetricsHelper, durationMs: number) {
	const fmt = (v: number | undefined, unit = '') =>
		v !== undefined ? `${v.toFixed(2)}${unit}` : 'N/A';

	const windowSecs = Math.ceil(durationMs / 1000) + 30;
	const window = `${windowSecs}s`;

	const db = 'n8n_db';
	const [
		eventLoopLag,
		pgTxA,
		pgTxB,
		pgInsA,
		pgInsB,
		pgActive,
		queueWaiting,
		queueActive,
		queueCompletedRate,
		queueFailedRate,
	] = await Promise.all([
		metrics.query('n8n_nodejs_eventloop_lag_seconds').catch(() => []),
		metrics
			.query(`rate(pg_stat_database_xact_commit_total{datname="${db}"}[${window}])`)
			.catch(() => []),
		metrics.query(`rate(pg_stat_database_xact_commit{datname="${db}"}[${window}])`).catch(() => []),
		metrics
			.query(`rate(pg_stat_database_tup_inserted_total{datname="${db}"}[${window}])`)
			.catch(() => []),
		metrics
			.query(`rate(pg_stat_database_tup_inserted{datname="${db}"}[${window}])`)
			.catch(() => []),
		metrics.query(`pg_stat_activity_count{datname="${db}"}`).catch(() => []),
		metrics.query('n8n_scaling_mode_queue_jobs_waiting').catch(() => []),
		metrics.query('n8n_scaling_mode_queue_jobs_active').catch(() => []),
		metrics.query(`rate(n8n_scaling_mode_queue_jobs_completed[${window}])`).catch(() => []),
		metrics.query(`rate(n8n_scaling_mode_queue_jobs_failed[${window}])`).catch(() => []),
	]);

	const pgTxRate = pgTxA.length > 0 ? pgTxA : pgTxB;
	const pgInsertRate = pgInsA.length > 0 ? pgInsA : pgInsB;

	return {
		eventLoopLag: fmt(eventLoopLag[0]?.value, 's'),
		pgTxRate: fmt(pgTxRate[0]?.value, ' tx/s'),
		pgInsertRate: fmt(pgInsertRate[0]?.value, ' rows/s'),
		pgActiveConnections: fmt(pgActive[0]?.value),
		queueWaiting: fmt(queueWaiting[0]?.value),
		queueActive: fmt(queueActive[0]?.value),
		queueCompletedRate: fmt(queueCompletedRate[0]?.value, ' jobs/s'),
		queueFailedRate: fmt(queueFailedRate[0]?.value, ' jobs/s'),
	};
}

export function registerThroughputTests(config: ThroughputConfig) {
	const { plan, messageCountOverride = 0, pollIntervalMs } = config;

	test.describe(
		'Throughput Benchmarks @benchmark',
		{
			annotation: [{ type: 'owner', description: 'Catalysts' }],
		},
		() => {
			for (const scenario of THROUGHPUT_SCENARIOS) {
				const messageCount = messageCountOverride || scenario.messageCount;

				// eslint-disable-next-line playwright/valid-title
				test(scenario.name, async ({ api, services }, testInfo) => {
					const profile = deriveProfile(testInfo, plan);

					test.setTimeout(scenario.timeoutMs + 120_000);

					const kafka = services.kafka;
					const obs = services.observability;
					const topic = `bench-${profile.name}-${scenario.name}-${nanoid()}`;
					const groupId = `bench-group-${nanoid()}`;

					// 1. Create topic
					await kafka.createTopic(topic, scenario.partitions);

					// 2. Create credential
					const credential = await api.credentials.createCredential({
						name: `Kafka Bench ${profile.name} ${nanoid()}`,
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
						`[BENCH-${profile.name}] Preloaded ${publishResult.totalPublished} messages in ${publishResult.publishDurationMs}ms`,
					);

					// 5. Wait for VictoriaMetrics to be scraping n8n, then record baseline
					await obs.metrics.waitForMetric('n8n_version_info', {
						timeoutMs: 30_000,
						intervalMs: 2000,
						predicate: (results) => results.length > 0,
					});
					const baselineCounter = await getBaselineCounter(obs.metrics, WORKFLOW_SUCCESS_QUERY);

					// 6. Activate workflow and wait for consumer group
					await api.workflows.activate(workflowId, createdWorkflow.versionId!);
					await kafka.waitForConsumerGroup(groupId, { timeoutMs: 30_000 });

					// 7. Wait for throughput
					console.log(
						`[BENCH-${profile.name}] Draining ${messageCount} messages through ${scenario.nodeCount}-node (${scenario.nodeOutputSize}) workflow (timeout: ${scenario.timeoutMs}ms)`,
					);
					const result = await waitForThroughput(obs.metrics, {
						expectedCount: messageCount,
						nodeCount: scenario.nodeCount,
						timeoutMs: scenario.timeoutMs,
						baselineValue: baselineCounter,
						metricQuery: WORKFLOW_SUCCESS_QUERY,
						pollIntervalMs,
					});

					// 8. Attach results (use scenario.name as label so the benchmark-summary-reporter
					// can extract metrics via extractMetricSuffix which strips the test title prefix)
					await attachThroughputResults(testInfo, scenario.name, result);

					// 9. Diagnostics
					const diagnostics = await collectDiagnostics(obs.metrics, result.durationMs);
					console.log(
						`[DIAG-${profile.name}] ${scenario.name}\n` +
							`  Event Loop Lag: ${diagnostics.eventLoopLag}\n` +
							`  PG Transactions/s: ${diagnostics.pgTxRate}\n` +
							`  PG Rows Inserted/s: ${diagnostics.pgInsertRate}\n` +
							`  PG Active Connections: ${diagnostics.pgActiveConnections}\n` +
							`  Queue Waiting: ${diagnostics.queueWaiting}\n` +
							`  Queue Active: ${diagnostics.queueActive}\n` +
							`  Queue Completed/s: ${diagnostics.queueCompletedRate}\n` +
							`  Queue Failed/s: ${diagnostics.queueFailedRate}`,
					);

					// 10. Summary
					console.log(
						`[BENCH-${profile.name} RESULT] ${profile.name}-${scenario.name}\n` +
							`  Profile: ${profile.name}\n` +
							`${profile.resourceSummary}\n` +
							`  Nodes: ${scenario.nodeCount} (${scenario.nodeOutputSize}) | Messages: ${messageCount}\n` +
							`  Completed: ${result.totalCompleted}/${messageCount}\n` +
							`  Throughput: ${result.avgExecPerSec.toFixed(1)} exec/s | ${result.actionsPerSec.toFixed(1)} actions/s\n` +
							`  Peak: ${result.peakExecPerSec.toFixed(1)} exec/s | ${result.peakActionsPerSec.toFixed(1)} actions/s\n` +
							`  Duration: ${(result.durationMs / 1000).toFixed(1)}s`,
					);

					// 11. Assertions
					expect(result.totalCompleted).toBeGreaterThan(0);
					expect(result.totalCompleted).toBeGreaterThanOrEqual(Math.floor(messageCount * 0.8));

					// 12. Cleanup
					await api.workflows.deactivate(workflowId);
				});
			}
		},
	);
}
