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
}

function sumValues(results: Array<{ value: number }>): number | undefined {
	if (results.length === 0) return undefined;
	return results.reduce((sum, r) => sum + r.value, 0);
}

export function formatDiagnosticValue(v: number | undefined, unit = ''): string {
	return v !== undefined ? `${v.toFixed(2)}${unit}` : 'N/A';
}

/**
 * Collects system-level diagnostics from VictoriaMetrics.
 * Queries Postgres, queue, and event loop metrics over the benchmark duration window.
 */
export async function collectDiagnostics(
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

	const pgTxRateResult = pgTxRateWithTotals.length > 0 ? pgTxRateWithTotals : pgTxRateFallback;
	const pgInsertRateResult =
		pgInsertRateWithTotals.length > 0 ? pgInsertRateWithTotals : pgInsertRateFallback;

	return {
		eventLoopLag: sumValues(eventLoopLag),
		pgTxRate: sumValues(pgTxRateResult),
		pgInsertRate: sumValues(pgInsertRateResult),
		pgActiveConnections: sumValues(pgActive),
		queueWaiting: sumValues(queueWaiting),
		queueActive: sumValues(queueActive),
		queueCompletedRate: sumValues(queueCompletedRate),
		queueFailedRate: sumValues(queueFailedRate),
	};
}

/**
 * Attaches reporter-relevant diagnostic values as test metrics.
 * Only attaches values that are present (undefined = metric not available).
 */
export async function attachDiagnostics(
	testInfo: TestInfo,
	label: string,
	diagnostics: DiagnosticsResult,
): Promise<void> {
	if (diagnostics.eventLoopLag !== undefined) {
		await attachMetric(testInfo, `${label}-event-loop-lag`, diagnostics.eventLoopLag, 's');
	}
	if (diagnostics.pgTxRate !== undefined) {
		await attachMetric(testInfo, `${label}-pg-tx-rate`, diagnostics.pgTxRate, 'tx/s');
	}
	if (diagnostics.queueWaiting !== undefined) {
		await attachMetric(testInfo, `${label}-queue-waiting`, diagnostics.queueWaiting, 'count');
	}
}
