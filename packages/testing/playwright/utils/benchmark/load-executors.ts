/**
 * Load executors — one strategy per LoadProfile variant.
 *
 * The harness dispatches via `executeLoad` which switches on `load.type` with
 * compile-time exhaustiveness. Each variant has its own focused function that
 * owns its concurrency model and reporting needs. Adding a new load type:
 *  1. extend the `LoadProfile` discriminated union in `types.ts`
 *  2. add a `runX(...)` function below
 *  3. add a `case 'x':` to `executeLoad` (TypeScript fails the build until done)
 */
import type { MetricsHelper } from 'n8n-containers';

import { waitForThroughput } from './throughput-measure';
import type { ThroughputResult } from './throughput-measure';
import type { LoadProfile, TriggerHandle } from './types';

/** Context shared by every executor — metrics + measurement plumbing, no load specifics. */
export interface ExecutorContext {
	handle: TriggerHandle;
	metrics: MetricsHelper;
	baselineCounter: number;
	metricQuery: string;
	timeoutMs: number;
	nodeCount: number;
}

/** Uniform shape every executor returns. Optional fields populated only by relevant variants. */
export interface ExecutorResult {
	throughputResult: ThroughputResult;
	expectedExecutions: number;
	/** Wall-clock when load production started (set for steady; preloaded uses activation time). */
	publishStart?: number;
	/** Wall-clock when load production was scheduled to end (set for steady-rate runs only). */
	publishEndAt?: number;
	/** Stage boundaries for staged-rate runs (passed through for downstream reporting). */
	stageBoundaries?: number[];
}

type SteadyLoad = Extract<LoadProfile, { type: 'steady' }>;
type PreloadedLoad = Extract<LoadProfile, { type: 'preloaded' }>;
type StagedLoad = Extract<LoadProfile, { type: 'staged' }>;

async function runPreloaded(load: PreloadedLoad, ctx: ExecutorContext): Promise<ExecutorResult> {
	const result = await ctx.handle.preload(load.count);
	console.log(
		`[LOAD] Preloaded ${result.totalPublished} messages in ${result.publishDurationMs}ms`,
	);

	console.log(
		`[LOAD] Waiting for ${result.totalPublished} workflow completions (timeout: ${ctx.timeoutMs}ms)`,
	);
	// Anchor the measurement window to when we start consuming, not to
	// activation: preload time would otherwise inflate totalDurationMs and
	// undercount exec/s for preloaded scenarios.
	const publishStart = Date.now();
	const throughputResult = await waitForThroughput(ctx.metrics, {
		expectedCount: result.totalPublished,
		nodeCount: ctx.nodeCount,
		timeoutMs: ctx.timeoutMs,
		baselineValue: ctx.baselineCounter,
		metricQuery: ctx.metricQuery,
	});

	return {
		throughputResult,
		expectedExecutions: result.totalPublished,
		publishStart,
	};
}

async function runSteady(load: SteadyLoad, ctx: ExecutorContext): Promise<ExecutorResult> {
	const expectedTotal = load.ratePerSecond * load.durationSeconds;
	const publishStart = Date.now();
	const publishEndAt = publishStart + load.durationSeconds * 1000;

	console.log(
		`[LOAD] Publishing ${expectedTotal} messages at ${load.ratePerSecond}/sec for ${load.durationSeconds}s; sampling throughput in parallel (timeout: ${ctx.timeoutMs}ms)`,
	);

	// Publish + sample in parallel. If we awaited publish first, the throughput
	// counter would lump the entire publish window into a single first-sample
	// delta — losing the per-second rate during input.
	const [publishRes, throughputResult] = await Promise.all([
		ctx.handle.publishAtRate({
			ratePerSecond: load.ratePerSecond,
			durationSeconds: load.durationSeconds,
		}),
		waitForThroughput(ctx.metrics, {
			expectedCount: expectedTotal,
			nodeCount: ctx.nodeCount,
			timeoutMs: ctx.timeoutMs,
			baselineValue: ctx.baselineCounter,
			metricQuery: ctx.metricQuery,
			publishEndAt,
		}),
	]);

	console.log(
		`[LOAD] Published ${publishRes.totalPublished} messages in ${publishRes.actualDurationMs}ms`,
	);

	return {
		throughputResult,
		expectedExecutions: expectedTotal,
		publishStart,
		publishEndAt,
	};
}

async function runStaged(load: StagedLoad, ctx: ExecutorContext): Promise<ExecutorResult> {
	if (!ctx.handle.publishStaged) {
		throw new Error(
			'This trigger does not implement `publishStaged`. Cannot run a staged-rate ramp test.',
		);
	}

	const expectedTotal = load.stages.reduce(
		(sum, s) => sum + s.ratePerSecond * s.durationSeconds,
		0,
	);

	// Stage boundaries are predictable from the stages config: each boundary
	// is `start + cumulative_durations`. Computing them upfront lets the
	// throughput sampler split per-stage as soon as samples arrive.
	const publishStart = Date.now();
	const stageBoundaries: number[] = [publishStart];
	let cumMs = publishStart;
	for (const stage of load.stages) {
		cumMs += stage.durationSeconds * 1000;
		stageBoundaries.push(cumMs);
	}
	const publishEndAt = stageBoundaries[stageBoundaries.length - 1];

	const totalDurationDescription = `${load.stages.length} stages, ${(
		(publishEndAt - publishStart) / 1000
	).toFixed(0)}s total`;
	console.log(
		`[LOAD] Publishing staged ramp (${totalDurationDescription}, ${expectedTotal} messages); sampling throughput in parallel (timeout: ${ctx.timeoutMs}ms)`,
	);

	const [publishRes, throughputResult] = await Promise.all([
		ctx.handle.publishStaged(load.stages),
		waitForThroughput(ctx.metrics, {
			expectedCount: expectedTotal,
			nodeCount: ctx.nodeCount,
			timeoutMs: ctx.timeoutMs,
			baselineValue: ctx.baselineCounter,
			metricQuery: ctx.metricQuery,
			publishEndAt,
			stageBoundaries,
		}),
	]);

	console.log(
		`[LOAD] Staged publish complete: ${publishRes.totalPublished} messages across ${publishRes.stages.length} stages`,
	);

	return {
		throughputResult,
		expectedExecutions: expectedTotal,
		publishStart,
		publishEndAt,
		stageBoundaries,
	};
}

/**
 * Single dispatch point for load profiles. Compile-time exhaustive: adding a
 * variant to `LoadProfile` without handling it here fails type-checking via
 * `assertNever`.
 */
export async function executeLoad(
	load: LoadProfile,
	ctx: ExecutorContext,
): Promise<ExecutorResult> {
	switch (load.type) {
		case 'preloaded':
			return await runPreloaded(load, ctx);
		case 'steady':
			return await runSteady(load, ctx);
		case 'staged':
			return await runStaged(load, ctx);
		default:
			return assertNever(load);
	}
}

function assertNever(value: never): never {
	throw new Error(`Unhandled load profile: ${JSON.stringify(value)}`);
}
