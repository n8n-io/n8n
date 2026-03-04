/**
 * Throughput benchmark helpers — VictoriaMetrics counter-based completion tracking.
 *
 * Use this approach when you need sustained throughput measurement with per-interval
 * sampling. Better for benchmarks measuring aggregate throughput over time.
 *
 * For per-message tracking via consumer group lag with REST API duration statistics,
 * use `kafka-load-helper.ts` instead.
 */
import type { TestInfo } from '@playwright/test';
import type { MetricsHelper } from 'n8n-containers';

import { attachMetric } from './performance-helper';

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

const WORKFLOW_SUCCESS_QUERY = 'n8n_workflow_success_total';
const QUEUE_COMPLETED_QUERY = 'n8n_scaling_mode_queue_jobs_completed';

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

	while (Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

		try {
			const results = await metrics.query(metricQuery);
			const current = results.length > 0 ? results[0].value : 0;
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
		} catch (err) {
			console.log(`[THROUGHPUT] Query error: ${err instanceof Error ? err.message : String(err)}`);
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
		const results = await metrics.query(metricQuery);
		return results.length > 0 ? results[0].value : 0;
	} catch {
		return 0;
	}
}

function calculateThroughput(
	samples: ThroughputSample[],
	nodeCount: number,
	_startTime: number,
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

	// Duration measures from first completion observed to last completion.
	// This excludes VictoriaMetrics scrape lag before executions start appearing.
	const firstActive = samples.find((s) => s.delta > 0);
	const lastSample = samples[samples.length - 1];
	const totalCompleted = lastSample.completed;
	const durationMs = firstActive
		? lastSample.timestamp - firstActive.timestamp
		: lastSample.timestamp - _startTime;

	// Per-interval rates (delta / interval seconds)
	const intervalRates: number[] = [];
	for (let i = 0; i < samples.length; i++) {
		const intervalMs =
			i === 0 ? samples[0].timestamp - _startTime : samples[i].timestamp - samples[i - 1].timestamp;
		if (intervalMs > 0 && samples[i].delta > 0) {
			intervalRates.push((samples[i].delta / intervalMs) * 1000);
		}
	}

	const avgExecPerSec = durationMs > 0 ? (totalCompleted / durationMs) * 1000 : 0;
	const peakExecPerSec = intervalRates.length > 0 ? Math.max(...intervalRates) : 0;

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

// --- Exported constants for queue mode switching ---

export { WORKFLOW_SUCCESS_QUERY, QUEUE_COMPLETED_QUERY };
