/**
 * RunReport — structured per-run summary attached as a JSON test artifact.
 *
 * Single source of truth for everything observable from one benchmark run.
 * Console output and BigQuery summary metrics are projections of this object;
 * the report itself is the contract. LLM analysis can consume it directly:
 * paste a single run-report.json into Claude and ask "what's the bottleneck?"
 * gets a meaningful answer because every dimension is in one self-describing
 * blob.
 *
 * Two-axis split:
 *   `containers[]` — outside view (CPU/mem/IO per container, same shape for
 *                    everything; sourced from cAdvisor or docker-stats sampler).
 *   `services[]`   — inside view (service-internal deep diagnostics, kind-
 *                    specific shape; sourced from each service's own metrics
 *                    endpoint: pg_stat_*, redis INFO, BullMQ job stats, etc.).
 *
 * Adding a new service kind (redis, pgbouncer, kafka, load-balancer, …) is a
 * pure additive change: define its interface, add it to the ServiceMetrics
 * union, populate it where the data is collected. No schema bump needed.
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
	/** Per-container resource use. Same shape regardless of service kind. */
	containers: ContainerStat[];
	/**
	 * Where `containers[]` came from — `'cAdvisor (time-series)'`,
	 * `'docker stats sampler (N samples)'`, or `'unavailable'`. Useful when
	 * comparing runs across environments (CI = cAdvisor, local = sampler).
	 */
	containersSource?: string;
	/** Service-internal deep diagnostics. Kind-specific shape. */
	services: ServiceMetrics[];
}

export interface ScenarioInfo {
	/** Test title (the spec's question). */
	spec: string;
	/** Dimensions recorded by `attachMetric` — trigger, topology, load profile, etc. */
	dimensions: Record<string, string | number | boolean>;
}

export interface ThroughputInfo {
	/** HTTP request rate from the load generator (webhook scenarios only). */
	reqPerSec?: number;
	/** Workflow execution rate over the active window. */
	execPerSec?: number;
	/** Tail rate over the final 60s — closest to the architectural ceiling. */
	tailExecPerSec?: number;
	/**
	 * Latency percentiles. For webhook scenarios these are HTTP round-trip;
	 * for load scenarios they're per-execution duration.
	 */
	p50Ms?: number;
	p99Ms?: number;
	/** Total HTTP requests issued by the load generator (webhook scenarios). */
	totalRequests?: number;
	totalCompleted?: number;
	errors?: number;
	/** Webhook-specific error split (autocannon timeouts vs non-2xx responses). */
	errorBreakdown?: { timeouts: number; non2xx: number };
	errorRatePct?: number;
	/** Webhook-specific: ingestion - execution. Positive = backlog growing. */
	backlogGrowthPerSec?: number;
	/** Webhook-specific: ingestion / execution ratio. >1 means ingestion outpacing execution. */
	ingestionVsExecutionRatio?: number;
	/** "BALANCED" / "OVERLOADED" / etc. — set by webhook harness. */
	verdict?: string;
}

export type ServiceMetrics = PostgresMetrics | N8nMainMetrics | N8nWorkerMetrics;
// Future additions slot in here without bumping schemaVersion:
// | RedisMetrics | PgBouncerMetrics | KafkaMetrics | LoadBalancerMetrics

export interface BaseServiceMetrics {
	kind: string;
	/** docker-compose service name (or aggregate name for multi-replica services). */
	name: string;
}

export interface PostgresMetrics extends BaseServiceMetrics {
	kind: 'postgres';
	queries: {
		/** Top statements ranked by total ms/s of work (calls/s × avg ms). */
		topByCost: TopQuery[];
		/**
		 * Total query CPU summed across ALL statements (not just topByCost).
		 * `planMsPerSec` is 0 unless `BENCH_DEEP_DIAGNOSTICS=true` enabled
		 * `pg_stat_statements.track_planning`.
		 */
		totalCpu: {
			execMsPerSec: number;
			planMsPerSec: number;
			planTimeTracked: boolean;
		};
		statementCount: number;
	};
	saturation: {
		txPerSec?: number;
		activeConnections?: number;
		/** Cache hit ratio: blks_hit / (blks_hit + blks_read). 1.0 = fully cached. */
		bufferHitRatio?: number;
		blocksReadPerSec?: number;
		walMbPerSec?: number;
		walRecordsPerSec?: number;
		walFpiPerSec?: number;
		bgwriterCheckpointsTimedRate?: number;
		bgwriterCheckpointsReqRate?: number;
		bgwriterBuffersBackendRate?: number;
	};
	/** Per-backend-type IO totals over the run from `pg_stat_io` (PG 16+). */
	io: PgStatIoRow[];
	/** Insert/update/delete tuple rates — useful for write-heavy workload sizing. */
	writes?: { insertsPerSec?: number };
}

export interface TopQuery {
	totalMsPerSec: number;
	callsPerSec: number;
	avgMs: number;
	/** Truncated SQL text (~120 chars). */
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
	/** Sum across all main replicas (event loop lag is per-process). */
	eventLoopLagSec?: number;
}

export interface N8nWorkerMetrics extends BaseServiceMetrics {
	kind: 'n8n-worker';
	queueWaiting?: number;
	queueActive?: number;
	queueCompletedRate?: number;
	queueFailedRate?: number;
}

/**
 * Minimal accumulator. Each reporter populates its slice; harness calls
 * `build()` at end-of-run to produce the JSON artifact.
 */
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

/**
 * Folds the legacy `DiagnosticsResult` (a flat kitchen-sink) into the right
 * service entries. Removes the need for callers to know which field belongs
 * to which service.
 */
export function diagnosticsToServiceEntries(diag: DiagnosticsResult): ServiceMetrics[] {
	const services: ServiceMetrics[] = [];

	if (
		diag.eventLoopLag !== undefined ||
		diag.pgTxRate !== undefined ||
		diag.pgActiveConnections !== undefined
	) {
		// n8n-main is reported as a single aggregate row; per-replica detail
		// lives in `containers[]` (cAdvisor sees each replica separately).
		if (diag.eventLoopLag !== undefined) {
			services.push({
				kind: 'n8n-main',
				name: 'n8n-main',
				eventLoopLagSec: diag.eventLoopLag,
			});
		}
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
