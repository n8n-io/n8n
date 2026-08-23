import { expect } from '@playwright/test';
import type { TestInfo } from '@playwright/test';
import type { ServiceHelpers } from 'n8n-containers/services/types';

import {
	attachReportMetrics,
	buildAndAttachRunReport,
	renderRunReport,
	reportContainerStats,
	reportDiagnostics,
	reportJaegerTraces,
	reportPgQueryBreakdown,
	reportPgSaturation,
	setupBenchmarkRun,
} from './orchestration';
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

export interface ResourceSummary {
	plan: { memory: number; cpu: number };
	workerPlan?: { memory: number; cpu: number };
	workers?: number;
}

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
	/** When provided, the result log includes a resource breakdown (mode/main/workers/total). */
	resourceSummary?: ResourceSummary;
	/**
	 * Short human label distinguishing this run from sibling runs of the same spec
	 * (e.g. `'10 nodes'`, `'10KB output'`). Surfaces in the reporter's Variant
	 * column. Specs that loop over scenarios should pass a different value per
	 * iteration so each shows as its own reporter row.
	 */
	variant?: string;
}

/**
 * Runs a single load test:
 *   setup → executeLoad (per-variant strategy) → report.
 *
 * Each load profile variant is handled by a focused executor in `load-executors.ts`.
 * Adding a new variant requires extending the discriminated union in `types.ts` and
 * adding a `case` to `executeLoad` — TypeScript fails the build until both are done.
 */
export async function runLoadTest(options: LoadTestOptions): Promise<ExecutionMetrics> {
	const { handle, api, services, testInfo, load, timeoutMs, trigger, resourceSummary, variant } =
		options;
	testInfo.setTimeout(timeoutMs + 120_000);

	const { nodeCount, nodeOutputSize } = handle.scenario;
	const dimensions = buildLoadDimensions({ trigger, nodeCount, nodeOutputSize, load });
	if (variant !== undefined) dimensions.variant = variant;

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

	const { totalDurationMs, wallClockMs } = computeDurations(exec, setup.activationStart);

	if (exec.throughputResult.totalCompleted < exec.expectedExecutions) {
		console.warn(
			`[LOAD] Only ${exec.throughputResult.totalCompleted}/${exec.expectedExecutions} completed after ${(wallClockMs / 1000).toFixed(1)}s wall-clock (${(totalDurationMs / 1000).toFixed(1)}s active) — results reflect partial completion`,
		);
	}

	// Duration sampling — empty when EXECUTIONS_DATA_SAVE_ON_SUCCESS=none.
	// Completion count comes from VictoriaMetrics regardless.
	const durations = await sampleExecutionDurations(api.workflows, setup.workflowId);
	const metrics = buildMetrics(exec.throughputResult.totalCompleted, 0, totalDurationMs, durations);

	// Staged loads emit one reporter row per stage with rate-specific variant + verdict.
	// Single-rate loads keep the legacy aggregate-row behaviour.
	const stagedLoad =
		load.type === 'staged' && (exec.throughputResult.perStage?.length ?? 0) > 0 ? load : null;
	if (stagedLoad) {
		await attachStagedResults(testInfo, dimensions, exec.throughputResult, stagedLoad);
	} else {
		await attachLoadTestResults(testInfo, dimensions, metrics);
		await attachPhaseMetrics(testInfo, dimensions, exec.throughputResult);
		// Tail rate (last 60s) — closest to the architectural ceiling. Reporter
		// surfaces this as the `tail/s` column. Skipped for staged runs where the
		// per-stage rates already convey the same information.
		await attachMetric(
			testInfo,
			'tail-exec-per-sec',
			exec.throughputResult.tailExecPerSec,
			'exec/s',
			dimensions,
		);
	}
	// Diagnostics are whole-run aggregates; tag with variant `whole run` for staged
	// tests so they don't render as an unlabeled row alongside per-stage rows.
	const diagnosticsDimensions: BenchmarkDimensions = stagedLoad
		? { ...dimensions, variant: 'whole run' }
		: dimensions;
	const diagnostics = await reportDiagnostics({
		testInfo,
		services,
		durationMs: totalDurationMs,
		dimensions: diagnosticsDimensions,
	});
	const { containers, source: containersSource } = await reportContainerStats(
		diagnostics,
		setup.dockerStatsSampler,
	);
	const pgQueries = await reportPgQueryBreakdown({ services, durationMs: totalDurationMs });
	const pgSaturation = await reportPgSaturation({ services, durationMs: totalDurationMs });
	await reportJaegerTraces({ testInfo, services, since: setup.activationStart });

	const report = await buildAndAttachRunReport({
		testInfo,
		scenario: { spec: testInfo.title, dimensions: diagnosticsDimensions },
		duration: { totalMs: totalDurationMs, wallClockMs },
		throughput: {
			execPerSec: metrics.throughputPerSecond,
			tailExecPerSec: exec.throughputResult.tailExecPerSec,
			p50Ms: metrics.p50DurationMs,
			p99Ms: metrics.p99DurationMs,
			totalCompleted: metrics.totalCompleted,
			errors: metrics.totalErrors,
		},
		containers,
		containersSource,
		diagnostics,
		pgQueries,
		pgSaturation,
		walBaseline: setup.walBaseline,
	});
	await attachReportMetrics(testInfo, report, diagnosticsDimensions);
	renderRunReport(report);

	logLoadResult(testInfo, metrics, exec, load, resourceSummary);

	expect(metrics.totalCompleted).toBeGreaterThan(0);

	return metrics;
}

