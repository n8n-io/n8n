/**
 * Query helpers for VictoriaLogs and VictoriaMetrics
 */
import { setTimeout as wait } from 'node:timers/promises';

import type {
	VictoriaLogsSetupResult,
	VictoriaMetricsSetupResult,
	ObservabilityStack,
} from './n8n-test-container-observability';

export interface LogEntry {
	_time: string;
	_msg: string;
	message: string;
	[key: string]: string | undefined;
}

export interface LogQueryOptions {
	limit?: number;
	start?: string;
	end?: string;
	timeoutMs?: number;
	intervalMs?: number;
}

export interface MetricResult {
	labels: Record<string, string>;
	value: number;
}

export interface WaitForMetricOptions {
	timeoutMs?: number;
	intervalMs?: number;
	predicate?: (values: MetricResult[]) => boolean;
}

/**
 * Escape special characters in LogsQL queries.
 * LogsQL uses double quotes for string matching, so we need to escape them.
 */
export function escapeLogsQL(str: string): string {
	return str.replace(/["\\]/g, '\\$&');
}

/**
 * Helper for querying VictoriaLogs
 */
export class VictoriaLogsHelper {
	constructor(private readonly endpoint: string) {}

	static from(result: VictoriaLogsSetupResult) {
		return new VictoriaLogsHelper(result.queryEndpoint);
	}

	async query(query: string, options: LogQueryOptions = {}): Promise<LogEntry[]> {
		const params = new URLSearchParams({ query });
		if (options.limit) params.set('limit', String(options.limit));
		if (options.start) params.set('start', options.start);
		if (options.end) params.set('end', options.end);

		const response = await fetch(`${this.endpoint}/select/logsql/query?${params}`);
		if (!response.ok) {
			throw new Error(`VictoriaLogs query failed: ${response.status}`);
		}

		const text = await response.text();
		if (!text.trim()) return [];

		return text
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				try {
					const entry = JSON.parse(line) as LogEntry;
					entry.message = entry._msg;
					return entry;
				} catch {
					throw new Error(`Failed to parse VictoriaLogs line: ${line}`);
				}
			});
	}

	async waitForLog(query: string, options: LogQueryOptions = {}): Promise<LogEntry | null> {
		const deadline = Date.now() + (options.timeoutMs ?? 30000);
		const interval = options.intervalMs ?? 1000;

		while (Date.now() < deadline) {
			const logs = await this.query(query, options);
			if (logs.length > 0) return logs[0];
			await wait(interval);
		}
		return null;
	}
}

/**
 * Helper for querying VictoriaMetrics
 */
export class VictoriaMetricsHelper {
	constructor(private readonly endpoint: string) {}

	static from(result: VictoriaMetricsSetupResult) {
		return new VictoriaMetricsHelper(result.queryEndpoint);
	}

	async query(query: string): Promise<MetricResult[]> {
		const response = await fetch(`${this.endpoint}/api/v1/query?${new URLSearchParams({ query })}`);
		if (!response.ok) {
			throw new Error(`VictoriaMetrics query failed: ${response.status}`);
		}

		const data = (await response.json()) as {
			status: string;
			data?: { result: Array<{ metric: Record<string, string>; value: [number, string] }> };
			error?: string;
		};

		if (data.status !== 'success') {
			throw new Error(`VictoriaMetrics error: ${data.error}`);
		}

		return (data.data?.result ?? []).map((r) => ({
			labels: r.metric,
			value: parseFloat(r.value[1]),
		}));
	}

	async waitForMetric(
		query: string,
		options: WaitForMetricOptions = {},
	): Promise<MetricResult | null> {
		const deadline = Date.now() + (options.timeoutMs ?? 30000);
		const interval = options.intervalMs ?? 1000;
		const predicate = options.predicate ?? ((v) => v.length > 0);

		while (Date.now() < deadline) {
			try {
				const values = await this.query(query);
				if (predicate(values)) return values[0] ?? null;
			} catch {
				// Ignore transient errors during polling
			}
			await wait(interval);
		}
		return null;
	}
}

/**
 * Combined helper for the full observability stack
 */
export class ObservabilityHelper {
	readonly logs: VictoriaLogsHelper;
	readonly metrics: VictoriaMetricsHelper;

	constructor(stack: ObservabilityStack) {
		this.logs = VictoriaLogsHelper.from(stack.victoriaLogs);
		this.metrics = VictoriaMetricsHelper.from(stack.victoriaMetrics);
	}
}
