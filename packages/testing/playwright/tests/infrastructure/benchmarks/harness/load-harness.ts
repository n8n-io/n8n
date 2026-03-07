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
 * Orchestration: create workflow → activate → generate load → drain → sample latencies → report.
 * Call this inside a `test()` body after setting up the trigger driver.
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

	try {
		let expectedExecutions: number;

		if (load.type === 'preloaded') {
			const result = await handle.preload(load.count);
			console.log(
				`[LOAD] Preloaded ${result.totalPublished} messages in ${result.publishDurationMs}ms`,
			);
			expectedExecutions = load.count;

			await api.workflows.activate(workflowId, createdWorkflow.versionId!);
			await handle.waitForReady({ timeoutMs: 30_000 });
		} else {
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);
			await handle.waitForReady({ timeoutMs: 30_000 });

			const result = await handle.publishAtRate({
				ratePerSecond: load.ratePerSecond,
				durationSeconds: load.durationSeconds,
			});
			console.log(
				`[LOAD] Published ${result.totalPublished} messages in ${result.actualDurationMs}ms`,
			);
			expectedExecutions = result.totalPublished;
		}

		console.log(`[LOAD] Waiting for ${expectedExecutions} executions (timeout: ${timeoutMs}ms)`);

		const drainStart = Date.now();
		if (handle.waitForDrain) {
			await handle.waitForDrain({ expectedCount: expectedExecutions, timeoutMs });
		}
		const drainDurationMs = Date.now() - drainStart;

		const durations = await sampleExecutionDurations(api.workflows, workflowId);
		const metrics = buildMetrics(expectedExecutions, 0, drainDurationMs, durations);

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
		expect(metrics.totalCompleted).toBeGreaterThanOrEqual(Math.floor(expectedExecutions * 0.5));

		return metrics;
	} finally {
		await api.workflows.deactivate(workflowId);
		await handle.cleanup();
	}
}