/**
 * Emit one reporter row per stage for staged-rate loads. Each row carries the
 * stage's requested rate as `variant` and the verdict (kept up / falling
 * behind / saturated) so the summary table makes the breaking point obvious.
 */
async function attachStagedResults(
	testInfo: TestInfo,
	baseDimensions: BenchmarkDimensions,
	tp: ThroughputResult,
	load: Extract<LoadProfile, { type: 'staged' }>,
): Promise<void> {
	if (!tp.perStage) return;
	for (let i = 0; i < tp.perStage.length; i++) {
		const stage = load.stages[i];
		const measured = tp.perStage[i];
		if (!stage) continue;
		const efficiency = (measured.execPerSec / stage.ratePerSecond) * 100;
		const dimensions: BenchmarkDimensions = {
			...baseDimensions,
			variant: `${stage.ratePerSecond} msg/s`,
			verdict: verdictFor(efficiency),
			rate: stage.ratePerSecond,
			efficiency_pct: Math.round(efficiency),
		};
		await attachMetric(testInfo, 'exec-per-sec', measured.execPerSec, 'exec/s', dimensions);
		await attachMetric(
			testInfo,
			'total-completed',
			measured.completedDuringStage,
			'count',
			dimensions,
		);
		await attachMetric(testInfo, 'duration', measured.durationMs, 'ms', dimensions);
	}
}

function buildLoadDimensions(opts: {
	trigger: TriggerType;
	nodeCount: number;
	nodeOutputSize?: NodeOutputSize;
	load: LoadProfile;
}): BenchmarkDimensions {
	const dimensions: BenchmarkDimensions = { trigger: opts.trigger, nodes: opts.nodeCount };
	if (opts.nodeOutputSize !== undefined) dimensions.output = opts.nodeOutputSize;
	switch (opts.load.type) {
		case 'steady':
			dimensions.rate = opts.load.ratePerSecond;
			dimensions.duration_s = opts.load.durationSeconds;
			break;
		case 'preloaded':
			dimensions.messages = opts.load.count;
			break;
		case 'staged':
			dimensions.stages = opts.load.stages.length;
			dimensions.rate_min = Math.min(...opts.load.stages.map((s) => s.ratePerSecond));
			dimensions.rate_max = Math.max(...opts.load.stages.map((s) => s.ratePerSecond));
			break;
	}
	return dimensions;
}

/**
 * End-to-end duration: wall-clock minus the trailing stall-detection wait.
 * Anchoring on the last active sample keeps rate honest as completed/active_window —
 * no mixed measurement windows when the run bails out early.
 */
function computeDurations(
	exec: ExecutorResult,
	fallbackStart: number,
): { totalDurationMs: number; wallClockMs: number } {
	const start = exec.publishStart ?? fallbackStart;
	const wallClockMs = Date.now() - start;
	const lastActive = exec.throughputResult.samples.findLast((s) => s.delta > 0);
	const endToEndMs = lastActive !== undefined ? lastActive.timestamp - start : wallClockMs;
	return { totalDurationMs: endToEndMs > 0 ? endToEndMs : wallClockMs, wallClockMs };
}

