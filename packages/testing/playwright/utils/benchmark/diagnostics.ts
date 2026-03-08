import type { MetricsHelper } from 'n8n-containers';

export interface DiagnosticsResult {
	eventLoopLag: string;
	pgTxRate: string;
	pgInsertRate: string;
	pgActiveConnections: string;
	queueWaiting: string;
	queueActive: string;
	queueCompletedRate: string;
	queueFailedRate: string;
}

function sumValues(results: Array<{ value: number }>): number | undefined {
	if (results.length === 0) return undefined;
	return results.reduce((sum, r) => sum + r.value, 0);
}

/**
 * Collects system-level diagnostics from VictoriaMetrics.
 * Queries Postgres, queue, and event loop metrics over the benchmark duration window.
 */
export async function collectDiagnostics(
	metrics: MetricsHelper,
	durationMs: number,
): Promise<DiagnosticsResult> {
	const fmt = (v: number | undefined, unit = '') =>
		v !== undefined ? `${v.toFixed(2)}${unit}` : 'N/A';

	// +30s buffer accounts for VictoriaMetrics scrape interval (15s) and ingestion delay
	const windowSecs = Math.ceil(durationMs / 1000) + 30;
	const window = `${windowSecs}s`;

	const db = 'n8n_db';
	const [
		eventLoopLag,
		pgTxA,
		pgTxB,
		pgInsA,
		pgInsB,
		pgActive,
		queueWaiting,
		queueActive,
		queueCompletedRate,
		queueFailedRate,
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
	]);

	const pgTxRate = pgTxA.length > 0 ? pgTxA : pgTxB;
	const pgInsertRate = pgInsA.length > 0 ? pgInsA : pgInsB;

	return {
		eventLoopLag: fmt(sumValues(eventLoopLag), 's'),
		pgTxRate: fmt(sumValues(pgTxRate), ' tx/s'),
		pgInsertRate: fmt(sumValues(pgInsertRate), ' rows/s'),
		pgActiveConnections: fmt(sumValues(pgActive)),
		queueWaiting: fmt(sumValues(queueWaiting)),
		queueActive: fmt(sumValues(queueActive)),
		queueCompletedRate: fmt(sumValues(queueCompletedRate), ' jobs/s'),
		queueFailedRate: fmt(sumValues(queueFailedRate), ' jobs/s'),
	};
}
