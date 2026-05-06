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

import { DockerStatsSampler } from './docker-stats-fallback';
import type { ApiHelpers } from '../../../../services/api-helper';
import {
	attachDiagnostics,
	collectDiagnostics,
	diagnosticsToServiceEntries,
	formatDiagnosticValue,
	getBaselineCounter,
	resolveMetricQuery,
	RunReportBuilder,
} from '../../../../utils/benchmark';
import type {
	BenchmarkDimensions,
	ContainerStat,
	DiagnosticsResult,
	PostgresMetrics,
	RunReport,
	ScenarioInfo,
	ThroughputInfo,
	TopQuery,
} from '../../../../utils/benchmark';

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
	/**
	 * Background sampler that polls `docker stats` every few seconds during
	 * the run so per-container CPU/mem/IO can be reconstructed even when
	 * cAdvisor isn't reporting (Docker Desktop). `reportContainerStats`
	 * stops it and consumes its aggregates.
	 */
	dockerStatsSampler: DockerStatsSampler;
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

	// Start sampling docker stats post-warm-up so the reporter can show real
	// per-container CPU/mem during the measurement window when cAdvisor is
	// unavailable (notably on Docker Desktop). Cheap to run; ~3s cadence.
	const dockerStatsSampler = new DockerStatsSampler();
	dockerStatsSampler.start();

	return {
		workflowId,
		versionId: createdWorkflow.versionId!,
		webhookPath,
		baselineCounter,
		metricQuery,
		activationStart,
		walBaseline,
		dockerStatsSampler,
	};
}

export interface ReportDiagnosticsContext {
	testInfo: TestInfo;
	services: ServiceHelpers;
	durationMs: number;
	dimensions: BenchmarkDimensions;
}

/**
 * Collects diagnostics from VictoriaMetrics and attaches them to the test for
 * BigQuery aggregation. Pure data-collection — console rendering happens in
 * `renderRunReport` so the printed output stays a deterministic projection of
 * the structured `RunReport`.
 */
export async function reportDiagnostics(ctx: ReportDiagnosticsContext) {
	const obs = ctx.services.observability;
	const diagnostics = await collectDiagnostics(obs.metrics, ctx.durationMs);
	await attachDiagnostics(ctx.testInfo, ctx.dimensions, diagnostics);
	return diagnostics;
}

/**
 * Returns the top-N queries from `pg_stat_statements`, ranked by total ms/s
 * of work (calls/s × avg ms) rather than raw call count. Pure data — console
 * rendering happens in `renderRunReport`.
 *
 * Ranking by total ms/s avoids the trap where a 0.00ms statement at 12k/s
 * (e.g. `SET search_path`) tops a call-count ranking despite consuming
 * effectively zero PG capacity. `setupBenchmarkRun` resets the stat counters
 * post-warm-up so this reflects measured load only.
 */
export async function reportPgQueryBreakdown(ctx: {
	services: ServiceHelpers;
	durationMs: number;
	limit?: number;
}): Promise<TopQuery[]> {
	const { services, durationMs, limit = 12 } = ctx;
	const elapsedSec = durationMs / 1000;
	if (elapsedSec <= 0) return [];

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
		return [];
	}

	if (rows.length === 0) return [];

	return rows
		.map((r) => ({
			callsPerSec: r.calls / elapsedSec,
			totalMsPerSec: r.totalMs / elapsedSec,
			avgMs: r.meanMs,
			query: r.query,
		}))
		.sort((a, b) => b.totalMsPerSec - a.totalMsPerSec)
		.slice(0, limit);
}

/**
 * Returns PG saturation signals the per-query reporter misses: total query CPU
 * across ALL statements (not just top-N), `pg_stat_io` per-backend totals, and
 * cumulative `pg_stat_wal` counters. Pure data — console rendering happens in
 * `renderRunReport`.
 *
 * Without this slice, low avg-ms numbers in the per-query list would make PG
 * look idle even when it is at 300%+ CPU due to planning, autovacuum, and
 * tail queries.
 */
