/**
 * Query helpers for VictoriaLogs and VictoriaMetrics
 *
 * These helpers provide convenient methods for querying logs and metrics
 * from the VictoriaObs stack during tests.
 */

import type {
	VictoriaLogsSetupResult,
	VictoriaMetricsSetupResult,
	ObservabilityStack,
} from './n8n-test-container-observability';

export interface LogEntry {
	_time: string;
	_msg: string;
	message: string;
	_stream?: string;
	[key: string]: string | undefined;
}

export interface LogQueryOptions {
	/** Maximum number of results */
	limit?: number;
	/** Start time (ISO string or relative like '-5m') */
	start?: string;
	/** End time (ISO string or relative like 'now') */
	end?: string;
}

export interface WaitForLogOptions {
	/** Timeout in milliseconds */
	timeoutMs?: number;
	/** Polling interval in milliseconds */
	intervalMs?: number;
	/** Minimum number of matching logs required */
	minCount?: number;
}

export interface MetricResult {
	labels: Record<string, string>;
	value: number;
}

export interface WaitForMetricOptions {
	/** Timeout in milliseconds */
	timeoutMs?: number;
	/** Polling interval in milliseconds */
	intervalMs?: number;
	/** Predicate function to validate the metric value */
	predicate?: (values: MetricResult[]) => boolean;
}

/**
 * Helper class for querying VictoriaLogs
 */
export class VictoriaLogsHelper {
	private readonly queryEndpoint: string;

	constructor(result: VictoriaLogsSetupResult) {
		this.queryEndpoint = result.queryEndpoint;
	}

	/**
	 * Query logs using LogsQL
	 */
	async query(query: string, options: LogQueryOptions = {}): Promise<LogEntry[]> {
		const params = new URLSearchParams();
		params.set('query', query);
		if (options.limit) params.set('limit', String(options.limit));
		if (options.start) params.set('start', options.start);
		if (options.end) params.set('end', options.end);

		const response = await fetch(`${this.queryEndpoint}/select/logsql/query?${params}`);
		if (!response.ok) {
			throw new Error(`VictoriaLogs query failed: ${response.status} ${await response.text()}`);
		}

		const text = await response.text();
		if (!text.trim()) {
			return [];
		}

		// VictoriaLogs returns newline-delimited JSON
		return text
			.trim()
			.split('\n')
			.filter((line) => line.trim())
			.map((line) => {
				const entry = JSON.parse(line) as LogEntry;
				// Normalize message field - VictoriaLogs uses _msg
				entry.message = entry._msg;
				return entry;
			});
	}

	/**
	 * Wait for logs matching the query to appear
	 */
	async waitForLog(query: string, options: WaitForLogOptions = {}): Promise<LogEntry | null> {
		const timeout = options.timeoutMs ?? 30000;
		const interval = options.intervalMs ?? 1000;
		const minCount = options.minCount ?? 1;
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			const logs = await this.query(query);
			if (logs.length >= minCount) {
				return logs[0];
			}
			await new Promise((resolve) => setTimeout(resolve, interval));
		}

		return null;
	}

	/**
	 * Wait for multiple logs matching the query to appear
	 */
	async waitForLogs(query: string, options: WaitForLogOptions = {}): Promise<LogEntry[]> {
		const timeout = options.timeoutMs ?? 30000;
		const interval = options.intervalMs ?? 1000;
		const minCount = options.minCount ?? 1;
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			const logs = await this.query(query);
			if (logs.length >= minCount) {
				return logs;
			}
			await new Promise((resolve) => setTimeout(resolve, interval));
		}

		throw new Error(
			`Timeout waiting for logs matching query: ${query} (wanted ${minCount}, got 0 after ${timeout}ms)`,
		);
	}

	/**
	 * Check if any logs match the query
	 */
	async hasLogs(query: string): Promise<boolean> {
		const logs = await this.query(query, { limit: 1 });
		return logs.length > 0;
	}

	/**
	 * Get count of logs matching the query
	 */
	async count(query: string): Promise<number> {
		const logs = await this.query(query);
		return logs.length;
	}
}

/**
 * Helper class for querying VictoriaMetrics
 */
export class VictoriaMetricsHelper {
	private readonly queryEndpoint: string;

	constructor(result: VictoriaMetricsSetupResult) {
		this.queryEndpoint = result.queryEndpoint;
	}

	/**
	 * Query metrics using PromQL (instant query)
	 */
	async query(query: string): Promise<MetricResult[]> {
		const params = new URLSearchParams();
		params.set('query', query);

		const response = await fetch(`${this.queryEndpoint}/api/v1/query?${params}`);
		if (!response.ok) {
			throw new Error(`VictoriaMetrics query failed: ${response.status} ${await response.text()}`);
		}

		const data = (await response.json()) as {
			status: string;
			data?: {
				resultType: string;
				result: Array<{ metric: Record<string, string>; value: [number, string] }>;
			};
			error?: string;
		};

		if (data.status !== 'success') {
			throw new Error(`VictoriaMetrics query error: ${data.error}`);
		}

		// Transform to our format with labels and numeric value
		return (data.data?.result ?? []).map((r) => ({
			labels: r.metric,
			value: parseFloat(r.value[1]),
		}));
	}

	/**
	 * Wait for metrics matching the query to appear
	 */
	async waitForMetric(
		query: string,
		options: WaitForMetricOptions = {},
	): Promise<MetricResult | null> {
		const timeout = options.timeoutMs ?? 30000;
		const interval = options.intervalMs ?? 1000;
		const predicate = options.predicate ?? ((values) => values.length > 0);
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			try {
				const values = await this.query(query);
				if (predicate(values)) {
					return values[0] ?? null;
				}
			} catch {
				// Ignore errors during polling, might be transient
			}
			await new Promise((resolve) => setTimeout(resolve, interval));
		}

		return null;
	}

	/**
	 * Get the current value of a metric
	 */
	async getValue(query: string): Promise<number | null> {
		const values = await this.query(query);
		if (values.length === 0) {
			return null;
		}
		return values[0].value;
	}

	/**
	 * Check if a metric exists
	 */
	async hasMetric(query: string): Promise<boolean> {
		const values = await this.query(query);
		return values.length > 0;
	}
}

/**
 * Combined helper for the full observability stack
 */
export class ObservabilityHelper {
	readonly logs: VictoriaLogsHelper;
	readonly metrics: VictoriaMetricsHelper;

	constructor(stack: ObservabilityStack) {
		this.logs = new VictoriaLogsHelper(stack.victoriaLogs);
		this.metrics = new VictoriaMetricsHelper(stack.victoriaMetrics);
	}
}
