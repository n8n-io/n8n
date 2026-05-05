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
import type { BenchmarkDimensions, DiagnosticsResult } from '../../../../utils/benchmark';

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
	/** Cumulative `pg_stat_wal` counters captured post-warm-up. Diffed at end-of-run. */
	walBaseline?: { walRecords: number; walBytes: number; walFpi: number } | null;
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

	// Snapshot pg_stat_wal post-warm-up so the saturation reporter can show
	// WAL growth attributable to the measured load only. pg_stat_wal can't be
	// reset per-database, so we capture and diff manually.
	let walBaseline: SetupResult['walBaseline'] = null;
	try {
		walBaseline = (await ctx.services.postgres?.pgStatWal()) ?? null;
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
		walBaseline,
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
 * Logs the top-N queries from `pg_stat_statements`, ranked by total ms/s of
 * work (calls/s × avg ms) rather than raw call count. Lets benchmarks attribute
 * actual capacity consumption to specific queries — a 0.00ms statement at
 * 12k/s consumes effectively zero PG capacity and would otherwise crowd out
 * the queries that actually move throughput. `setupBenchmarkRun` resets the
 * stat counters post-warm-up, so the breakdown reflects measured load only.
 *
 * NOTE: this view captures only the top N statements by exec+plan time. It
 * misses the long tail (auth, settings reads, etc.) and excludes work that
 * never appears in pg_stat_statements (autovacuum, WAL, lock manager). Pair
 * with `reportPgSaturation` for the full PG CPU picture.
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
		// Fetch a wider window than `limit` so the cost-based re-ranking has room
		// to surface heavy-but-rarely-called queries that the call-count ordering
		// would otherwise drop.
		rows = await services.postgres.topStatements(limit * 2);
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

	const ranked = rows
		.map((r) => ({
			...r,
			callsPerSec: r.calls / elapsedSec,
			totalMsPerSec: r.totalMs / elapsedSec,
		}))
		.sort((a, b) => b.totalMsPerSec - a.totalMsPerSec)
		.slice(0, limit);

	const lines = ranked.map(
		(r) =>
			`    ${r.totalMsPerSec.toFixed(1).padStart(7)} ms/s` +
			` | ${r.callsPerSec.toFixed(1).padStart(7)} calls/s` +
			` | ${r.meanMs.toFixed(2).padStart(6)} ms avg` +
			` | ${r.query}`,
	);

	console.log(
		`[PG QUERIES] Top ${ranked.length} by total ms/s (calls/s × avg ms, over ${elapsedSec.toFixed(1)}s):`,
	);
	for (const line of lines) console.log(line);
}

/**
 * Logs PG saturation signals the per-query reporter misses: total query CPU
 * across ALL statements (not just top-N), background-writer / WAL pressure,
 * buffer hit ratio, and per-backend-type IO from `pg_stat_io`. Without this
 * block, low avg-ms numbers in `[PG QUERIES]` make PG look idle even when it
 * is at 300%+ CPU due to planning, autovacuum, and tail queries.
 */
export async function reportPgSaturation(ctx: {
	services: ServiceHelpers;
	durationMs: number;
	diagnostics?: DiagnosticsResult;
	walBaseline?: { walRecords: number; walBytes: number; walFpi: number } | null;
}): Promise<void> {
	const { services, durationMs, diagnostics, walBaseline } = ctx;
	const elapsedSec = durationMs / 1000;
	if (elapsedSec <= 0) return;

	let totals: Awaited<ReturnType<typeof services.postgres.totalStatementsCost>> | undefined;
	let io: Awaited<ReturnType<typeof services.postgres.pgStatIo>> = [];
	let wal: Awaited<ReturnType<typeof services.postgres.pgStatWal>> = null;
	try {
		totals = await services.postgres.totalStatementsCost();
		io = await services.postgres.pgStatIo();
		wal = await services.postgres.pgStatWal();
	} catch (error) {
		console.warn(
			`[PG SATURATION] Could not collect saturation stats: ${error instanceof Error ? error.message : String(error)}`,
		);
		return;
	}

	const lines: string[] = [`[PG SATURATION] over ${elapsedSec.toFixed(1)}s`];
	if (totals) {
		const execPerSec = totals.totalExecMs / elapsedSec;
		const planPerSec = totals.totalPlanMs / elapsedSec;
		const cpuPerSec = execPerSec + planPerSec;
		const planNote =
			totals.totalPlanMs === 0
				? ' (plan time NOT tracked — set BENCH_DEEP_DIAGNOSTICS=true to enable)'
				: '';
		lines.push(
			`  Total query CPU:   ${cpuPerSec.toFixed(0)} ms/s ` +
				`(exec ${execPerSec.toFixed(0)} + plan ${planPerSec.toFixed(0)}) across ${totals.statementCount} distinct statements${planNote}`,
		);
	}

	if (diagnostics) {
		if (diagnostics.pgBufferHitRatio !== undefined) {
			lines.push(`  Buffer hit ratio:  ${(diagnostics.pgBufferHitRatio * 100).toFixed(2)}%`);
		}
		if (diagnostics.pgBlocksReadRate !== undefined) {
			lines.push(`  Block reads:       ${diagnostics.pgBlocksReadRate.toFixed(1)}/s`);
		}
		if (
			diagnostics.pgBgwriterCheckpointsTimedRate !== undefined ||
			diagnostics.pgBgwriterCheckpointsReqRate !== undefined
		) {
			const timed = diagnostics.pgBgwriterCheckpointsTimedRate ?? 0;
			const req = diagnostics.pgBgwriterCheckpointsReqRate ?? 0;
			lines.push(
				`  Checkpoints:       ${(timed + req).toFixed(2)}/s (${timed.toFixed(2)} timed, ${req.toFixed(2)} requested)`,
			);
		}
		if (diagnostics.pgBgwriterBuffersBackendRate !== undefined) {
			lines.push(
				`  Backend flushes:   ${diagnostics.pgBgwriterBuffersBackendRate.toFixed(1)} buffers/s`,
			);
		}
	}

	if (wal && walBaseline) {
		const recordsDelta = Math.max(0, wal.walRecords - walBaseline.walRecords);
		const bytesDelta = Math.max(0, wal.walBytes - walBaseline.walBytes);
		const fpiDelta = Math.max(0, wal.walFpi - walBaseline.walFpi);
		lines.push(
			`  WAL writes:        ${(bytesDelta / 1024 / 1024 / elapsedSec).toFixed(2)} MB/s ` +
				`(${(recordsDelta / elapsedSec).toFixed(0)} records/s, ${(fpiDelta / elapsedSec).toFixed(1)} FPI/s)`,
		);
	}

	if (io.length > 0) {
		lines.push('  pg_stat_io (totals over run):');
		for (const row of io) {
			const total = row.reads + row.writes + row.extends;
			if (total === 0) continue;
			lines.push(
				`    ${row.backendType.padEnd(20)} reads ${row.reads
					.toString()
					.padStart(7)} | writes ${row.writes
					.toString()
					.padStart(7)} | extends ${row.extends.toString().padStart(5)}`,
			);
		}
	}

	for (const line of lines) console.log(line);
}

