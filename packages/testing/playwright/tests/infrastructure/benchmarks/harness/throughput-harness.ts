import { expect } from '@playwright/test';
import type { TestInfo } from '@playwright/test';
import type { ServiceHelpers } from 'n8n-containers/services/types';

import type { ApiHelpers } from '../../../../services/api-helper';
import {
	waitForThroughput,
	getBaselineCounter,
	attachThroughputResults,
	sampleExecutionDurations,
	buildMetrics,
	collectDiagnostics,
	attachDiagnostics,
	formatDiagnosticValue,
	resolveMetricQuery,
} from '../../../../utils/benchmark';
import type { TriggerHandle, NodeOutputSize } from '../../../../utils/benchmark';
import { attachMetric } from '../../../../utils/performance-helper';

export interface ThroughputTestOptions {
	handle: TriggerHandle;
	api: ApiHelpers;
	services: ServiceHelpers;
	testInfo: TestInfo;
	messageCount: number;
	nodeCount: number;
	nodeOutputSize: NodeOutputSize;
	timeoutMs: number;
	pollIntervalMs?: number;
	/** PromQL metric to track workflow completions. Defaults to resolveMetricQuery(testInfo). */
	metricQuery?: string;
	plan?: { memory: number; cpu: number };
	workerPlan?: { memory: number; cpu: number };
}

function deriveProfile(
	testInfo: TestInfo,
	plan?: { memory: number; cpu: number },
	workerPlan?: { memory: number; cpu: number },
) {
	const name = testInfo.project.name.replace(':infrastructure', '').replace('benchmark-', '');
	const workers =
		(testInfo.project.use as { containerConfig?: { workers?: number } }).containerConfig?.workers ??
		0;

	const wp = workerPlan ?? plan;
	let resourceSummary = '';
	if (plan && wp) {
		resourceSummary =
			workers > 0
				? `  Mode: queue (1 main + ${workers} workers)\n` +
					`  Main: ${plan.memory}GB RAM, ${plan.cpu} CPU\n` +
					`  Workers: ${wp.memory}GB RAM, ${wp.cpu} CPU each\n` +
					`  Total: ${(plan.memory + wp.memory * workers).toFixed(1)}GB RAM, ${plan.cpu + wp.cpu * workers} CPU`
				: `  Resources: ${plan.memory}GB RAM, ${plan.cpu} CPU`;
	}

	return { name, workers, resourceSummary };
}

/**
 * Runs a single throughput test: preloads messages, activates workflow, measures drain rate.
 *
 * Orchestration: create workflow → preload → baseline → activate → measure throughput → diagnostics → report.
 * Call this inside a `test()` body after setting up the trigger driver.
 */
export async function runThroughputTest(options: ThroughputTestOptions): Promise<void> {
	const {
		handle,
		api,
		services,
		testInfo,
		messageCount,
		nodeCount,
		nodeOutputSize,
		timeoutMs,
		pollIntervalMs,
		plan,
		workerPlan,
	} = options;
	const metricQuery = options.metricQuery ?? resolveMetricQuery(testInfo);

	testInfo.setTimeout(timeoutMs + 120_000);

	const profile = deriveProfile(testInfo, plan, workerPlan);
	const obs = services.observability;

	const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
		handle.workflow,
		{ makeUnique: true },
	);

	// Preload queue
	const publishResult = await handle.preload(messageCount);
	console.log(
		`[BENCH-${profile.name}] Preloaded ${publishResult.totalPublished} messages in ${publishResult.publishDurationMs}ms`,
	);

	// Wait for VictoriaMetrics, then record baseline
	await obs.metrics.waitForMetric('n8n_version_info', {
		timeoutMs: 30_000,
		intervalMs: 2000,
		predicate: (results: unknown[]) => results.length > 0,
	});
	const baselineCounter = await getBaselineCounter(obs.metrics, metricQuery);

	// Activate and wait for readiness
	await api.workflows.activate(workflowId, createdWorkflow.versionId!);
	await handle.waitForReady({ timeoutMs: 30_000 });

	// Measure throughput
	console.log(
		`[BENCH-${profile.name}] Draining ${messageCount} messages through ${nodeCount}-node (${nodeOutputSize}) workflow (timeout: ${timeoutMs}ms)`,
	);
	const result = await waitForThroughput(obs.metrics, {
		expectedCount: messageCount,
		nodeCount,
		timeoutMs,
		baselineValue: baselineCounter,
		metricQuery,
		pollIntervalMs,
	});

	// Attach results
	await attachThroughputResults(testInfo, testInfo.title, result);

	// Execution duration sampling — provides p50/p95/p99 latency percentiles.
	// May be empty when EXECUTIONS_DATA_SAVE_ON_SUCCESS=none.
	const durations = await sampleExecutionDurations(api.workflows, workflowId);
	if (durations.length > 0) {
		const durationMetrics = buildMetrics(result.totalCompleted, 0, result.durationMs, durations);
		await attachMetric(
			testInfo,
			`${testInfo.title}-duration-avg`,
			durationMetrics.avgDurationMs,
			'ms',
		);
		await attachMetric(
			testInfo,
			`${testInfo.title}-duration-p50`,
			durationMetrics.p50DurationMs,
			'ms',
		);
		await attachMetric(
			testInfo,
			`${testInfo.title}-duration-p95`,
			durationMetrics.p95DurationMs,
			'ms',
		);
		await attachMetric(
			testInfo,
			`${testInfo.title}-duration-p99`,
			durationMetrics.p99DurationMs,
			'ms',
		);
	}

	// Diagnostics
	const diagnostics = await collectDiagnostics(obs.metrics, result.durationMs);
	await attachDiagnostics(testInfo, testInfo.title, diagnostics);
	const fmt = formatDiagnosticValue;
	console.log(
		`[DIAG-${profile.name}] ${testInfo.title}\n` +
			`  Event Loop Lag: ${fmt(diagnostics.eventLoopLag, 's')}\n` +
			`  PG Transactions/s: ${fmt(diagnostics.pgTxRate, ' tx/s')}\n` +
			`  PG Rows Inserted/s: ${fmt(diagnostics.pgInsertRate, ' rows/s')}\n` +
			`  PG Active Connections: ${fmt(diagnostics.pgActiveConnections)}\n` +
			`  Queue Waiting: ${fmt(diagnostics.queueWaiting)}\n` +
			`  Queue Active: ${fmt(diagnostics.queueActive)}\n` +
			`  Queue Completed/s: ${fmt(diagnostics.queueCompletedRate, ' jobs/s')}\n` +
			`  Queue Failed/s: ${fmt(diagnostics.queueFailedRate, ' jobs/s')}`,
	);

	// Summary
	console.log(
		`[BENCH-${profile.name} RESULT] ${testInfo.title}\n` +
			`  Profile: ${profile.name}\n` +
			`${profile.resourceSummary}\n` +
			`  Nodes: ${nodeCount} (${nodeOutputSize}) | Messages: ${messageCount}\n` +
			`  Completed: ${result.totalCompleted}/${messageCount}\n` +
			`  Throughput: ${result.avgExecPerSec.toFixed(1)} exec/s | ${result.actionsPerSec.toFixed(1)} actions/s\n` +
			`  Peak: ${result.peakExecPerSec.toFixed(1)} exec/s | ${result.peakActionsPerSec.toFixed(1)} actions/s\n` +
			`  Duration: ${(result.durationMs / 1000).toFixed(1)}s`,
	);

	expect(result.totalCompleted).toBeGreaterThan(0);
}
