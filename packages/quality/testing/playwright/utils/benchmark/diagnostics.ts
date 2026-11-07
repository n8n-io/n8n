import type { TestInfo } from '@playwright/test';
import type { MetricsHelper } from 'n8n-containers';

import { attachMetric } from '../performance-helper';

export interface DiagnosticsResult {
	eventLoopLag?: number;
	pgTxRate?: number;
	pgInsertRate?: number;
	pgActiveConnections?: number;
	queueWaiting?: number;
	queueActive?: number;
	queueCompletedRate?: number;
	queueFailedRate?: number;
	/** Postgres background writer activity. Populated from postgres-exporter. */
	pgBgwriterCheckpointsTimedRate?: number;
	pgBgwriterCheckpointsReqRate?: number;
	pgBgwriterBuffersBackendRate?: number;
	pgBufferHitRatio?: number;
	pgBlocksReadRate?: number;
	/** Container-level resource usage from cAdvisor. */
	containerStats?: ContainerStat[];
}

export interface ContainerStat {
	name: string;
	cpuPct?: number;
	cpuPctPeak?: number;
	memBytes?: number;
	memBytesPeak?: number;
	fsReadsBytesRate?: number;
	fsWritesBytesRate?: number;
	netRxBytesRate?: number;
	netTxBytesRate?: number;
}

function sumValues(results: Array<{ value: number }>): number | undefined {
	if (results.length === 0) return undefined;
	return results.reduce((sum, r) => sum + r.value, 0);
}

export function formatDiagnosticValue(v: number | undefined, unit = ''): string {
	return v !== undefined ? `${v.toFixed(2)}${unit}` : 'N/A';
}

/** Core diagnostic keys that should always be present when VictoriaMetrics has data. */
const EXPECTED_KEYS: Array<keyof DiagnosticsResult> = [
	'eventLoopLag',
	'pgTxRate',
	'pgActiveConnections',
];

/**
 * Service labels to query container stats for. cAdvisor exposes Docker labels
 * as `container_label_<dot_to_underscore>`, and every service we start sets
 * `com.docker.compose.service=<HOSTNAME>` on its container — this is far more
 * reliable than regex-matching on `name`, which varies by Docker version,
 * Docker Desktop, and Compose project name.
 */
const TRACKED_SERVICES = ['postgres', 'n8n-main', 'n8n-worker', 'redis', 'kafka', 'cadvisor'];

async function queryContainerStats(
	metrics: MetricsHelper,
	window: string,
): Promise<ContainerStat[]> {
	const stats: ContainerStat[] = [];
	for (const service of TRACKED_SERVICES) {
		// Use the compose-service label (set on every service we start).
		const sel = `{container_label_com_docker_compose_service="${service}"}`;
		// `rate(container_cpu_usage_seconds_total[w]) * 100` gives % of one core.
		// `sum without` collapses per-cpu / per-replica series so workers/mains
		// add together for the row.
		const cpuQuery = `sum(rate(container_cpu_usage_seconds_total${sel}[${window}])) * 100`;
		const cpuPeakQuery = `max_over_time((sum(rate(container_cpu_usage_seconds_total${sel}[30s])) * 100)[${window}:30s])`;
		const memQuery = `sum(avg_over_time(container_memory_working_set_bytes${sel}[${window}]))`;
		const memPeakQuery = `sum(max_over_time(container_memory_working_set_bytes${sel}[${window}]))`;
		const fsReadQuery = `sum(rate(container_fs_reads_bytes_total${sel}[${window}]))`;
		const fsWriteQuery = `sum(rate(container_fs_writes_bytes_total${sel}[${window}]))`;
		const netRxQuery = `sum(rate(container_network_receive_bytes_total${sel}[${window}]))`;
		const netTxQuery = `sum(rate(container_network_transmit_bytes_total${sel}[${window}]))`;

		const [cpu, cpuPeak, mem, memPeak, fsR, fsW, netRx, netTx] = await Promise.all([
			metrics.query(cpuQuery).catch(() => []),
			metrics.query(cpuPeakQuery).catch(() => []),
			metrics.query(memQuery).catch(() => []),
			metrics.query(memPeakQuery).catch(() => []),
			metrics.query(fsReadQuery).catch(() => []),
			metrics.query(fsWriteQuery).catch(() => []),
			metrics.query(netRxQuery).catch(() => []),
			metrics.query(netTxQuery).catch(() => []),
		]);

		// Empty result set means no container matched (service not running) — skip the row.
		if (cpu.length === 0 && mem.length === 0) continue;

		stats.push({
			name: service,
			cpuPct: sumValues(cpu),
			cpuPctPeak: sumValues(cpuPeak),
			memBytes: sumValues(mem),
			memBytesPeak: sumValues(memPeak),
			fsReadsBytesRate: sumValues(fsR),
			fsWritesBytesRate: sumValues(fsW),
			netRxBytesRate: sumValues(netRx),
			netTxBytesRate: sumValues(netTx),
		});
	}
	return stats;
}

