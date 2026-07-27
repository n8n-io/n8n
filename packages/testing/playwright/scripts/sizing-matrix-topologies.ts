/**
 * Measured-cell topologies and the default spec→cell mapping for the sizing
 * matrix. Kept side-effect free (no IO, no top-level `main`) so both the
 * aggregator CLI and unit tests can import the constants directly.
 *
 * Each `Topology` carries a `concurrency` field — the total in-flight job
 * slots across the queue workers, derived from `workers ×
 * QUEUE_WORKER_CONCURRENCY` (DEVP-516).
 */

import type { SpecMapping, Topology } from '../utils/benchmark/sizing-matrix';

/**
 * Per-worker job concurrency assumed for the benchmark cells — the default of
 * the worker `--concurrency` flag (`packages/cli/src/commands/worker.ts`). The
 * benchmark substrate boots workers without overriding it, so this is the
 * value behind every measured cell.
 */
export const QUEUE_WORKER_CONCURRENCY = 10;

const S0_SINGLE_MAIN: Topology = {
	mains: 1,
	webhookProcs: 0,
	workers: 0,
	concurrency: 0,
	mainVcpu: 2,
	mainRamGb: 4,
	pgVcpu: 2,
	pgRamGb: 4,
	redisVcpu: 1,
	redisRamGb: 1,
};

const S1_QUEUE_BASELINE: Topology = {
	...S0_SINGLE_MAIN,
	workers: 1,
	concurrency: 1 * QUEUE_WORKER_CONCURRENCY,
	workerVcpu: 2,
	workerRamGb: 4,
};

const S1_DEDICATED_PROC_BASELINE: Topology = {
	...S1_QUEUE_BASELINE,
	webhookProcs: 1,
};

const S2_DEDICATED_PROC_2WP_1W: Topology = {
	...S1_DEDICATED_PROC_BASELINE,
	webhookProcs: 2,
};

const S2_DEDICATED_PROC_2WP_2W: Topology = {
	...S2_DEDICATED_PROC_2WP_1W,
	workers: 2,
	concurrency: 2 * QUEUE_WORKER_CONCURRENCY,
};

// Webhook and kafka triggers collapse into the same cell — shape is workload
// archetype, not ingress protocol.
export const DEFAULT_MAPPING: SpecMapping = {
	'webhook/webhook-single-instance.spec.ts': {
		scale: 'S0',
		shape: 'L',
		topology: S0_SINGLE_MAIN,
	},
	'webhook/webhook-dedicated-proc-baseline.spec.ts': {
		scale: 'S1',
		shape: 'L',
		topology: S1_DEDICATED_PROC_BASELINE,
	},
	'webhook/webhook-dedicated-proc-2wp-1w.spec.ts': {
		scale: 'S2',
		shape: 'L',
		topology: S2_DEDICATED_PROC_2WP_1W,
	},
	'webhook/webhook-dedicated-proc-2wp-2w.spec.ts': {
		scale: 'S2',
		shape: 'L',
		topology: S2_DEDICATED_PROC_2WP_2W,
	},
	'webhook/webhook-save-data-overhead.spec.ts': {
		scale: 'S1',
		shape: 'D',
		topology: S1_DEDICATED_PROC_BASELINE,
	},
	// `webhook-sync-latency-floor` is deliberately unmapped — measures latency at
	// fixed concurrency, not throughput, and distorts the S1-L distribution.
	'kafka/single-instance-ceiling.spec.ts': {
		scale: 'S0',
		shape: 'L',
		topology: S0_SINGLE_MAIN,
	},
	'kafka/queue-mode-sustained-rate.spec.ts': {
		scale: 'S1',
		shape: 'L',
		topology: S1_QUEUE_BASELINE,
	},
	'kafka/burst-drain-capacity.spec.ts': {
		scale: 'S1',
		shape: 'L',
		topology: S1_QUEUE_BASELINE,
	},
	'kafka/node-count-scaling.spec.ts': {
		scale: 'S1',
		shape: 'X',
		topology: S1_QUEUE_BASELINE,
	},
	'kafka/output-size-impact.spec.ts': {
		scale: 'S1',
		shape: 'D',
		topology: S1_QUEUE_BASELINE,
	},
	'kafka/steady-rate-breaking-point.spec.ts': {
		scale: 'S0',
		shape: 'X',
		topology: S0_SINGLE_MAIN,
	},
};
