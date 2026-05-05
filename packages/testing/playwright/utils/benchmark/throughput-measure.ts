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

/** Per-stage measurement record for staged-rate runs. */
export interface StageMeasurement {
	stageIndex: number;
	startTimestamp: number;
	endTimestamp: number;
	completedDuringStage: number;
	durationMs: number;
	execPerSec: number;
}

export interface ThroughputResult {
	totalCompleted: number;
	durationMs: number;
	avgExecPerSec: number;
	/** Rate over the final 60s window — approximates the architectural ceiling. */
	tailExecPerSec: number;
	peakExecPerSec: number;
	actionsPerSec: number;
	tailActionsPerSec: number;
	peakActionsPerSec: number;
	samples: ThroughputSample[];
	/**
	 * Rates split by publish phase (steady-rate runs only).
	 * Populated when `publishEndAt` is passed to `waitForThroughput`. Lets a steady-rate
	 * benchmark distinguish "rate while messages are still being produced" from
	 * "rate while only draining a backlog" — different system behavior, different question.
	 */
	inputPhaseExecPerSec?: number;
	inputPhaseCompleted?: number;
	inputPhaseDurationMs?: number;
	drainPhaseExecPerSec?: number;
	drainPhaseCompleted?: number;
	drainPhaseDurationMs?: number;
	/**
	 * Per-stage measurements for staged-rate runs.
	 * Populated when `stageBoundaries` is passed to `waitForThroughput`.
	 */
	perStage?: StageMeasurement[];
}

// --- PromQL queries ---

export const WORKFLOW_SUCCESS_QUERY = 'n8n_workflow_success_total';
export const QUEUE_JOBS_COMPLETED_QUERY = 'n8n_scaling_mode_queue_jobs_completed';

/**
 * Returns the completion metric for the current Playwright project.
 *
 * `n8n_workflow_success_total` is emitted by both main and workers; in queue mode
 * each instance produces its own time series. The query wraps the metric in
 * `sum(last_over_time(...[5m]))` so VictoriaMetrics aggregates across instances
 * server-side, and the wide lookback tolerates transient scrape misses that
 * would otherwise drop a series and make the summed counter appear to regress.
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
		/** Break out of the poll loop if no progress is seen for this long. */
		stallThresholdMs?: number;
		/**
		 * Wall-clock timestamp at which the publish phase ends. When provided, the result
		 * includes phase-split metrics so a steady-rate benchmark can distinguish
		 * "rate while messages were being produced" from "rate while only draining."
		 */
		publishEndAt?: number;
		/**
		 * Wall-clock timestamps marking stage boundaries for staged-rate runs.
		 * Format: `[publishStart, end_of_stage_1, end_of_stage_2, ..., end_of_last_stage]`.
		 * For N stages, expect N+1 boundaries. When provided, the result includes
		 * per-stage measurements so a ramp test can identify the breaking point.
		 */
		stageBoundaries?: number[];
	},
): Promise<ThroughputResult> {
	const {
		expectedCount,
		nodeCount,
		timeoutMs,
		pollIntervalMs = 1000,
		metricQuery = WORKFLOW_SUCCESS_QUERY,
		baselineValue = 0,
		stallThresholdMs = 60_000,
		publishEndAt,
		stageBoundaries,
	} = options;

	const samples: ThroughputSample[] = [];
	const startTime = Date.now();
	const deadline = startTime + timeoutMs;
	let lastValue = baselineValue;
	let highWaterMark = baselineValue;
	let lastProgressTime = startTime;

	while (Date.now() < deadline) {
		const remaining = deadline - Date.now();
		await new Promise((resolve) => setTimeout(resolve, Math.min(pollIntervalMs, remaining)));

		let results;
		try {
			results = await metrics.query(`sum(last_over_time(${metricQuery}[5m]))`);
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

		if (delta > 0) {
			console.log(`[THROUGHPUT] Completed: ${completed}/${expectedCount} (+${delta})`);
			lastProgressTime = Date.now();
		}

		lastValue = current;

		if (completed >= expectedCount) {
			break;
		}

		// Stall detection: if progress has stopped, bail early instead of waiting for full timeout.
		// Only trips after we've seen at least one non-zero delta, so we don't treat slow warm-up
		// as a stall.
		const timeSinceProgress = Date.now() - lastProgressTime;
		if (completed > 0 && timeSinceProgress > stallThresholdMs) {
			console.warn(
				`[THROUGHPUT] Stalled — no progress for ${(timeSinceProgress / 1000).toFixed(0)}s at ${completed}/${expectedCount}. Bailing early.`,
			);
			break;
		}
	}

	return calculateThroughput(samples, nodeCount, startTime, publishEndAt, stageBoundaries);
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
		const results = await metrics.query(`sum(last_over_time(${metricQuery}[5m]))`);
		return results.length > 0 ? results.reduce((sum, r) => sum + r.value, 0) : 0;
	} catch {
		return 0;
	}
}