async function queryDiagnostics(
	metrics: MetricsHelper,
	durationMs: number,
): Promise<DiagnosticsResult> {
	// +30s buffer accounts for VictoriaMetrics scrape interval (15s) and ingestion delay
	const windowSecs = Math.ceil(durationMs / 1000) + 30;
	const window = `${windowSecs}s`;

	const db = 'n8n_db';
	const [
		eventLoopLag,
		pgTxRateWithTotals,
		pgTxRateFallback,
		pgInsertRateWithTotals,
		pgInsertRateFallback,
		pgActive,
		queueWaiting,
		queueActive,
		queueCompletedRate,
		queueFailedRate,
		bgwriterTimedRate,
		bgwriterReqRate,
		bgwriterBackendRate,
		blksHitRate,
		blksReadRate,
		containerStats,
	] = await Promise.all([
		metrics.query('n8n_nodejs_eventloop_lag_seconds').catch(() => []),
		metrics
			.query(`rate(pg_stat_database_xact_commit_total{datname="${db}"}[${window}])`)
			.catch(() => []),
		metrics.query(`rate(pg_stat_database_xact_commit{datname="${db}"}[${window}])`).catch(() => []),
		metrics
			.query(`rate(pg_stat_database_tup_inserted_total{datname="${db}"}[${window}])`)
			.catch(() => []),
		metrics
			.query(`rate(pg_stat_database_tup_inserted{datname="${db}"}[${window}])`)
			.catch(() => []),
		metrics.query(`pg_stat_activity_count{datname="${db}"}`).catch(() => []),
		metrics.query('n8n_scaling_mode_queue_jobs_waiting').catch(() => []),
		metrics.query('n8n_scaling_mode_queue_jobs_active').catch(() => []),
		metrics.query(`rate(n8n_scaling_mode_queue_jobs_completed[${window}])`).catch(() => []),
		metrics.query(`rate(n8n_scaling_mode_queue_jobs_failed[${window}])`).catch(() => []),
		metrics.query(`rate(pg_stat_bgwriter_checkpoints_timed_total[${window}])`).catch(() => []),
		metrics.query(`rate(pg_stat_bgwriter_checkpoints_req_total[${window}])`).catch(() => []),
		metrics.query(`rate(pg_stat_bgwriter_buffers_backend_total[${window}])`).catch(() => []),
		metrics.query(`rate(pg_stat_database_blks_hit{datname="${db}"}[${window}])`).catch(() => []),
		metrics.query(`rate(pg_stat_database_blks_read{datname="${db}"}[${window}])`).catch(() => []),
		queryContainerStats(metrics, window),
	]);

	const pgTxRateResult = pgTxRateWithTotals.length > 0 ? pgTxRateWithTotals : pgTxRateFallback;
	const pgInsertRateResult =
		pgInsertRateWithTotals.length > 0 ? pgInsertRateWithTotals : pgInsertRateFallback;
	const blksHit = sumValues(blksHitRate);
	const blksRead = sumValues(blksReadRate);
	const bufferHitRatio =
		blksHit !== undefined && blksRead !== undefined && blksHit + blksRead > 0
			? blksHit / (blksHit + blksRead)
			: undefined;

	return {
		eventLoopLag: sumValues(eventLoopLag),
		pgTxRate: sumValues(pgTxRateResult),
		pgInsertRate: sumValues(pgInsertRateResult),
		pgActiveConnections: sumValues(pgActive),
		queueWaiting: sumValues(queueWaiting),
		queueActive: sumValues(queueActive),
		queueCompletedRate: sumValues(queueCompletedRate),
		queueFailedRate: sumValues(queueFailedRate),
		pgBgwriterCheckpointsTimedRate: sumValues(bgwriterTimedRate),
		pgBgwriterCheckpointsReqRate: sumValues(bgwriterReqRate),
		pgBgwriterBuffersBackendRate: sumValues(bgwriterBackendRate),
		pgBufferHitRatio: bufferHitRatio,
		pgBlocksReadRate: blksRead,
		containerStats: containerStats.length > 0 ? containerStats : undefined,
	};
}

/**
 * Collects system-level diagnostics from VictoriaMetrics.
 * Retries when core metrics are missing — VictoriaMetrics may not have
 * ingested a fresh scrape immediately after the benchmark completes.
 */
export async function collectDiagnostics(
	metrics: MetricsHelper,
	durationMs: number,
	options: { maxRetries?: number; retryDelayMs?: number } = {},
): Promise<DiagnosticsResult> {
	const { maxRetries = 3, retryDelayMs = 5000 } = options;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		const result = await queryDiagnostics(metrics, durationMs);

		const missing = EXPECTED_KEYS.filter((k) => result[k] === undefined);
		if (missing.length === 0) return result;

		if (attempt === maxRetries) {
			console.warn(
				`[DIAG] Missing metrics after ${maxRetries + 1} attempts: ${missing.join(', ')}`,
			);
			return result;
		}

		console.log(
			`[DIAG] Missing metrics (attempt ${attempt + 1}): ${missing.join(', ')} — retrying in ${retryDelayMs}ms`,
		);
		await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
	}

	return {};
}

/**
 * Attaches reporter-relevant diagnostic values as test metrics.
 * Only attaches values that are present (undefined = metric not available).
 */
export async function attachDiagnostics(
	testInfo: TestInfo,
	dimensions: Record<string, string | number>,
	diagnostics: DiagnosticsResult,
): Promise<void> {
	if (diagnostics.eventLoopLag !== undefined) {
		await attachMetric(testInfo, 'event-loop-lag', diagnostics.eventLoopLag, 's', dimensions);
	}
	if (diagnostics.pgTxRate !== undefined) {
		await attachMetric(testInfo, 'pg-tx-rate', diagnostics.pgTxRate, 'tx/s', dimensions);
	}
	if (diagnostics.queueWaiting !== undefined) {
		await attachMetric(testInfo, 'queue-waiting', diagnostics.queueWaiting, 'count', dimensions);
	}
}