export async function reportPgSaturation(ctx: {
	services: ServiceHelpers;
	durationMs: number;
}): Promise<{
	totals?: Awaited<ReturnType<typeof ctx.services.postgres.totalStatementsCost>>;
	io: Awaited<ReturnType<typeof ctx.services.postgres.pgStatIo>>;
	wal: Awaited<ReturnType<typeof ctx.services.postgres.pgStatWal>>;
} | null> {
	const { services, durationMs } = ctx;
	const elapsedSec = durationMs / 1000;
	if (elapsedSec <= 0) return null;

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
		return null;
	}

	return { totals, io, wal };
}

/**
 * Returns per-container CPU/memory/IO. Primary source is cAdvisor (time-series
 * via VictoriaMetrics); fallback is the docker-stats sampler for environments
 * where cAdvisor can't reach the Docker daemon (notably Docker Desktop on
 * macOS, where cAdvisor only reports the host-level cgroup). Pure data —
 * console rendering happens in `renderRunReport`.
 *
 * The returned array carries an extra `__source` shape via attached metadata?
 * Not exposed here — callers tag the source separately via the report.
 */
export async function reportContainerStats(
	diagnostics: DiagnosticsResult,
	sampler?: DockerStatsSampler,
): Promise<{ containers: ContainerStat[]; source: string }> {
	let { containerStats } = diagnostics;
	let source = 'cAdvisor (time-series)';

	if (!containerStats || containerStats.length === 0) {
		// cAdvisor returned nothing — drain the periodic docker-stats sampler.
		// Per-second rates here are computed from delta of first vs last sample
		// during the measurement window, so they reflect actual run activity
		// (not post-run idle state).
		if (sampler) {
			const sampled = await sampler.stop();
			if (sampled.length > 0) {
				containerStats = sampled;
				source = `docker stats sampler (${sampler.sampleCount()} samples)`;
			}
		}
	} else if (sampler) {
		// cAdvisor data won — still stop the sampler so it doesn't keep ticking.
		await sampler.stop();
	}

	return { containers: containerStats ?? [], source };
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

/**
 * Assembles the structured `RunReport` from the slices each reporter returned
 * and attaches it as a `run-report.json` test artifact.
 *
 * The report is the single source of truth for the run — console output and
 * BigQuery summary metrics are projections of it. Designed to be LLM-feedable:
 * paste a single run-report.json into Claude (or any LLM) and ask "what's the
 * bottleneck?" gets a meaningful answer because every dimension is in one
 * self-describing blob.
 *
 * Schema is versioned (see `RunReport.schemaVersion`); new service kinds are
 * additive and don't bump the version.
 */
export async function buildAndAttachRunReport(ctx: {
	testInfo: TestInfo;
	scenario: ScenarioInfo;
	duration: { totalMs: number; wallClockMs: number };
	throughput: ThroughputInfo;
	containers: ContainerStat[];
	containersSource?: string;
	diagnostics: DiagnosticsResult;
	pgQueries: TopQuery[];
	pgSaturation: {
		totals?: {
			totalCalls: number;
			totalExecMs: number;
			totalPlanMs: number;
			statementCount: number;
		};
		io: Array<{ backendType: string; reads: number; writes: number; extends: number }>;
		wal: { walRecords: number; walBytes: number; walFpi: number } | null;
	} | null;
	walBaseline?: { walRecords: number; walBytes: number; walFpi: number } | null;
}): Promise<RunReport> {
	const {
		testInfo,
		scenario,
		duration,
		throughput,
		containers,
		containersSource,
		diagnostics,
		pgQueries,
		pgSaturation,
		walBaseline,
	} = ctx;
	const elapsedSec = Math.max(0.001, duration.totalMs / 1000);

	const builder = new RunReportBuilder(scenario, duration, throughput);
	builder.setContainers(containers, containersSource);

	// Postgres service entry — built from the saturation slice + top-N query
	// breakdown + diagnostics fields that originated from postgres-exporter.
	if (pgSaturation || pgQueries.length > 0) {
		const totals = pgSaturation?.totals;
		const wal = pgSaturation?.wal ?? null;
		const walRecordsDelta =
			wal && walBaseline ? Math.max(0, wal.walRecords - walBaseline.walRecords) : undefined;
		const walBytesDelta =
			wal && walBaseline ? Math.max(0, wal.walBytes - walBaseline.walBytes) : undefined;
		const walFpiDelta =
			wal && walBaseline ? Math.max(0, wal.walFpi - walBaseline.walFpi) : undefined;

		const postgres: PostgresMetrics = {
			kind: 'postgres',
			name: 'postgres',
			queries: {
				topByCost: pgQueries,
				totalCpu: {
					execMsPerSec: totals ? totals.totalExecMs / elapsedSec : 0,
					planMsPerSec: totals ? totals.totalPlanMs / elapsedSec : 0,
					planTimeTracked: totals ? totals.totalPlanMs > 0 : false,
				},
				statementCount: totals?.statementCount ?? 0,
			},
			saturation: {
				txPerSec: diagnostics.pgTxRate,
				activeConnections: diagnostics.pgActiveConnections,
				bufferHitRatio: diagnostics.pgBufferHitRatio,
				blocksReadPerSec: diagnostics.pgBlocksReadRate,
				walMbPerSec:
					walBytesDelta !== undefined ? walBytesDelta / 1024 / 1024 / elapsedSec : undefined,
				walRecordsPerSec: walRecordsDelta !== undefined ? walRecordsDelta / elapsedSec : undefined,
				walFpiPerSec: walFpiDelta !== undefined ? walFpiDelta / elapsedSec : undefined,
				bgwriterCheckpointsTimedRate: diagnostics.pgBgwriterCheckpointsTimedRate,
				bgwriterCheckpointsReqRate: diagnostics.pgBgwriterCheckpointsReqRate,
				bgwriterBuffersBackendRate: diagnostics.pgBgwriterBuffersBackendRate,
			},
			io: pgSaturation?.io ?? [],
			writes:
				diagnostics.pgInsertRate !== undefined
					? { insertsPerSec: diagnostics.pgInsertRate }
					: undefined,
		};
		builder.addService(postgres);
	}

	// n8n-main + n8n-worker entries from the legacy DiagnosticsResult kitchen
	// sink. Per-replica detail still lives in `containers[]`.
	for (const entry of diagnosticsToServiceEntries(diagnostics)) {
		builder.addService(entry);
	}

	const report = builder.build();
	await testInfo.attach('run-report.json', {
		body: JSON.stringify(report, null, 2),
		contentType: 'application/json',
	});
	return report;
}

/**
 * Renders all forensic console blocks from a `RunReport`. The JSON is the
 * source of truth; this function is purely a deterministic projection of it.
 *
 * Layout: [DIAG] → [CONTAINERS] → [PG QUERIES] → [PG SATURATION] →
 * [WEBHOOK RESULT] (when reqPerSec is set) or [LOAD RESULT] (otherwise).
 */
export function renderRunReport(report: RunReport): void {
	renderDiagBlock(report);
	renderContainersBlock(report);
	renderPgQueriesBlock(report);
	renderPgSaturationBlock(report);
	renderResultBlock(report);
	console.log(
		`[RUN REPORT] Attached run-report.json (${report.services.length} services, ${report.containers.length} containers).`,
	);
}

function getPostgresService(report: RunReport): PostgresMetrics | undefined {
	return report.services.find((s): s is PostgresMetrics => s.kind === 'postgres');
}

function getN8nMainService(report: RunReport) {
	return report.services.find((s) => s.kind === 'n8n-main');
}

function getN8nWorkerService(report: RunReport) {
	return report.services.find((s) => s.kind === 'n8n-worker');
}

function renderDiagBlock(report: RunReport): void {
	const fmt = formatDiagnosticValue;
	const main = getN8nMainService(report);
	const pg = getPostgresService(report);
	const worker = getN8nWorkerService(report);
	const eventLoopLag = main && main.kind === 'n8n-main' ? main.eventLoopLagSec : undefined;
	const queueWaiting = worker && worker.kind === 'n8n-worker' ? worker.queueWaiting : undefined;

	console.log(
		`[DIAG] ${report.scenario.spec}\n` +
			`  Event Loop Lag: ${fmt(eventLoopLag, 's')}\n` +
			`  PG Transactions/s: ${fmt(pg?.saturation.txPerSec, ' tx/s')}\n` +
			`  PG Active Connections: ${fmt(pg?.saturation.activeConnections)}\n` +
			`  Queue Waiting: ${fmt(queueWaiting)}`,
	);
}

function renderContainersBlock(report: RunReport): void {
	if (!report.containers || report.containers.length === 0) {
		console.log(
			'[CONTAINERS] No data — cAdvisor reported nothing AND `docker stats` sampler captured no samples. ' +
				'On Docker Desktop, cAdvisor often cannot reach the daemon socket; CI runs on Linux where it works.',
		);
		return;
	}

	const fmtMb = (bytes?: number) =>
		bytes !== undefined ? `${(bytes / 1024 / 1024).toFixed(0)} MB` : 'N/A';
	const fmtMbPerSec = (bytes?: number) =>
		bytes !== undefined ? `${(bytes / 1024 / 1024).toFixed(2)} MB/s` : 'N/A';
	const fmtPct = (pct?: number) => (pct !== undefined ? `${pct.toFixed(0)}%` : 'N/A');

	console.log(`[CONTAINERS] source: ${report.containersSource ?? 'unknown'}`);
	for (const c of report.containers) {
		const cpu = `CPU avg ${fmtPct(c.cpuPct).padStart(5)} peak ${fmtPct(c.cpuPctPeak).padStart(5)}`;
		const mem = `Mem avg ${fmtMb(c.memBytes).padStart(7)} peak ${fmtMb(c.memBytesPeak).padStart(7)}`;
		const io = `IO ${fmtMbPerSec(c.fsReadsBytesRate)} read / ${fmtMbPerSec(c.fsWritesBytesRate)} write`;
		const net = `Net ${fmtMbPerSec(c.netRxBytesRate)} rx / ${fmtMbPerSec(c.netTxBytesRate)} tx`;
		console.log(`  ${c.name.padEnd(12)} ${cpu} | ${mem} | ${io} | ${net}`);
	}
}

function renderPgQueriesBlock(report: RunReport): void {
	const pg = getPostgresService(report);
	const ranked = pg?.queries.topByCost ?? [];
	if (ranked.length === 0) {
		console.log('[PG QUERIES] No statements recorded — pg_stat_statements may be empty.');
		return;
	}
	const elapsedSec = report.duration.totalMs / 1000;
	console.log(
		`[PG QUERIES] Top ${ranked.length} by total ms/s (calls/s × avg ms, over ${elapsedSec.toFixed(1)}s):`,
	);
	for (const r of ranked) {
		console.log(
			`    ${r.totalMsPerSec.toFixed(1).padStart(7)} ms/s` +
				` | ${r.callsPerSec.toFixed(1).padStart(7)} calls/s` +
				` | ${r.avgMs.toFixed(2).padStart(6)} ms avg` +
				` | ${r.query}`,
		);
	}
}

function renderPgSaturationBlock(report: RunReport): void {
	const pg = getPostgresService(report);
	if (!pg) return;
	const elapsedSec = report.duration.totalMs / 1000;
	const lines: string[] = [`[PG SATURATION] over ${elapsedSec.toFixed(1)}s`];

	const cpu = pg.queries.totalCpu;
	const cpuPerSec = cpu.execMsPerSec + cpu.planMsPerSec;
	const planNote = !cpu.planTimeTracked
		? ' (plan time NOT tracked — set BENCH_DEEP_DIAGNOSTICS=true to enable)'
		: '';
	lines.push(
		`  Total query CPU:   ${cpuPerSec.toFixed(0)} ms/s ` +
			`(exec ${cpu.execMsPerSec.toFixed(0)} + plan ${cpu.planMsPerSec.toFixed(0)}) across ${pg.queries.statementCount} distinct statements${planNote}`,
	);

	const sat = pg.saturation;
	if (sat.bufferHitRatio !== undefined) {
		lines.push(`  Buffer hit ratio:  ${(sat.bufferHitRatio * 100).toFixed(2)}%`);
	}
	if (sat.blocksReadPerSec !== undefined) {
		lines.push(`  Block reads:       ${sat.blocksReadPerSec.toFixed(1)}/s`);
	}
	if (
		sat.bgwriterCheckpointsTimedRate !== undefined ||
		sat.bgwriterCheckpointsReqRate !== undefined
	) {
		const timed = sat.bgwriterCheckpointsTimedRate ?? 0;
		const req = sat.bgwriterCheckpointsReqRate ?? 0;
		lines.push(
			`  Checkpoints:       ${(timed + req).toFixed(2)}/s (${timed.toFixed(2)} timed, ${req.toFixed(2)} requested)`,
		);
	}
	if (sat.bgwriterBuffersBackendRate !== undefined) {
		lines.push(`  Backend flushes:   ${sat.bgwriterBuffersBackendRate.toFixed(1)} buffers/s`);
	}
	if (sat.walMbPerSec !== undefined && sat.walRecordsPerSec !== undefined) {
		lines.push(
			`  WAL writes:        ${sat.walMbPerSec.toFixed(2)} MB/s ` +
				`(${sat.walRecordsPerSec.toFixed(0)} records/s, ${(sat.walFpiPerSec ?? 0).toFixed(1)} FPI/s)`,
		);
	}

	if (pg.io.length > 0) {
		lines.push('  pg_stat_io (totals over run):');
		for (const row of pg.io) {
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

function renderResultBlock(report: RunReport): void {
	const t = report.throughput;
	const main = getN8nMainService(report);
	const pg = getPostgresService(report);
	const eventLoopLag = main && main.kind === 'n8n-main' ? main.eventLoopLagSec : undefined;
	const evLagMs = eventLoopLag !== undefined ? `${(eventLoopLag * 1000).toFixed(0)}ms` : 'N/A';

	if (t.reqPerSec !== undefined) {
		// Webhook scenario.
		const errorBreakdown = t.errorBreakdown ?? { timeouts: 0, non2xx: 0 };
		const ratio = t.ingestionVsExecutionRatio?.toFixed(2) ?? 'N/A';
		const backlog = t.backlogGrowthPerSec ?? 0;
		console.log(
			`[WEBHOOK RESULT] ${report.scenario.spec}\n` +
				`  HTTP ingestion:    ${t.reqPerSec.toFixed(1)} req/s | p50: ${t.p50Ms ?? 'N/A'}ms | p99: ${t.p99Ms ?? 'N/A'}ms\n` +
				`  n8n execution:     ${(t.tailExecPerSec ?? t.execPerSec ?? 0).toFixed(1)} exec/s (tail 60s)\n` +
				`  Backlog growth:    ${backlog >= 0 ? '+' : ''}${backlog.toFixed(1)} msg/sec` +
				` (ingestion is ${ratio}× execution)\n` +
				`  Errors:            ${t.errors ?? 0}/${t.totalRequests ?? 0} (${(t.errorRatePct ?? 0).toFixed(2)}%)` +
				` | ${errorBreakdown.timeouts} timeouts, ${errorBreakdown.non2xx} non-2xx\n` +
				`  Verdict:           ${t.verdict ?? 'N/A'}\n` +
				`  PG active conns:   ${pg?.saturation.activeConnections ?? 'N/A'}` +
				` | PG tx/s: ${pg?.saturation.txPerSec?.toFixed(0) ?? 'N/A'}` +
				` | Event loop lag: ${evLagMs}\n` +
				`  Duration: ${(report.duration.totalMs / 1000).toFixed(1)}s`,
		);
	}
	// Load scenarios already log via `logLoadResult` in load-harness; not
	// duplicating here keeps the output identical to what specs expect.
}
