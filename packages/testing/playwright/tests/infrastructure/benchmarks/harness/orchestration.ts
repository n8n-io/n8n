/**
 * Shared orchestration helpers used by every benchmark harness.
 *
 * Both harnesses (load, webhook-throughput) share the same preamble (create →
 * activate → optional warm-up → baseline) and epilogue (collect + attach +
 * log diagnostics). Pulled here so those phases stay consistent.
 */
import type { TestInfo } from '@playwright/test';
import type { ServiceHelpers } from 'n8n-containers/services/types';
import type { IWorkflowBase } from 'n8n-workflow';

import type { ApiHelpers } from '../../../../services/api-helper';
import {
	attachDiagnostics,
	collectDiagnostics,
	formatDiagnosticValue,
	getBaselineCounter,
	resolveMetricQuery,
} from '../../../../utils/benchmark';
import type { BenchmarkDimensions } from '../../../../utils/benchmark';

/**
 * Minimal handle shape used by setup. Both `TriggerHandle` (Kafka) and the
 * webhook driver's lightweight handle satisfy this; `waitForReady` is optional
 * because some triggers don't have a readiness signal.
 */
export interface BenchmarkHandle {
	workflow: Partial<IWorkflowBase>;
	waitForReady?: (options?: { timeoutMs?: number }) => Promise<void>;
}

export interface CreateWorkflowOptions {
	makeUnique?: boolean;
	/** Override the workflow's webhook node `path` parameter at creation time. */
	webhookPrefix?: string;
}

export interface SetupContext {
	api: ApiHelpers;
	services: ServiceHelpers;
	testInfo: TestInfo;
	handle: BenchmarkHandle;
	/** Override for the PromQL completion metric. Defaults to `resolveMetricQuery(testInfo)`. */
	metricQuery?: string;
	/** Forwarded to `createWorkflowFromDefinition`. `makeUnique` defaults to true. */
	createOptions?: CreateWorkflowOptions;
	/**
	 * Optional warm-up step (e.g. a webhook probe) that runs after activation
	 * and before the baseline counter is captured. Anything the warm-up
	 * triggers won't pollute the measurement window.
	 */
	warmUp?: (setup: { workflowId: string; webhookPath?: string }) => Promise<void>;
}

export interface SetupResult {
	workflowId: string;
	versionId: string;
	/** Webhook path resolved at creation (only meaningful for webhook-trigger workflows). */
	webhookPath?: string;
	baselineCounter: number;
	metricQuery: string;
	/** Wall-clock when the workflow finished activating — useful as a fallback timer. */
	activationStart: number;
}

/**
 * Shared preamble for every benchmark: create workflow, activate, run an
 * optional warm-up, then capture the baseline counter and reset pg_stat_statements.
 *
 * Order matters — baseline is captured AFTER warm-up so probe requests don't
 * count against the measurement window. The pg_stat_statements reset is also
 * post-warm-up so the per-query breakdown reflects only measured load.
 */
export async function setupBenchmarkRun(ctx: SetupContext): Promise<SetupResult> {
	const metricQuery = ctx.metricQuery ?? resolveMetricQuery(ctx.testInfo);
	const obs = ctx.services.observability;

	const { workflowId, createdWorkflow, webhookPath } =
		await ctx.api.workflows.createWorkflowFromDefinition(ctx.handle.workflow, {
			makeUnique: ctx.createOptions?.makeUnique ?? true,
			webhookPrefix: ctx.createOptions?.webhookPrefix,
		});

	// VictoriaMetrics needs at least one scrape before queries return data.
	await obs.metrics.waitForMetric('n8n_version_info', {
		timeoutMs: 30_000,
		intervalMs: 2000,
		predicate: (results: unknown[]) => results.length > 0,
	});

	const activationStart = Date.now();
	await ctx.api.workflows.activate(workflowId, createdWorkflow.versionId!);
	if (ctx.handle.waitForReady) {
		await ctx.handle.waitForReady({ timeoutMs: 30_000 });
	}
	if (ctx.warmUp) {
		await ctx.warmUp({ workflowId, webhookPath });
	}

	const baselineCounter = await getBaselineCounter(obs.metrics, metricQuery);

	// Best-effort: the postgres helper may not be wired or pg_stat_statements
	// may not be available on a custom postgres image.
	try {
		await ctx.services.postgres?.resetStatStatements();
	} catch {
		/* non-fatal */
	}

	return {
		workflowId,
		versionId: createdWorkflow.versionId!,
		webhookPath,
		baselineCounter,
		metricQuery,
		activationStart,
	};
}

export interface ReportDiagnosticsContext {
	testInfo: TestInfo;
	services: ServiceHelpers;
	durationMs: number;
	dimensions: BenchmarkDimensions;
}

/**
 * Collects + attaches + logs the standard diagnostics block. Returns the
 * collected diagnostics so callers can include any field in their own summary.
 */
export async function reportDiagnostics(ctx: ReportDiagnosticsContext) {
	const obs = ctx.services.observability;
	const diagnostics = await collectDiagnostics(obs.metrics, ctx.durationMs);
	await attachDiagnostics(ctx.testInfo, ctx.dimensions, diagnostics);

	const fmt = formatDiagnosticValue;
	console.log(
		`[DIAG] ${ctx.testInfo.title}\n` +
			`  Event Loop Lag: ${fmt(diagnostics.eventLoopLag, 's')}\n` +
			`  PG Transactions/s: ${fmt(diagnostics.pgTxRate, ' tx/s')}\n` +
			`  PG Active Connections: ${fmt(diagnostics.pgActiveConnections)}\n` +
			`  Queue Waiting: ${fmt(diagnostics.queueWaiting)}`,
	);

	return diagnostics;
}

/**
 * Logs the top-N queries by call count from `pg_stat_statements`.
 * Lets benchmarks attribute total tx/s to specific queries (n8n vs autovacuum
 * vs postgres-exporter scrapes vs ORM overhead). `setupBenchmarkRun` resets
 * the stat counters post-warm-up, so the breakdown reflects measured load only.
 */
export async function reportPgQueryBreakdown(ctx: {
	services: ServiceHelpers;
	durationMs: number;
	limit?: number;
}): Promise<void> {
	const { services, durationMs, limit = 12 } = ctx;
	const elapsedSec = durationMs / 1000;
	if (elapsedSec <= 0) return;

	let rows;
	try {
		rows = await services.postgres.topStatements(limit);
	} catch (error) {
		console.warn(
			`[PG QUERIES] Could not fetch pg_stat_statements: ${error instanceof Error ? error.message : String(error)}`,
		);
		return;
	}

	if (rows.length === 0) {
		console.log('[PG QUERIES] No statements recorded — pg_stat_statements may be empty.');
		return;
	}

	const lines = rows.map((r) => {
		const callsPerSec = r.calls / elapsedSec;
		return (
			`    ${callsPerSec.toFixed(1).padStart(7)} calls/s` +
			` | ${r.calls.toString().padStart(7)} total` +
			` | ${r.meanMs.toFixed(2).padStart(6)} ms avg` +
			` | ${r.query}`
		);
	});

	console.log(`[PG QUERIES] Top ${rows.length} by call count (over ${elapsedSec.toFixed(1)}s):`);
	for (const line of lines) console.log(line);
}
