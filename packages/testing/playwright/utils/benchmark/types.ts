import type { ServiceHelpers, ServiceName } from 'n8n-containers/services/types';
import type { IWorkflowBase } from 'n8n-workflow';

import type { ApiHelpers } from '../../services/api-helper';

// --- Benchmark dimensions ---

/**
 * Structured dimensions attached to every benchmark metric.
 * Stored as JSON in BigQuery — enables slicing by node count, payload, mode, etc.
 * without encoding config into the metric name.
 */
export type BenchmarkDimensions = Record<string, string | number>;

/** Known trigger types. Must be set explicitly — no default to avoid silently wrong data. */
export type TriggerType = 'kafka' | 'webhook';

/** Load profile for steady-rate or preloaded burst tests. */
export type LoadProfile =
	| { type: 'steady'; ratePerSecond: number; durationSeconds: number }
	| { type: 'preloaded'; count: number };

// --- Payload sizes ---

export const PAYLOAD_PROFILES = {
	'1KB': 1024,
	'10KB': 10240,
	'100KB': 102400,
} as const;

export type PayloadSize = keyof typeof PAYLOAD_PROFILES;

export function generatePayload(sizeBytes: number): object {
	const base = { timestamp: Date.now(), index: 0, data: '' };
	const baseSize = JSON.stringify(base).length;
	const paddingSize = Math.max(0, sizeBytes - baseSize);
	return { ...base, data: 'x'.repeat(paddingSize) };
}

// --- Node output sizes ---

/**
 * Node output modes for controlling execution data volume per node.
 * - `noop`: NoOp nodes — minimal output, tests pure engine overhead.
 * - `10KB` / `100KB` / `1MB`: Set nodes that add a padding field at that size.
 *   Tests realistic DB write pressure since execution data accumulates per node.
 *   Uses Set nodes (not Code nodes) to avoid task runner dependency, enabling
 *   clean multi-worker benchmarks.
 */
export type NodeOutputSize = 'noop' | '10KB' | '100KB' | '1MB';

export const OUTPUT_SIZE_BYTES: Record<Exclude<NodeOutputSize, 'noop'>, number> = {
	'10KB': 10_000,
	'100KB': 100_000,
	'1MB': 1_000_000,
};

// --- Execution metrics ---

export interface ExecutionMetrics {
	totalCompleted: number;
	totalErrors: number;
	durationMs: number;
	throughputPerSecond: number;
	executionDurations: number[];
	avgDurationMs: number;
	p50DurationMs: number;
	p95DurationMs: number;
	p99DurationMs: number;
}

// --- Trigger driver ---

export interface PreloadResult {
	totalPublished: number;
	publishDurationMs: number;
}

export interface PublishResult {
	totalPublished: number;
	actualDurationMs: number;
}

export interface DrainResult {
	drained: boolean;
	/** Number of messages confirmed consumed (via consumer group lag tracking) */
	consumed: number;
	durationMs: number;
}

export interface TriggerSetupContext {
	api: ApiHelpers;
	services: ServiceHelpers;
	scenario: {
		nodeCount: number;
		nodeOutputSize?: NodeOutputSize;
		payloadSize: PayloadSize;
		partitions?: number;
	};
}

/**
 * Handle returned by TriggerDriver.setup() — provides load generation
 * and completion tracking for a single benchmark run.
 */
export interface TriggerHandle {
	/** Workflow definition to create via API */
	workflow: Partial<IWorkflowBase>;

	/** Preload messages/requests before activation */
	preload(count: number): Promise<PreloadResult>;

	/** Publish at a controlled rate (steady-state load tests) */
	publishAtRate(options: {
		ratePerSecond: number;
		durationSeconds: number;
	}): Promise<PublishResult>;

	/** Wait for trigger to be ready after activation (e.g., consumer group joined) */
	waitForReady(options?: { timeoutMs?: number }): Promise<void>;

	/** Wait for all messages to be consumed. Drivers without a native drain signal resolve immediately. */
	waitForDrain(options: { expectedCount: number; timeoutMs: number }): Promise<DrainResult>;
}

/**
 * Encapsulates trigger-specific setup and load generation for benchmarking.
 * Each trigger type (Kafka, Webhook, etc.) implements this once.
 */
export interface TriggerDriver {
	/** Services this trigger needs in the container stack */
	readonly requiredServices: readonly ServiceName[];

	/** Prepare trigger resources, return a handle for this benchmark run */
	setup(ctx: TriggerSetupContext): Promise<TriggerHandle>;
}
