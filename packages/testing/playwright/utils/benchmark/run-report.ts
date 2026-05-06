/**
 * Structured per-run summary attached as `run-report.json`. Single source of
 * truth: console output and BigQuery summary metrics are projections of it.
 *
 * `containers[]` is the outside view (per-container CPU/mem/IO).
 * `services[]` is the inside view (service-internal deep diagnostics, kind-
 * specific shape — adding redis/pgbouncer/kafka/etc is additive).
 *
 * Bump `schemaVersion` only when the shape changes in a way that breaks
 * existing consumers.
 */

import type { ContainerStat, DiagnosticsResult } from './diagnostics';

export interface RunReport {
	schemaVersion: 1;
	scenario: ScenarioInfo;
	duration: { totalMs: number; wallClockMs: number };
	throughput: ThroughputInfo;
	containers: ContainerStat[];
	/** `'cAdvisor (time-series)'` or `'docker stats sampler (N samples)'`. */
	containersSource?: string;
	services: ServiceMetrics[];
}

export interface ScenarioInfo {
	spec: string;
	dimensions: Record<string, string | number | boolean>;
}

export interface ThroughputInfo {
	/** HTTP request rate (webhook scenarios). */
	reqPerSec?: number;
	execPerSec?: number;
	/** Tail rate over the final 60s — closest to the architectural ceiling. */
	tailExecPerSec?: number;
	/** HTTP round-trip for webhook scenarios; per-execution duration otherwise. */
	p50Ms?: number;
	p99Ms?: number;
	totalRequests?: number;
	totalCompleted?: number;
	errors?: number;
	/**
	 * `transportErrors` covers all transport-level failures from autocannon
	 * (ECONNRESET, ECONNREFUSED, ETIMEDOUT, …); it is not just timeouts.
	 */
	errorBreakdown?: { transportErrors: number; non2xx: number };
	errorRatePct?: number;
	/** Positive = backlog growing. */
	backlogGrowthPerSec?: number;
	/** >1 means ingestion outpacing execution. */
	ingestionVsExecutionRatio?: number;
	verdict?: string;
}

// Additions (RedisMetrics, PgBouncerMetrics, KafkaMetrics, …) slot in here
// without bumping schemaVersion.
export type ServiceMetrics = PostgresMetrics | N8nMainMetrics | N8nWorkerMetrics;

export interface BaseServiceMetrics {
	kind: string;
	name: string;
}

export interface PostgresMetrics extends BaseServiceMetrics {
	kind: 'postgres';
	queries: {
		/** Ranked by total ms/s of work (calls/s × avg ms). */
		topByCost: TopQuery[];
		/** Sum across ALL statements, not just topByCost. */
		totalCpu: { execMsPerSec: number; planMsPerSec: number };
		statementCount: number;
	};
	saturation: {
		txPerSec?: number;
		activeConnections?: number;
		bufferHitRatio?: number;
		blocksReadPerSec?: number;
		walMbPerSec?: number;
		walRecordsPerSec?: number;
		walFpiPerSec?: number;
		bgwriterCheckpointsTimedRate?: number;
		bgwriterCheckpointsReqRate?: number;
		bgwriterBuffersBackendRate?: number;
	};
	/** Per-backend-type totals from `pg_stat_io` (PG 16+). */
	io: PgStatIoRow[];
	writes?: { insertsPerSec?: number };
}

export interface TopQuery {
	totalMsPerSec: number;
	callsPerSec: number;
	avgMs: number;
	query: string;
}

export interface PgStatIoRow {
	backendType: string;
	reads: number;
	writes: number;
	extends: number;
}

export interface N8nMainMetrics extends BaseServiceMetrics {
	kind: 'n8n-main';
	/** Sum across replicas. */
	eventLoopLagSec?: number;
}

export interface N8nWorkerMetrics extends BaseServiceMetrics {
	kind: 'n8n-worker';
	queueWaiting?: number;
	queueActive?: number;
	queueCompletedRate?: number;
	queueFailedRate?: number;
}

export class RunReportBuilder {
	private readonly services: ServiceMetrics[] = [];

	private containers: ContainerStat[] = [];

	private containersSource?: string;

	constructor(
		private readonly scenario: ScenarioInfo,
		private readonly duration: RunReport['duration'],
		private readonly throughput: ThroughputInfo,
	) {}

	setContainers(containers: ContainerStat[], source?: string): void {
		this.containers = containers;
		this.containersSource = source;
	}

	addService(service: ServiceMetrics): void {
		this.services.push(service);
	}

	build(): RunReport {
		return {
			schemaVersion: 1,
			scenario: this.scenario,
			duration: this.duration,
			throughput: this.throughput,
			containers: this.containers,
			containersSource: this.containersSource,
			services: this.services,
		};
	}
}

/** Folds the flat `DiagnosticsResult` into per-service entries. */
export function diagnosticsToServiceEntries(diag: DiagnosticsResult): ServiceMetrics[] {
	const services: ServiceMetrics[] = [];

	if (diag.eventLoopLag !== undefined) {
		services.push({ kind: 'n8n-main', name: 'n8n-main', eventLoopLagSec: diag.eventLoopLag });
	}

	if (
		diag.queueWaiting !== undefined ||
		diag.queueActive !== undefined ||
		diag.queueCompletedRate !== undefined ||
		diag.queueFailedRate !== undefined
	) {
		services.push({
			kind: 'n8n-worker',
			name: 'n8n-worker',
			queueWaiting: diag.queueWaiting,
			queueActive: diag.queueActive,
			queueCompletedRate: diag.queueCompletedRate,
			queueFailedRate: diag.queueFailedRate,
		});
	}

	return services;
}
