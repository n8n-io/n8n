/**
 * Shared orchestration helpers used by all benchmark harnesses.
 *
 * Each harness (load, throughput, webhook-throughput) does the same
 * preamble (create workflow, wait for VictoriaMetrics, baseline, activate)
 * and the same epilogue (collect diagnostics, attach, log). Pulled here so
 * those phases stay consistent across harnesses without copy-paste.
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
 * because webhook readiness is a warm-up POST done by the caller post-setup.
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
 * Creates the workflow, waits for metrics to be ready, captures the baseline
 * counter, and activates the workflow. All harnesses share this preamble.
 */
export async function setupBenchmarkRun(ctx: SetupContext): Promise<SetupResult> {
	const metricQuery = ctx.metricQuery ?? resolveMetricQuery(ctx.testInfo);
	const obs = ctx.services.observability;

	const { workflowId, createdWorkflow, webhookPath } =
		await ctx.api.workflows.createWorkflowFromDefinition(ctx.handle.workflow, {
			makeUnique: ctx.createOptions?.makeUnique ?? true,
			...(ctx.createOptions?.webhookPrefix !== undefined && {
				webhookPrefix: ctx.createOptions.webhookPrefix,
			}),
		});

	// VictoriaMetrics needs at least one scrape before queries return data.
	await obs.metrics.waitForMetric('n8n_version_info', {
		timeoutMs: 30_000,
		intervalMs: 2000,
		predicate: (results: unknown[]) => results.length > 0,
	});
	const baselineCounter = await getBaselineCounter(obs.metrics, metricQuery);

	const activationStart = Date.now();
	await ctx.api.workflows.activate(workflowId, createdWorkflow.versionId!);
	if (ctx.handle.waitForReady) {
		await ctx.handle.waitForReady({ timeoutMs: 30_000 });
	}

	// Reset pg_stat_statements so the post-run breakdown reflects only the
	// measurement window — not the workflow-creation + activation queries.
	// Best-effort: the postgres helper may not be wired or the extension may
	// be unavailable on a custom postgres image; we skip silently in that case.
	try {
		await ctx.services.postgres?.resetStatStatements();
	} catch {
		// non-fatal
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
 * vs postgres-exporter scrapes vs ORM overhead).
 *
 * Requires `pg_stat_statements` extension — enabled in the postgres testcontainer.
 * Caller is responsible for calling `services.postgres.resetStatStatements()`
 * before the measurement window starts; otherwise stats include startup queries.
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
