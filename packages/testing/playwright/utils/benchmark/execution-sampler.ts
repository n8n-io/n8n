import type { TestInfo } from '@playwright/test';

import type { WorkflowApiHelper } from '../../services/workflow-api-helper';
import { attachMetric } from '../performance-helper';
import type { ExecutionMetrics } from './types';

function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return 0;
	const index = Math.ceil((p / 100) * sorted.length) - 1;
	return sorted[Math.max(0, index)];
}

/**
 * Fetches a sample of recent executions to calculate duration statistics.
 * Retries on transient errors (e.g. 503 "Database is not ready!") since the DB
 * may still be under heavy write pressure after a burst of executions.
 */
export async function sampleExecutionDurations(
	workflowApi: WorkflowApiHelper,
	workflowId: string,
	options: { maxRetries?: number; retryDelayMs?: number } = {},
): Promise<number[]> {
	const { maxRetries = 5, retryDelayMs = 3000 } = options;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const executions = await workflowApi.getExecutions(workflowId, 100);
			const durations = executions
				.filter((e) => e.startedAt && e.stoppedAt)
				.map((e) => new Date(e.stoppedAt!).getTime() - new Date(e.startedAt!).getTime())
				.sort((a, b) => a - b);

			if (durations.length > 0) return durations;

			// Executions not yet persisted — retry unless final attempt
			if (attempt === maxRetries) {
				console.warn(
					`[LOAD] No execution durations found after ${maxRetries + 1} attempts — returning empty`,
				);
				return [];
			}
			console.log(
				`[LOAD] No executions found yet (attempt ${attempt + 1}), retrying in ${retryDelayMs}ms...`,
			);
		} catch (error) {
			if (attempt === maxRetries) {
				console.warn(
					`[LOAD] Failed to sample executions after ${maxRetries + 1} attempts — returning empty durations`,
				);
				return [];
			}
			console.log(
				`[LOAD] Execution sampling attempt ${attempt + 1} failed, retrying in ${retryDelayMs}ms...`,
			);
		}
		await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
	}

	return [];
}

export function buildMetrics(
	successCount: number,
	errorCount: number,
	durationMs: number,
	durations: number[],
): ExecutionMetrics {
	const totalCompleted = successCount + errorCount;
	return {
		totalCompleted,
		totalErrors: errorCount,
		durationMs,
		throughputPerSecond: durationMs > 0 ? (totalCompleted / durationMs) * 1000 : 0,
		executionDurations: durations,
		avgDurationMs:
			durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
		p50DurationMs: percentile(durations, 50),
		p95DurationMs: percentile(durations, 95),
		p99DurationMs: percentile(durations, 99),
	};
}

export async function attachLoadTestResults(
	testInfo: TestInfo,
	label: string,
	metrics: ExecutionMetrics,
): Promise<void> {
	await attachMetric(testInfo, `${label}-executions-completed`, metrics.totalCompleted, 'count');
	await attachMetric(testInfo, `${label}-executions-errors`, metrics.totalErrors, 'count');
	await attachMetric(testInfo, `${label}-throughput`, metrics.throughputPerSecond, 'exec/s');
	await attachMetric(testInfo, `${label}-total-duration`, metrics.durationMs, 'ms');

	// Only attach duration percentiles when we have sampled data — otherwise the
	// reporter would show misleading "0ms" values (e.g. when EXECUTIONS_DATA_SAVE_ON_SUCCESS=none)
	if (metrics.executionDurations.length > 0) {
		await attachMetric(testInfo, `${label}-duration-avg`, metrics.avgDurationMs, 'ms');
		await attachMetric(testInfo, `${label}-duration-p50`, metrics.p50DurationMs, 'ms');
		await attachMetric(testInfo, `${label}-duration-p95`, metrics.p95DurationMs, 'ms');
		await attachMetric(testInfo, `${label}-duration-p99`, metrics.p99DurationMs, 'ms');
	}
}
