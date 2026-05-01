import { expect } from '@playwright/test';
import type { TestInfo } from '@playwright/test';
import type { ServiceHelpers } from 'n8n-containers/services/types';

import { reportDiagnostics, reportPgQueryBreakdown, setupBenchmarkRun } from './orchestration';
import type { ApiHelpers } from '../../../../services/api-helper';
import {
	attachThroughputResults,
	buildMetrics,
	executeLoad,
	sampleExecutionDurations,
} from '../../../../utils/benchmark';
import type { BenchmarkDimensions, TriggerHandle, TriggerType } from '../../../../utils/benchmark';
import { attachMetric } from '../../../../utils/performance-helper';

export interface ThroughputTestOptions {
	handle: TriggerHandle;
	api: ApiHelpers;
	services: ServiceHelpers;
	testInfo: TestInfo;
	messageCount: number;
	timeoutMs: number;
	/** Trigger type recorded as a dimension in BigQuery */
	trigger: TriggerType;
	/** PromQL metric to track workflow completions. Defaults to resolveMetricQuery(testInfo). */
	metricQuery?: string;
	plan?: { memory: number; cpu: number };
	workerPlan?: { memory: number; cpu: number };
	/** Worker count for the resource summary. Falls back to the project's containerConfig.workers when omitted. */
	workers?: number;
}

/**
 * Runs a single preload+drain throughput test.
 *
 * Shape: setup → executeLoad({ type: 'preloaded' }) → measure → report.
 *
 * The dispatch and per-load-type behavior live in `executeLoad`. This harness
 * adds throughput-specific extras: resource summary in the log output and
 * the throughput metric set (`exec-per-sec`, `tail-exec-per-sec`, etc.) for
 * BigQuery, distinct from the load-test metric set.
 */
export async function runThroughputTest(options: ThroughputTestOptions): Promise<void> {
	const { handle, api, services, testInfo, messageCount, timeoutMs, trigger, plan, workerPlan } =
		options;
	testInfo.setTimeout(timeoutMs + 120_000);

	const { nodeCount, nodeOutputSize } = handle.scenario;

	const workers =
		options.workers ??
		(testInfo.project.use as { containerConfig?: { workers?: number } }).containerConfig?.workers ??
		0;

	const dimensions: BenchmarkDimensions = {
		trigger,
		nodes: nodeCount,
		messages: messageCount,
	};
	if (nodeOutputSize !== undefined) dimensions.output = nodeOutputSize;

	const setup = await setupBenchmarkRun({
		api,
		services,
		testInfo,
		handle,
		metricQuery: options.metricQuery,
	});

	const exec = await executeLoad(
		{ type: 'preloaded', count: messageCount },
		{
			handle,
			metrics: services.observability.metrics,
			baselineCounter: setup.baselineCounter,
			metricQuery: setup.metricQuery,
			timeoutMs,
			nodeCount,
		},
	);
	const result = exec.throughputResult;

	await attachThroughputResults(testInfo, dimensions, result);

	// Latency percentiles — only when EXECUTIONS_DATA_SAVE_ON_SUCCESS leaves rows behind.
	const durations = await sampleExecutionDurations(api.workflows, setup.workflowId);
	if (durations.length > 0) {
		const durationMetrics = buildMetrics(result.totalCompleted, 0, result.durationMs, durations);
		await attachMetric(testInfo, 'duration-avg', durationMetrics.avgDurationMs, 'ms', dimensions);
		await attachMetric(testInfo, 'duration-p50', durationMetrics.p50DurationMs, 'ms', dimensions);
		await attachMetric(testInfo, 'duration-p95', durationMetrics.p95DurationMs, 'ms', dimensions);
		await attachMetric(testInfo, 'duration-p99', durationMetrics.p99DurationMs, 'ms', dimensions);
	}

	await reportDiagnostics({
		testInfo,
		services,
		durationMs: result.durationMs,
		dimensions,
	});
	await reportPgQueryBreakdown({ services, durationMs: result.durationMs });

	const resourceSummary = formatResourceSummary({ workers, plan, workerPlan });

	console.log(
		`[BENCH RESULT] ${testInfo.title}\n` +
			`${resourceSummary}\n` +
			`  Nodes: ${nodeCount} (${nodeOutputSize ?? 'noop'}) | Messages: ${messageCount}\n` +
			`  Completed: ${result.totalCompleted}/${messageCount}\n` +
			`  Sustained avg: ${result.avgExecPerSec.toFixed(1)} exec/s | ${result.actionsPerSec.toFixed(1)} actions/s\n` +
			`  Tail 60s:      ${result.tailExecPerSec.toFixed(1)} exec/s | ${result.tailActionsPerSec.toFixed(1)} actions/s\n` +
			`  Duration: ${(result.durationMs / 1000).toFixed(1)}s`,
	);

	// Fail loudly on partial completion — a stalled run produces misleading numbers
	// even with the stall-detection bail-out, because the reported throughput is
	// calculated over only the messages that actually made it through.
	expect(result.totalCompleted).toBe(messageCount);
}

function formatResourceSummary(opts: {
	workers: number;
	plan?: { memory: number; cpu: number };
	workerPlan?: { memory: number; cpu: number };
}): string {
	const { workers, plan } = opts;
	const wp = opts.workerPlan ?? plan;
	if (!plan || !wp) return '';
	if (workers > 0) {
		return (
			`  Mode: queue (1 main + ${workers} workers)\n` +
			`  Main: ${plan.memory}GB RAM, ${plan.cpu} CPU\n` +
			`  Workers: ${wp.memory}GB RAM, ${wp.cpu} CPU each\n` +
			`  Total: ${(plan.memory + wp.memory * workers).toFixed(1)}GB RAM, ${plan.cpu + wp.cpu * workers} CPU`
		);
	}
	return `  Resources: ${plan.memory}GB RAM, ${plan.cpu} CPU`;
}
