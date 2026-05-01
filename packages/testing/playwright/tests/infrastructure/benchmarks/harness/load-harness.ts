import { expect } from '@playwright/test';
import type { TestInfo } from '@playwright/test';
import type { ServiceHelpers } from 'n8n-containers/services/types';

import { reportDiagnostics, reportPgQueryBreakdown, setupBenchmarkRun } from './orchestration';
import type { ApiHelpers } from '../../../../services/api-helper';
import {
	attachLoadTestResults,
	buildMetrics,
	executeLoad,
	sampleExecutionDurations,
} from '../../../../utils/benchmark';
import type {
	BenchmarkDimensions,
	ExecutionMetrics,
	ExecutorResult,
	LoadProfile,
	NodeOutputSize,
	ThroughputResult,
	TriggerHandle,
	TriggerType,
} from '../../../../utils/benchmark';
import { attachMetric } from '../../../../utils/performance-helper';

export interface LoadTestOptions {
	handle: TriggerHandle;
	api: ApiHelpers;
	services: ServiceHelpers;
	testInfo: TestInfo;
	load: LoadProfile;
	timeoutMs: number;
	/** Trigger type recorded as a dimension in BigQuery */
	trigger: TriggerType;
	/** PromQL metric to track workflow completions. Defaults to resolveMetricQuery(testInfo). */
	metricQuery?: string;
}

/**
 * Runs a single load test:
 *   setup (workflow + baseline + activate) → executeLoad (per-variant strategy) → report.
 *
 * Each load profile variant is handled by a focused executor in `load-executors.ts`.
 * Adding a new variant requires extending the discriminated union in `types.ts` and
 * adding a `case` to `executeLoad` — TypeScript fails the build until both are done.
 */
export async function runLoadTest(options: LoadTestOptions): Promise<ExecutionMetrics> {
	const { handle, api, services, testInfo, load, timeoutMs, trigger } = options;
	testInfo.setTimeout(timeoutMs + 120_000);

	const { nodeCount, nodeOutputSize } = handle.scenario;

	const dimensions = buildLoadDimensions({
		trigger,
		nodeCount,
		nodeOutputSize,
		load,
	});

	const setup = await setupBenchmarkRun({
		api,
		services,
		testInfo,
		handle,
		metricQuery: options.metricQuery,
	});

	const exec = await executeLoad(load, {
		handle,
		metrics: services.observability.metrics,
		baselineCounter: setup.baselineCounter,
		metricQuery: setup.metricQuery,
		timeoutMs,
		nodeCount,
	});

	const { totalDurationMs, wallClockMs } = computeDurations({
		exec,
		fallbackStart: setup.activationStart,
	});

	if (exec.throughputResult.totalCompleted < exec.expectedExecutions) {
		console.warn(
			`[LOAD] Only ${exec.throughputResult.totalCompleted}/${exec.expectedExecutions} completed after ${(wallClockMs / 1000).toFixed(1)}s wall-clock (${(totalDurationMs / 1000).toFixed(1)}s active) — results reflect partial completion`,
		);
	}

	// Duration sampling — may be empty when EXECUTIONS_DATA_SAVE_ON_SUCCESS=none.
	// Completion count comes from VictoriaMetrics regardless.
	const durations = await sampleExecutionDurations(api.workflows, setup.workflowId);
	const metrics = buildMetrics(exec.throughputResult.totalCompleted, 0, totalDurationMs, durations);

	await attachLoadTestResults(testInfo, dimensions, metrics);
	await attachPhaseMetrics(testInfo, dimensions, exec.throughputResult);
	await reportDiagnostics({ testInfo, services, durationMs: totalDurationMs, dimensions });
	await reportPgQueryBreakdown({ services, durationMs: totalDurationMs });

	logLoadResult({
		testInfo,
		metrics,
		expectedExecutions: exec.expectedExecutions,
		throughputResult: exec.throughputResult,
		load,
	});

	expect(metrics.totalCompleted).toBeGreaterThan(0);

	return metrics;
}

// --- Helpers (kept private to this harness; promote if reused elsewhere) ---

function buildLoadDimensions(opts: {
	trigger: TriggerType;
	nodeCount: number;
	nodeOutputSize?: NodeOutputSize;
	load: LoadProfile;
}): BenchmarkDimensions {
	const dimensions: BenchmarkDimensions = { trigger: opts.trigger };
	dimensions.nodes = opts.nodeCount;
	if (opts.nodeOutputSize !== undefined) dimensions.output = opts.nodeOutputSize;
	if (opts.load.type === 'steady') {
		dimensions.rate = opts.load.ratePerSecond;
		dimensions.duration_s = opts.load.durationSeconds;
	} else if (opts.load.type === 'preloaded') {
		dimensions.messages = opts.load.count;
	} else {
		// staged
		dimensions.stages = opts.load.stages.length;
		dimensions.rate_min = Math.min(...opts.load.stages.map((s) => s.ratePerSecond));
		dimensions.rate_max = Math.max(...opts.load.stages.map((s) => s.ratePerSecond));
	}
	return dimensions;
}

/**
 * End-to-end duration: wall-clock minus the trailing stall-detection wait.
 * Last active sample marks the moment work effectively stopped — anything
 * after it is the harness waiting for stragglers that never arrive. Using
 * `lastActive.timestamp - publishStart` keeps rate honest:
 * total_completed / active_window, no mixed windows.
 */
function computeDurations(opts: {
	exec: ExecutorResult;
	fallbackStart: number;
}): { totalDurationMs: number; wallClockMs: number } {
	const start = opts.exec.publishStart ?? opts.fallbackStart;
	const wallClockMs = Date.now() - start;
	const lastActive = opts.exec.throughputResult.samples
		.slice()
		.reverse()
		.find((s) => s.delta > 0);
	const endToEndMs = lastActive !== undefined ? lastActive.timestamp - start : wallClockMs;
	return { totalDurationMs: endToEndMs > 0 ? endToEndMs : wallClockMs, wallClockMs };
}