function calculateThroughput(
	samples: ThroughputSample[],
	nodeCount: number,
	startTime: number,
	publishEndAt?: number,
	stageBoundaries?: number[],
): ThroughputResult {
	if (samples.length === 0) {
		return {
			totalCompleted: 0,
			durationMs: 0,
			avgExecPerSec: 0,
			tailExecPerSec: 0,
			peakExecPerSec: 0,
			actionsPerSec: 0,
			tailActionsPerSec: 0,
			peakActionsPerSec: 0,
			samples: [],
		};
	}

	// Duration measures actual processing time by excluding startup overhead AND
	// any trailing dead time after the last completion was recorded. Using the
	// last ACTIVE sample (rather than the last poll) avoids inflating the
	// denominator when the counter stalls or the run bails out early.
	const firstActiveIndex = samples.findIndex((s) => s.delta > 0);
	const lastActiveFromEnd = samples.findLastIndex((s) => s.delta > 0);
	const lastActiveIndex = lastActiveFromEnd === -1 ? samples.length - 1 : lastActiveFromEnd;

	const firstActiveSample = firstActiveIndex >= 0 ? samples[firstActiveIndex] : samples[0];
	const lastActiveSample = samples[lastActiveIndex];

	// Skip the warm-up window so reported throughput reflects sustained behavior,
	// not V8 JIT / PG pool fill / Kafka consumer ramp-up. We look for the first
	// sample whose timestamp is >= firstActive + WARMUP_MS and anchor the
	// measurement there. If the run is too short to have a post-warmup window
	// (<= 2x warmup), fall back to measuring from first-active (old behavior)
	// and flag it in logs so short-run numbers remain interpretable.
	// 60s chosen based on observed ramp-up durations: V8 JIT + PG pool fill +
	// Kafka consumer stabilization typically reached steady state at ~60-70s
	// on Blacksmith runners.
	const WARMUP_MS = 60_000;
	const activeSpanMs = lastActiveSample.timestamp - firstActiveSample.timestamp;
	const useWarmupSkip = activeSpanMs >= 2 * WARMUP_MS;

	let measurementStartIndex = firstActiveIndex >= 0 ? firstActiveIndex : 0;
	if (useWarmupSkip) {
		const warmupDeadline = firstActiveSample.timestamp + WARMUP_MS;
		const postWarmupIndex = samples.findIndex(
			(s, i) => i >= measurementStartIndex && s.timestamp >= warmupDeadline,
		);
		if (postWarmupIndex !== -1 && postWarmupIndex <= lastActiveIndex) {
			measurementStartIndex = postWarmupIndex;
		}
	} else if (firstActiveIndex >= 0) {
		console.log(
			`[THROUGHPUT] Run too short (${(activeSpanMs / 1000).toFixed(1)}s) to exclude warm-up; reporting includes ramp-up period`,
		);
	}

	const measurementStartSample = samples[measurementStartIndex];
	const referenceStart =
		measurementStartIndex > 0
			? samples[measurementStartIndex - 1].timestamp
			: firstActiveIndex > 0
				? samples[firstActiveIndex - 1].timestamp
				: startTime;

	const totalCompleted = lastActiveSample.completed;
	const measuredCompleted =
		lastActiveSample.completed - measurementStartSample.completed + measurementStartSample.delta;
	const durationMs = lastActiveSample.timestamp - referenceStart;

	// Peak rate intentionally omitted: at current poll/scrape cadence, a single
	// poll interval can catch a full 15s scrape batch worth of completions,
	// inflating "peak" by an order of magnitude. Reporting it is more misleading
	// than useful.
	const avgExecPerSec = durationMs > 0 ? (measuredCompleted / durationMs) * 1000 : 0;

	// Tail rate: throughput across the final 60s of the active window.
	// Approximates the architectural ceiling — ignores both warm-up and any
	// mid-run drift (e.g. PG bloat, GC pressure building up over long runs).
	// Falls back to avg for short runs where the tail is the whole run.
	const TAIL_WINDOW_MS = 60_000;
	let tailExecPerSec = avgExecPerSec;
	const tailStartTime = lastActiveSample.timestamp - TAIL_WINDOW_MS;
	const tailStartIndex = samples.findIndex((s) => s.timestamp >= tailStartTime);
	if (tailStartIndex > 0 && tailStartIndex < lastActiveIndex) {
		const tailAnchor = samples[tailStartIndex];
		const tailCompletions = lastActiveSample.completed - tailAnchor.completed;
		const tailDurationMs = lastActiveSample.timestamp - tailAnchor.timestamp;
		if (tailDurationMs > 0) {
			tailExecPerSec = (tailCompletions / tailDurationMs) * 1000;
		}
	}

	// Phase split: for steady-rate runs, separate "rate while publishing" from
	// "rate while draining backlog". Each phase has different load characteristics
	// so reporting one averaged number is misleading.
	let inputPhaseExecPerSec: number | undefined;
	let inputPhaseCompleted: number | undefined;
	let inputPhaseDurationMs: number | undefined;
	let drainPhaseExecPerSec: number | undefined;
	let drainPhaseCompleted: number | undefined;
	let drainPhaseDurationMs: number | undefined;

	if (publishEndAt !== undefined) {
		const inputSamples = samples.filter((s) => s.timestamp <= publishEndAt);
		const drainSamples = samples.filter((s) => s.timestamp > publishEndAt);

		// Bound each phase by its LAST ACTIVE sample so post-completion stall
		// padding doesn't dilute the rate (same trick the tail-rate calc above uses).
		const lastActiveOf = (s: ThroughputSample[]) => s.findLast((x) => x.delta > 0);

		if (inputSamples.length > 0) {
			const lastActive = lastActiveOf(inputSamples) ?? inputSamples[inputSamples.length - 1];
			inputPhaseCompleted = lastActive.completed;
			inputPhaseDurationMs = lastActive.timestamp - startTime;
			inputPhaseExecPerSec =
				inputPhaseDurationMs > 0 ? (inputPhaseCompleted / inputPhaseDurationMs) * 1000 : 0;
		}

		if (drainSamples.length > 0) {
			const lastActive = lastActiveOf(drainSamples);
			const drainStart = inputSamples[inputSamples.length - 1] ?? { completed: 0 };
			if (lastActive !== undefined) {
				drainPhaseCompleted = lastActive.completed - drainStart.completed;
				drainPhaseDurationMs = lastActive.timestamp - publishEndAt;
				drainPhaseExecPerSec =
					drainPhaseDurationMs > 0 ? (drainPhaseCompleted / drainPhaseDurationMs) * 1000 : 0;
			} else {
				// No active drain samples — drain finished within input phase or counter
				// never advanced after publish ended.
				drainPhaseCompleted = 0;
				drainPhaseDurationMs = 0;
				drainPhaseExecPerSec = 0;
			}
		}
	}

	// Per-stage split for staged-rate runs. boundaries[i] = stage i's start;
	// boundaries[i+1] = stage i's end. Each stage's completion delta is the
	// difference in cumulative count between its start and end boundaries.
	let perStage: StageMeasurement[] | undefined;
	if (stageBoundaries !== undefined && stageBoundaries.length >= 2) {
		perStage = [];
		// Helper: cumulative count at the latest sample whose timestamp <= t.
		// Returns 0 if no samples yet by that timestamp.
		const completedAt = (t: number): number => {
			let value = 0;
			for (const s of samples) {
				if (s.timestamp <= t) value = s.completed;
				else break;
			}
			return value;
		};
		for (let i = 0; i < stageBoundaries.length - 1; i++) {
			const stageStart = stageBoundaries[i];
			const stageEnd = stageBoundaries[i + 1];
			const completedAtStart = completedAt(stageStart);
			const completedAtEnd = completedAt(stageEnd);
			const completedDuringStage = completedAtEnd - completedAtStart;
			const durationMs = stageEnd - stageStart;
			perStage.push({
				stageIndex: i,
				startTimestamp: stageStart,
				endTimestamp: stageEnd,
				completedDuringStage,
				durationMs,
				execPerSec: durationMs > 0 ? (completedDuringStage / durationMs) * 1000 : 0,
			});
		}
	}

	return {
		totalCompleted,
		durationMs,
		avgExecPerSec,
		tailExecPerSec,
		peakExecPerSec: 0,
		actionsPerSec: avgExecPerSec * nodeCount,
		tailActionsPerSec: tailExecPerSec * nodeCount,
		peakActionsPerSec: 0,
		samples,
		inputPhaseExecPerSec,
		inputPhaseCompleted,
		inputPhaseDurationMs,
		drainPhaseExecPerSec,
		drainPhaseCompleted,
		drainPhaseDurationMs,
		perStage,
	};
}

// --- Result reporting ---

export async function attachThroughputResults(
	testInfo: TestInfo,
	dimensions: Record<string, string | number>,
	result: ThroughputResult,
): Promise<void> {
	await attachMetric(testInfo, 'exec-per-sec', result.avgExecPerSec, 'exec/s', dimensions);
	await attachMetric(testInfo, 'actions-per-sec', result.actionsPerSec, 'actions/s', dimensions);
	await attachMetric(testInfo, 'tail-exec-per-sec', result.tailExecPerSec, 'exec/s', dimensions);
	await attachMetric(
		testInfo,
		'tail-actions-per-sec',
		result.tailActionsPerSec,
		'actions/s',
		dimensions,
	);
	await attachMetric(testInfo, 'total-completed', result.totalCompleted, 'count', dimensions);
	await attachMetric(testInfo, 'duration', result.durationMs, 'ms', dimensions);
}
