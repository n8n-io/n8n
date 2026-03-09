/**
 * Throughput benchmark measurement — VictoriaMetrics counter-based completion tracking.
 *
 * Polls a PromQL counter at regular intervals to measure sustained throughput.
 * Trigger-agnostic: works with any trigger type that increments n8n_workflow_success_total.
 */
import type { TestInfo } from '@playwright/test';
import type { MetricsHelper } from 'n8n-containers';

import { attachMetric } from '../performance-helper';

// --- Types ---

export interface ThroughputSample {
	timestamp: number;
	completed: number;
	delta: number;
}

export interface ThroughputResult {
	totalCompleted: number;
	durationMs: number;
	avgExecPerSec: number;
	peakExecPerSec: number;
	actionsPerSec: number;
	peakActionsPerSec: number;
	samples: ThroughputSample[];
}

// --- PromQL queries ---

export const WORKFLOW_SUCCESS_QUERY = 'n8n_workflow_success_total';
export const QUEUE_JOBS_COMPLETED_QUERY = 'n8n_scaling_mode_queue_jobs_completed';

/**
 * Returns the completion metric for the current Playwright project.
 *
 * Currently always uses `n8n_workflow_success_total` which is emitted by both main
 * and workers, aggregated across all instances by VictoriaMetrics.
 *
 * `n8n_scaling_mode_queue_jobs_completed` is the designed queue-mode metric but
 * it depends on ScalingService.scheduleQueueMetrics() emitting `job-counts-updated`
 * events at regular intervals — currently observed as 0 in CI.
 */
export function resolveMetricQuery(_testInfo: TestInfo): string {
	return WORKFLOW_SUCCESS_QUERY;
}

// --- Throughput measurement ---

/**
 * Polls VictoriaMetrics for a completion counter until it reaches the expected count.
 * Records samples at each poll interval to calculate throughput.
 *
 * The metricQuery parameter allows switching between single-main
 * (`n8n_workflow_success_total`) and queue mode (`n8n_scaling_mode_queue_jobs_completed`).
 * For continuous generation tests, set expectedCount to Infinity and use timeoutMs as the run duration.
 */
export async function waitForThroughput(
	metrics: MetricsHelper,
	options: {
		expectedCount: number;
		nodeCount: number;
		timeoutMs: number;
		pollIntervalMs?: number;
		metricQuery?: string;
		baselineValue?: number;
	},
): Promise<ThroughputResult> {
	const {
		expectedCount,
		nodeCount,
		timeoutMs,
		pollIntervalMs = 5000,
		metricQuery = WORKFLOW_SUCCESS_QUERY,
		baselineValue = 0,
	} = options;

	const samples: ThroughputSample[] = [];
	const startTime = Date.now();
	const deadline = startTime + timeoutMs;
	let lastValue = baselineValue;
	let highWaterMark = baselineValue;

	while (Date.now() < deadline) {
		const remaining = deadline - Date.now();
		await new Promise((resolve) => setTimeout(resolve, Math.min(pollIntervalMs, remaining)));

		let results;
		try {
			results = await metrics.query(`last_over_time(${metricQuery}[1m])`);
		} catch (error) {
			console.log(
				`[THROUGHPUT] Query error: ${error instanceof Error ? error.message : String(error)}`,
			);
			continue;
		}

		const current = results.length > 0 ? results.reduce((sum, r) => sum + r.value, 0) : 0;

		// Monotonic guard: counters should never decrease.
		// If VictoriaMetrics returns a stale/missing value, skip this sample.
		if (current < highWaterMark) {
			console.log(
				`[THROUGHPUT] Scrape miss: counter dropped ${highWaterMark} → ${current}, skipping`,
			);
			continue;
		}

		highWaterMark = current;
		const completed = current - baselineValue;
		const delta = current - lastValue;

		samples.push({
			timestamp: Date.now(),
			completed,
			delta,
		});

		if (delta !== 0) {
			console.log(`[THROUGHPUT] Completed: ${completed}/${expectedCount} (+${delta})`);
		}

		lastValue = current;

		if (completed >= expectedCount) {
			break;
		}
	}

	return calculateThroughput(samples, nodeCount, startTime);
}