async function attachPhaseMetrics(
	testInfo: TestInfo,
	dimensions: BenchmarkDimensions,
	tp: ThroughputResult,
): Promise<void> {
	if (tp.inputPhaseExecPerSec !== undefined) {
		await attachMetric(
			testInfo,
			'input-phase-exec-per-sec',
			tp.inputPhaseExecPerSec,
			'exec/s',
			dimensions,
		);
		if (tp.inputPhaseCompleted !== undefined) {
			await attachMetric(
				testInfo,
				'input-phase-completed',
				tp.inputPhaseCompleted,
				'count',
				dimensions,
			);
		}
	}
	if (tp.drainPhaseExecPerSec !== undefined) {
		await attachMetric(
			testInfo,
			'drain-phase-exec-per-sec',
			tp.drainPhaseExecPerSec,
			'exec/s',
			dimensions,
		);
		if (tp.drainPhaseCompleted !== undefined) {
			await attachMetric(
				testInfo,
				'drain-phase-completed',
				tp.drainPhaseCompleted,
				'count',
				dimensions,
			);
		}
	}
}

function logLoadResult(opts: {
	testInfo: TestInfo;
	metrics: ExecutionMetrics;
	expectedExecutions: number;
	throughputResult: ThroughputResult;
	load: LoadProfile;
}): void {
	const summary =
		opts.load.type === 'staged'
			? formatStagedSummary(opts.throughputResult, opts.load)
			: formatPhaseSummary(opts.throughputResult, opts.load);
	console.log(
		`[LOAD RESULT] ${opts.testInfo.title}\n` +
			`  Completed: ${opts.metrics.totalCompleted}/${opts.expectedExecutions}\n` +
			`  Errors: ${opts.metrics.totalErrors}\n` +
			`  Throughput (whole run): ${opts.metrics.throughputPerSecond.toFixed(2)} exec/s` +
			summary +
			`\n  Duration avg: ${opts.metrics.avgDurationMs.toFixed(0)}ms | ` +
			`p50: ${opts.metrics.p50DurationMs.toFixed(0)}ms | ` +
			`p95: ${opts.metrics.p95DurationMs.toFixed(0)}ms | ` +
			`p99: ${opts.metrics.p99DurationMs.toFixed(0)}ms`,
	);
}

function formatStagedSummary(
	tp: ThroughputResult,
	load: Extract<LoadProfile, { type: 'staged' }>,
): string {
	if (!tp.perStage || tp.perStage.length === 0) return '';
	const stages = load.stages;

	let breakingPointMessage = 'Breaking point: not reached';
	let lastKeptUp: number | undefined;
	let firstFell: number | undefined;

	let out = '\n  Per-stage breakdown:';
	for (let i = 0; i < tp.perStage.length; i++) {
		const stage = stages[i];
		const measured = tp.perStage[i];
		if (!stage) continue;
		const efficiency = (measured.execPerSec / stage.ratePerSecond) * 100;
		const verdict =
			efficiency >= 95 ? 'kept up' : efficiency >= 75 ? 'falling behind' : 'saturated';
		const symbol = efficiency >= 95 ? '✓' : '✗';
		out +=
			`\n    Stage ${i + 1} (${stage.ratePerSecond}/sec × ${stage.durationSeconds}s):` +
			` ${measured.execPerSec.toFixed(1)} exec/s (${efficiency.toFixed(0)}% — ${symbol} ${verdict})`;

		if (efficiency >= 95) lastKeptUp = stage.ratePerSecond;
		else firstFell ??= stage.ratePerSecond;
	}

	if (firstFell !== undefined) {
		breakingPointMessage =
			lastKeptUp !== undefined
				? `Breaking point: between ${lastKeptUp} and ${firstFell} msg/sec`
				: `Breaking point: at or below ${firstFell} msg/sec (first stage already saturated)`;
	}
	out += `\n  ${breakingPointMessage}`;

	return out;
}

function formatPhaseSummary(tp: ThroughputResult, load: LoadProfile): string {
	if (tp.inputPhaseExecPerSec === undefined || load.type !== 'steady') return '';

	const inputRate = load.ratePerSecond;
	const observed = tp.inputPhaseExecPerSec;
	const efficiency = (observed / inputRate) * 100;
	const inputCompleted = tp.inputPhaseCompleted ?? 0;
	const expectedDuringInput = inputRate * load.durationSeconds;
	const backlogAtPublishEnd = Math.max(0, expectedDuringInput - inputCompleted);
	const verdict =
		efficiency >= 95
			? 'kept up'
			: efficiency >= 75
				? `falling behind (~${(inputRate - observed).toFixed(0)}/sec backlog growth)`
				: 'saturated';

	let out =
		`\n  Input phase (${inputRate}/sec × ${load.durationSeconds}s):\n` +
		`    Sustained:     ${observed.toFixed(1)} exec/s (${efficiency.toFixed(0)}% of input — ${verdict})\n` +
		`    Backlog at end: ${backlogAtPublishEnd.toFixed(0)} messages`;

	if (tp.drainPhaseExecPerSec !== undefined) {
		const drainDurMs = tp.drainPhaseDurationMs ?? 0;
		out +=
			`\n  Drain phase (${(drainDurMs / 1000).toFixed(1)}s after publish ends):\n` +
			`    Sustained: ${tp.drainPhaseExecPerSec.toFixed(1)} exec/s`;
	}

	return out;
}