async function attachPhaseMetrics(
	testInfo: TestInfo,
	dimensions: BenchmarkDimensions,
	tp: ThroughputResult,
): Promise<void> {
	const phases: Array<[string, number | undefined, string]> = [
		['input-phase-exec-per-sec', tp.inputPhaseExecPerSec, 'exec/s'],
		['input-phase-completed', tp.inputPhaseCompleted, 'count'],
		['drain-phase-exec-per-sec', tp.drainPhaseExecPerSec, 'exec/s'],
		['drain-phase-completed', tp.drainPhaseCompleted, 'count'],
	];
	for (const [name, value, unit] of phases) {
		if (value !== undefined) await attachMetric(testInfo, name, value, unit, dimensions);
	}
}

/**
 * Verdict label for "did the system keep up with input rate?" — shared across
 * staged and steady summaries so both speak the same language.
 */
type Verdict = 'kept up' | 'falling behind' | 'saturated';
function verdictFor(efficiency: number): Verdict {
	if (efficiency >= 95) return 'kept up';
	if (efficiency >= 75) return 'falling behind';
	return 'saturated';
}

function logLoadResult(
	testInfo: TestInfo,
	metrics: ExecutionMetrics,
	exec: ExecutorResult,
	load: LoadProfile,
	resourceSummary?: ResourceSummary,
): void {
	const summary =
		load.type === 'staged'
			? formatStagedSummary(exec.throughputResult, load)
			: formatPhaseSummary(exec.throughputResult, load);
	const resources = resourceSummary ? formatResourceSummary(resourceSummary) + '\n' : '';
	console.log(
		`[LOAD RESULT] ${testInfo.title}\n` +
			resources +
			`  Completed: ${metrics.totalCompleted}/${exec.expectedExecutions}\n` +
			`  Errors: ${metrics.totalErrors}\n` +
			`  Throughput (whole run): ${metrics.throughputPerSecond.toFixed(2)} exec/s` +
			summary +
			`\n  Duration avg: ${metrics.avgDurationMs.toFixed(0)}ms | ` +
			`p50: ${metrics.p50DurationMs.toFixed(0)}ms | ` +
			`p95: ${metrics.p95DurationMs.toFixed(0)}ms | ` +
			`p99: ${metrics.p99DurationMs.toFixed(0)}ms`,
	);
}

function formatStagedSummary(
	tp: ThroughputResult,
	load: Extract<LoadProfile, { type: 'staged' }>,
): string {
	if (!tp.perStage || tp.perStage.length === 0) return '';

	let lastKeptUp: number | undefined;
	let firstFell: number | undefined;

	let out = '\n  Per-stage breakdown:';
	for (let i = 0; i < tp.perStage.length; i++) {
		const stage = load.stages[i];
		const measured = tp.perStage[i];
		if (!stage) continue;
		const efficiency = (measured.execPerSec / stage.ratePerSecond) * 100;
		const verdict = verdictFor(efficiency);
		const symbol = efficiency >= 95 ? '✓' : '✗';
		out +=
			`\n    Stage ${i + 1} (${stage.ratePerSecond}/sec × ${stage.durationSeconds}s):` +
			` ${measured.execPerSec.toFixed(1)} exec/s (${efficiency.toFixed(0)}% — ${symbol} ${verdict})`;

		if (efficiency >= 95) lastKeptUp = stage.ratePerSecond;
		else firstFell ??= stage.ratePerSecond;
	}

	const breakingPoint =
		firstFell === undefined
			? 'Breaking point: not reached'
			: lastKeptUp !== undefined
				? `Breaking point: between ${lastKeptUp} and ${firstFell} msg/sec`
				: `Breaking point: at or below ${firstFell} msg/sec (first stage already saturated)`;
	return `${out}\n  ${breakingPoint}`;
}

function formatPhaseSummary(tp: ThroughputResult, load: LoadProfile): string {
	if (tp.inputPhaseExecPerSec === undefined || load.type !== 'steady') return '';

	const observed = tp.inputPhaseExecPerSec;
	const efficiency = (observed / load.ratePerSecond) * 100;
	const inputCompleted = tp.inputPhaseCompleted ?? 0;
	const expectedDuringInput = load.ratePerSecond * load.durationSeconds;
	const backlogAtPublishEnd = Math.max(0, expectedDuringInput - inputCompleted);
	const verdict =
		efficiency >= 75 && efficiency < 95
			? `falling behind (~${(load.ratePerSecond - observed).toFixed(0)}/sec backlog growth)`
			: verdictFor(efficiency);

	let out =
		`\n  Input phase (${load.ratePerSecond}/sec × ${load.durationSeconds}s):\n` +
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

function formatResourceSummary(summary: ResourceSummary): string {
	const { plan, workerPlan, workers = 0 } = summary;
	const wp = workerPlan ?? plan;
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
