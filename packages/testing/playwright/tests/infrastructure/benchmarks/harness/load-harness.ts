import { expect } from '@playwright/test';
import type { TestInfo } from '@playwright/test';

import type { ApiHelpers } from '../../../../services/api-helper';
import {
	sampleExecutionDurations,
	buildMetrics,
	attachLoadTestResults,
} from '../../../../utils/benchmark';
import type { TriggerHandle, ExecutionMetrics } from '../../../../utils/benchmark';

export type LoadProfile =
	| { type: 'steady'; ratePerSecond: number; durationSeconds: number }
	| { type: 'preloaded'; count: number };

export interface LoadTestOptions {
	handle: TriggerHandle;
	api: ApiHelpers;
	testInfo: TestInfo;
	load: LoadProfile;
	timeoutMs: number;
}

/**
 * Runs a single load test: creates workflow, generates load, measures latency.
 *
 * Phases: create workflow → preload (if backlog) → activate → publish (if steady) → drain → report.
 */
export async function runLoadTest({
	handle,
	api,
	testInfo,
	load,
	timeoutMs,
}: LoadTestOptions): Promise<ExecutionMetrics> {
	testInfo.setTimeout(timeoutMs + 120_000);

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

	// Phase 2: Activate workflow
	await api.workflows.activate(workflowId, createdWorkflow.versionId!);
	await handle.waitForReady({ timeoutMs: 30_000 });

	// Phase 3: Post-activation load (publish at controlled rate)
	if (load.type === 'steady') {
		const result = await handle.publishAtRate({
			ratePerSecond: load.ratePerSecond,
			durationSeconds: load.durationSeconds,
		});
		console.log(
			`[LOAD] Published ${result.totalPublished} messages in ${result.actualDurationMs}ms`,
		);
		expectedExecutions = result.totalPublished;
	}

	// Phase 4: Drain and measure
	console.log(`[LOAD] Waiting for ${expectedExecutions} executions (timeout: ${timeoutMs}ms)`);

	const drainStart = Date.now();
	const drainResult = await handle.waitForDrain({ expectedCount: expectedExecutions, timeoutMs });
	const drainDurationMs = Date.now() - drainStart;

	if (!drainResult.drained) {
		console.warn(
			`[LOAD] Drain incomplete after ${(drainDurationMs / 1000).toFixed(1)}s — results reflect partial completion`,
		);
	}

	// Duration sampling is optional — may be empty when EXECUTIONS_DATA_SAVE_ON_SUCCESS=none
	// hard-deletes execution records. Completion count comes from drain tracking (Kafka lag).
	const durations = await sampleExecutionDurations(api.workflows, workflowId);
	const metrics = buildMetrics(drainResult.consumed, 0, drainDurationMs, durations);

	await attachLoadTestResults(testInfo, testInfo.title, metrics);

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