/**
 * Reads the current value of the workflow success counter from VictoriaMetrics.
 * Returns 0 if the metric hasn't been scraped yet.
 */
export async function getBaselineCounter(
	metrics: MetricsHelper,
	metricQuery: string = WORKFLOW_SUCCESS_QUERY,
): Promise<number> {
	try {
		const results = await metrics.query(`last_over_time(${metricQuery}[1m])`);
		return results.length > 0 ? results.reduce((sum, r) => sum + r.value, 0) : 0;
	} catch {
		return 0;
	}
}

function calculateThroughput(
	samples: ThroughputSample[],
	nodeCount: number,
	startTime: number,
): ThroughputResult {
	if (samples.length === 0) {
		return {
			totalCompleted: 0,
			durationMs: 0,
			avgExecPerSec: 0,
			peakExecPerSec: 0,
			actionsPerSec: 0,
			peakActionsPerSec: 0,
			samples: [],
		};
	}

	// Duration measures actual processing time by excluding startup overhead.
	// Use the last zero-progress sample as the reference start — that's the
	// tightest bound on when processing actually began, regardless of whether
	// completions span one poll interval or many.
	const firstActiveIndex = samples.findIndex((s) => s.delta > 0);
	const lastSample = samples[samples.length - 1];
	const totalCompleted = lastSample.completed;
	const referenceStart = firstActiveIndex > 0 ? samples[firstActiveIndex - 1].timestamp : startTime;
	const durationMs = lastSample.timestamp - referenceStart;

	// Sliding window peak: average rate over 3 consecutive intervals.
	// Smooths burst noise from VictoriaMetrics scrape batching.
	const PEAK_WINDOW = 3;
	let peakExecPerSec = 0;

	for (let i = 0; i < samples.length; i++) {
		const windowEnd = Math.min(i + PEAK_WINDOW, samples.length) - 1;
		const windowStart = i;
		const windowDelta = samples
			.slice(windowStart, windowEnd + 1)
			.reduce((sum, s) => sum + Math.max(0, s.delta), 0);
		const windowStartTime = windowStart === 0 ? startTime : samples[windowStart - 1].timestamp;
		const windowMs = samples[windowEnd].timestamp - windowStartTime;
		if (windowMs > 0 && windowDelta > 0) {
			const rate = (windowDelta / windowMs) * 1000;
			peakExecPerSec = Math.max(peakExecPerSec, rate);
		}
	}

	const avgExecPerSec = durationMs > 0 ? (totalCompleted / durationMs) * 1000 : 0;

	return {
		totalCompleted,
		durationMs,
		avgExecPerSec,
		peakExecPerSec,
		actionsPerSec: avgExecPerSec * nodeCount,
		peakActionsPerSec: peakExecPerSec * nodeCount,
		samples,
	};
}

// --- Result reporting ---

export async function attachThroughputResults(
	testInfo: TestInfo,
	label: string,
	result: ThroughputResult,
): Promise<void> {
	await attachMetric(testInfo, `${label}-exec-per-sec`, result.avgExecPerSec, 'exec/s');
	await attachMetric(testInfo, `${label}-actions-per-sec`, result.actionsPerSec, 'actions/s');
	await attachMetric(testInfo, `${label}-peak-exec-per-sec`, result.peakExecPerSec, 'exec/s');
	await attachMetric(
		testInfo,
		`${label}-peak-actions-per-sec`,
		result.peakActionsPerSec,
		'actions/s',
	);
	await attachMetric(testInfo, `${label}-total-completed`, result.totalCompleted, 'count');
	await attachMetric(testInfo, `${label}-duration`, result.durationMs, 'ms');
}