/**
 * Logs per-container CPU/memory/IO from cAdvisor. Without this block, hitting
 * the OS-level PG CPU ceiling (e.g. 350% locally) is invisible to the harness
 * and the per-query reporter happily reports low avg-ms numbers because PG
 * spends much of its CPU on planning, autovacuum, and lock manager work that
 * never appears in pg_stat_statements.
 */
export function reportContainerStats(diagnostics: DiagnosticsResult): void {
	const { containerStats } = diagnostics;
	if (!containerStats || containerStats.length === 0) {
		// Silent skip is misleading — explicitly note the gap so a missing block
		// doesn't get mistaken for "containers were idle." Most likely cause is
		// cAdvisor not enabled in the bench profile or VictoriaMetrics not yet
		// scraping its `/metrics` endpoint.
		console.log(
			'[CONTAINERS] No data — verify cAdvisor is in the bench profile and `container_label_com_docker_compose_service` is queryable in VictoriaMetrics.',
		);
		return;
	}

	const fmtMb = (bytes?: number) =>
		bytes !== undefined ? `${(bytes / 1024 / 1024).toFixed(0)} MB` : 'N/A';
	const fmtMbPerSec = (bytes?: number) =>
		bytes !== undefined ? `${(bytes / 1024 / 1024).toFixed(2)} MB/s` : 'N/A';
	const fmtPct = (pct?: number) => (pct !== undefined ? `${pct.toFixed(0)}%` : 'N/A');

	const lines = ['[CONTAINERS]'];
	for (const c of containerStats) {
		const cpu = `CPU avg ${fmtPct(c.cpuPct).padStart(5)} peak ${fmtPct(c.cpuPctPeak).padStart(5)}`;
		const mem = `Mem avg ${fmtMb(c.memBytes).padStart(7)} peak ${fmtMb(c.memBytesPeak).padStart(7)}`;
		const io = `IO ${fmtMbPerSec(c.fsReadsBytesRate)} read / ${fmtMbPerSec(c.fsWritesBytesRate)} write`;
		const net = `Net ${fmtMbPerSec(c.netRxBytesRate)} rx / ${fmtMbPerSec(c.netTxBytesRate)} tx`;
		lines.push(`  ${c.name.padEnd(12)} ${cpu} | ${mem} | ${io} | ${net}`);
	}
	for (const line of lines) console.log(line);
}

/**
 * Fetches OTEL traces from Jaeger for the test's active window and attaches
 * them as a JSON artifact (`jaeger-traces.json`). No-op if the tracing
 * service isn't enabled for this spec — callers can invoke unconditionally.
 *
 * Re-import locally with `scripts/import-jaeger-traces.mjs`.
 */
export async function reportJaegerTraces(ctx: {
	testInfo: TestInfo;
	services: ServiceHelpers;
	since: Date | number;
}): Promise<void> {
	let tracing;
	try {
		tracing = ctx.services.tracing;
	} catch {
		return; // tracing service not part of this spec's stack
	}
	if (!tracing) return;

	const since = ctx.since instanceof Date ? ctx.since : new Date(ctx.since);

	try {
		const traces = await tracing.fetchTraces({ since });
		if (traces.length === 0) {
			console.log('[OTEL] No traces returned — Jaeger may have evicted them or n8n emitted none.');
			return;
		}

		await ctx.testInfo.attach('jaeger-traces.json', {
			body: JSON.stringify(traces),
			contentType: 'application/json',
		});

		console.log(
			`[OTEL] Attached ${traces.length} traces from Jaeger to test artifacts (jaeger-traces.json).`,
		);
	} catch (error) {
		console.warn(
			`[OTEL] Failed to fetch traces from Jaeger: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
