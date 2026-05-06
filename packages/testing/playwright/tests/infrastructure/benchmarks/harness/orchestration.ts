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
import { attachMetric } from '../../../../utils/performance-helper';

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

export async function reportDiagnostics(ctx: ReportDiagnosticsContext) {
	const obs = ctx.services.observability;
	const diagnostics = await collectDiagnostics(obs.metrics, ctx.durationMs);
	await attachDiagnostics(ctx.testInfo, ctx.dimensions, diagnostics);
	return diagnostics;
}

/**
 * Top-N queries from `pg_stat_statements`, ranked by total ms/s of work
 * (calls/s × avg ms) rather than raw call count. A 0.00ms statement at 12k/s
 * (e.g. `SET search_path`) consumes effectively zero capacity but would top a
 * call-count ranking — cost ranking surfaces the queries that move throughput.
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
		// Wider fetch so the cost re-rank can surface heavy-but-rare queries.
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
 * PG saturation signals the per-query reporter misses: total query CPU across
 * ALL statements (planning + the long tail of statements below the top-N cap),
 * `pg_stat_io` per-backend totals, and cumulative `pg_stat_wal` counters.
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
 * Per-container CPU/memory/IO. Primary source is cAdvisor; falls back to the
 * docker-stats sampler when cAdvisor can't reach the daemon (Docker Desktop).
 */
export async function reportContainerStats(
	diagnostics: DiagnosticsResult,
	sampler?: DockerStatsSampler,
): Promise<{ containers: ContainerStat[]; source: string }> {
	let { containerStats } = diagnostics;
	let source = 'cAdvisor (time-series)';

	if (!containerStats || containerStats.length === 0) {
		if (sampler) {
			const sampled = await sampler.stop();
			if (sampled.length > 0) {
				containerStats = sampled;
				source = `docker stats sampler (${sampler.sampleCount()} samples)`;
			}
		}
	} else if (sampler) {
		// Stop the sampler so it doesn't keep ticking after cAdvisor wins.
		await sampler.stop();
	}

	return { containers: containerStats ?? [], source };
}

/**
 * Attaches Jaeger traces from the active window as `jaeger-traces.json`. No-op
 * when the tracing service isn't part of the spec's stack. Re-import locally
 * with `scripts/import-jaeger-traces.mjs`.
 */
export async function reportJaegerTraces(ctx: {
	testInfo: TestInfo;
	services: ServiceHelpers;
	since: Date | number;
}): Promise<void> {
	// `services` is a Proxy that throws when accessing a helper for a service
	// that wasn't enabled in this spec's stack. Tracing is opt-in per spec, so
	// callers invoke unconditionally and we no-op when it's absent.
	let tracing;
	try {
		tracing = ctx.services.tracing;
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		if (msg.includes('Tracing service not found') || msg.includes('No helper factory')) return;
		throw error;
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
 * Assembles the structured `RunReport` from each reporter's slice and attaches
 * it as `run-report.json`. The report is the source of truth — console output
 * and BigQuery metrics are projections of it.
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

/** Renders forensic console blocks from a `RunReport`. */
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
	lines.push(
		`  Total query CPU:   ${cpuPerSec.toFixed(0)} ms/s ` +
			`(exec ${cpu.execMsPerSec.toFixed(0)} + plan ${cpu.planMsPerSec.toFixed(0)}) across ${pg.queries.statementCount} distinct statements`,
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
		const errorBreakdown = t.errorBreakdown ?? { transportErrors: 0, non2xx: 0 };
		const ratio = t.ingestionVsExecutionRatio?.toFixed(2) ?? 'N/A';
		const backlog = t.backlogGrowthPerSec ?? 0;
		console.log(
			`[WEBHOOK RESULT] ${report.scenario.spec}\n` +
				`  HTTP ingestion:    ${t.reqPerSec.toFixed(1)} req/s | p50: ${t.p50Ms ?? 'N/A'}ms | p99: ${t.p99Ms ?? 'N/A'}ms\n` +
				`  n8n execution:     ${(t.tailExecPerSec ?? t.execPerSec ?? 0).toFixed(1)} exec/s (tail 60s)\n` +
				`  Backlog growth:    ${backlog >= 0 ? '+' : ''}${backlog.toFixed(1)} msg/sec` +
				` (ingestion is ${ratio}× execution)\n` +
				`  Errors:            ${t.errors ?? 0}/${t.totalRequests ?? 0} (${(t.errorRatePct ?? 0).toFixed(2)}%)` +
				` | ${errorBreakdown.transportErrors} transport errors, ${errorBreakdown.non2xx} non-2xx\n` +
				`  Verdict:           ${t.verdict ?? 'N/A'}\n` +
				`  PG active conns:   ${pg?.saturation.activeConnections ?? 'N/A'}` +
				` | PG tx/s: ${pg?.saturation.txPerSec?.toFixed(0) ?? 'N/A'}` +
				` | Event loop lag: ${evLagMs}\n` +
				`  Duration: ${(report.duration.totalMs / 1000).toFixed(1)}s`,
		);
	}
	// Load scenarios print their own [LOAD RESULT] via `logLoadResult` in load-harness.
}

/**
 * Pushes saturation metrics from the report into the cross-run summary table
 * via `attachMetric`. Full report stays in `run-report.json`.
 */
export async function attachReportMetrics(
	testInfo: TestInfo,
	report: RunReport,
	dimensions: BenchmarkDimensions,
): Promise<void> {
	const pg = report.services.find((s): s is PostgresMetrics => s.kind === 'postgres');
	const containerByName = new Map(report.containers.map((c) => [c.name, c]));

	if (pg) {
		const cpu = pg.queries.totalCpu;
		const totalQueryCpu = cpu.execMsPerSec + cpu.planMsPerSec;
		const planPct = totalQueryCpu > 0 ? (cpu.planMsPerSec / totalQueryCpu) * 100 : 0;
		await attachMetric(testInfo, 'pg-query-cpu', totalQueryCpu, 'ms/s', dimensions);
		await attachMetric(testInfo, 'pg-plan-pct', planPct, '%', dimensions);
		if (pg.saturation.walMbPerSec !== undefined) {
			await attachMetric(testInfo, 'wal-mb-per-sec', pg.saturation.walMbPerSec, 'MB/s', dimensions);
		}
	}

	const pgContainer = containerByName.get('postgres');
	if (pgContainer) {
		await attachMetric(testInfo, 'pg-cpu-avg', pgContainer.cpuPct ?? 0, '%', dimensions);
		await attachMetric(testInfo, 'pg-cpu-peak', pgContainer.cpuPctPeak ?? 0, '%', dimensions);
	}

	// Average across replicas (n8n-main-1, -2, …) for the summary column.
	const avgCpuFor = (prefix: string): number | undefined => {
		const matches = report.containers.filter((c) => c.name.startsWith(prefix));
		if (matches.length === 0) return undefined;
		const sum = matches.reduce((acc, c) => acc + (c.cpuPct ?? 0), 0);
		return sum / matches.length;
	};
	const mainCpu = avgCpuFor('n8n-main');
	if (mainCpu !== undefined) {
		await attachMetric(testInfo, 'main-cpu-avg', mainCpu, '%', dimensions);
	}
	const workerCpu = avgCpuFor('n8n-worker');
	if (workerCpu !== undefined) {
		await attachMetric(testInfo, 'worker-cpu-avg', workerCpu, '%', dimensions);
	}
}
