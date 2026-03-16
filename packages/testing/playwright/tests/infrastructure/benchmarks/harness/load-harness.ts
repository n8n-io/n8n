import { expect } from '@playwright/test';
import type { TestInfo } from '@playwright/test';
import type { ServiceHelpers } from 'n8n-containers/services/types';

import type { ApiHelpers } from '../../../../services/api-helper';
import {
	sampleExecutionDurations,
	buildMetrics,
	attachLoadTestResults,
	waitForThroughput,
	getBaselineCounter,
	collectDiagnostics,
	attachDiagnostics,
	formatDiagnosticValue,
	resolveMetricQuery,
} from '../../../../utils/benchmark';
import type {
	TriggerHandle,
	NodeOutputSize,
	ExecutionMetrics,
	TriggerType,
	LoadProfile,
} from '../../../../utils/benchmark';

export interface LoadTestOptions {
	handle: TriggerHandle;
	api: ApiHelpers;
	services: ServiceHelpers;
	testInfo: TestInfo;
	load: LoadProfile;
	timeoutMs: number;
	/** Trigger type recorded as a dimension in BigQuery */
	trigger: TriggerType;
	/** Node count recorded as a dimension in BigQuery */
	nodeCount: number;
	/** Node output size recorded as a dimension in BigQuery */
	nodeOutputSize?: NodeOutputSize;
	/** PromQL metric to track workflow completions. Defaults to resolveMetricQuery(testInfo). */
	metricQuery?: string;
}

/**
 * Runs a single load test: creates workflow, generates load, measures completion rate and latency.
 *
 * Phases: create workflow → preload (if backlog) → baseline → activate → publish (if steady) → measure → report.
 *
 * Completion is tracked via VictoriaMetrics using the metric resolved from the project config
 * (direct mode: `n8n_workflow_success_total`, queue mode: `n8n_scaling_mode_queue_jobs_completed`).
 */
export async function runLoadTest(options: LoadTestOptions): Promise<ExecutionMetrics> {
	const { handle, api, services, testInfo, load, timeoutMs, trigger } = options;
	const metricQuery = options.metricQuery ?? resolveMetricQuery(testInfo);
	testInfo.setTimeout(timeoutMs + 120_000);

	const mode = testInfo.project.name.replace(':infrastructure', '').replace('benchmark-', '');

	const dimensions: Record<string, string | number> = { trigger, mode };
	if (options.nodeCount !== undefined) dimensions.nodes = options.nodeCount;
	if (options.nodeOutputSize !== undefined) dimensions.output = options.nodeOutputSize;
	if (load.type === 'steady') {
		dimensions.rate = load.ratePerSecond;
		dimensions.duration_s = load.durationSeconds;
	} else {
		dimensions.messages = load.count;
	}

	const obs = services.observability;

	const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
		handle.workflow,
		{ makeUnique: true },
	);

	// Phase 1: Pre-activation load (fill queue before workflow starts)
	let expectedExecutions = 0;
	if (load.type === 'preloaded') {
		const result = await handle.preload(load.count);
		console.log(
			`[LOAD] Preloaded ${result.totalPublished} messages in ${result.publishDurationMs}ms`,
		);
		expectedExecutions = result.totalPublished;
	}

	// Phase 2: Wait for VictoriaMetrics readiness and record baseline
	await obs.metrics.waitForMetric('n8n_version_info', {
		timeoutMs: 30_000,
		intervalMs: 2000,
		predicate: (results: unknown[]) => results.length > 0,
	});
	const baselineCounter = await getBaselineCounter(obs.metrics, metricQuery);

	// Phase 3: Activate workflow
	// For burst tests, processing starts at activation (messages are already queued),
	// so the timer must begin here to capture the full processing window.
	const activationStart = Date.now();
	await api.workflows.activate(workflowId, createdWorkflow.versionId!);
	await handle.waitForReady({ timeoutMs: 30_000 });

	// Phase 4: Post-activation load (publish at controlled rate)
	// For steady-state tests, n8n consumes concurrently during publishing,
	// so the timer starts at publish to measure the real processing window.
	let publishStart: number | undefined;
	if (load.type === 'steady') {
		publishStart = Date.now();
		const result = await handle.publishAtRate({
			ratePerSecond: load.ratePerSecond,
			durationSeconds: load.durationSeconds,
		});
		console.log(
			`[LOAD] Published ${result.totalPublished} messages in ${result.actualDurationMs}ms`,
		);
		expectedExecutions = result.totalPublished;
	}

	// Phase 5: Wait for workflow completions via VictoriaMetrics
	console.log(
		`[LOAD] Waiting for ${expectedExecutions} workflow completions (timeout: ${timeoutMs}ms)`,
	);

	const throughputResult = await waitForThroughput(obs.metrics, {
		expectedCount: expectedExecutions,
		nodeCount: 1,
		timeoutMs,
		baselineValue: baselineCounter,
		metricQuery,
	});
	const totalDurationMs = Date.now() - (publishStart ?? activationStart);

	if (throughputResult.totalCompleted < expectedExecutions) {
		console.warn(
			`[LOAD] Only ${throughputResult.totalCompleted}/${expectedExecutions} completed after ${(totalDurationMs / 1000).toFixed(1)}s — results reflect partial completion`,
		);
	}

	// Duration sampling is optional — may be empty when EXECUTIONS_DATA_SAVE_ON_SUCCESS=none
	// hard-deletes execution records. Completion count comes from VictoriaMetrics.
	const durations = await sampleExecutionDurations(api.workflows, workflowId);
	const metrics = buildMetrics(throughputResult.totalCompleted, 0, totalDurationMs, durations);

	await attachLoadTestResults(testInfo, dimensions, metrics);

	// Diagnostics
	const diagnostics = await collectDiagnostics(obs.metrics, totalDurationMs);
	await attachDiagnostics(testInfo, dimensions, diagnostics);
	const fmt = formatDiagnosticValue;
	console.log(
		`[DIAG] ${testInfo.title}\n` +
			`  Event Loop Lag: ${fmt(diagnostics.eventLoopLag, 's')}\n` +
			`  PG Transactions/s: ${fmt(diagnostics.pgTxRate, ' tx/s')}\n` +
			`  PG Active Connections: ${fmt(diagnostics.pgActiveConnections)}\n` +
			`  Queue Waiting: ${fmt(diagnostics.queueWaiting)}`,
	);

	console.log(
		`[LOAD RESULT] ${testInfo.title}\n` +
			`  Completed: ${metrics.totalCompleted}/${expectedExecutions}\n` +
			`  Errors: ${metrics.totalErrors}\n` +
			`  Throughput: ${metrics.throughputPerSecond.toFixed(2)} exec/s\n` +
			`  Duration avg: ${metrics.avgDurationMs.toFixed(0)}ms | ` +
			`p50: ${metrics.p50DurationMs.toFixed(0)}ms | ` +
			`p95: ${metrics.p95DurationMs.toFixed(0)}ms | ` +
			`p99: ${metrics.p99DurationMs.toFixed(0)}ms`,
	);

	expect(metrics.totalCompleted).toBeGreaterThan(0);

	return metrics;
}
