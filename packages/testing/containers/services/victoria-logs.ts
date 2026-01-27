import type { StartedNetwork } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { HelperContext, Service, ServiceResult } from './types';

const VICTORIA_LOGS_HTTP_PORT = 9428;
const VICTORIA_LOGS_SYSLOG_PORT = 514;
const VICTORIA_LOGS_HOSTNAME = 'victoria-logs';
const SYSLOG_FACILITY_LOCAL0 = 16; // RFC 5424

export interface VictoriaLogsMeta {
	queryEndpoint: string;
	internalEndpoint: string;
	syslog: {
		host: string;
		port: number;
		protocol: 'tcp' | 'udp';
		facility: number;
		appName: string;
	};
}

export type VictoriaLogsResult = ServiceResult<VictoriaLogsMeta>;

export const victoriaLogs: Service<VictoriaLogsResult> = {
	description: 'VictoriaLogs',

	async start(network: StartedNetwork, projectName: string): Promise<VictoriaLogsResult> {
		const container = await new GenericContainer(TEST_CONTAINER_IMAGES.victoriaLogs)
			.withName(`${projectName}-victoria-logs`)
			.withNetwork(network)
			.withNetworkAliases(VICTORIA_LOGS_HOSTNAME)
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': 'victoria-logs',
			})
			.withExposedPorts(VICTORIA_LOGS_HTTP_PORT, VICTORIA_LOGS_SYSLOG_PORT)
			.withCommand([
				'-storageDataPath=/victoria-logs-data',
				'-retentionPeriod=1d',
				`-syslog.listenAddr.tcp=:${VICTORIA_LOGS_SYSLOG_PORT}`,
			])
			.withWaitStrategy(
				Wait.forHttp('/health', VICTORIA_LOGS_HTTP_PORT)
					.forStatusCode(200)
					.withStartupTimeout(60000),
			)
			.withReuse()
			.start();

		const httpPort = container.getMappedPort(VICTORIA_LOGS_HTTP_PORT);

		return {
			container,
			meta: {
				queryEndpoint: `http://localhost:${httpPort}`,
				internalEndpoint: `http://${VICTORIA_LOGS_HOSTNAME}:${VICTORIA_LOGS_HTTP_PORT}`,
				syslog: {
					host: VICTORIA_LOGS_HOSTNAME,
					port: VICTORIA_LOGS_SYSLOG_PORT,
					protocol: 'tcp',
					facility: SYSLOG_FACILITY_LOCAL0,
					appName: 'n8n',
				},
			},
		};
	},

	env(): Record<string, string> {
		return {
			N8N_LOG_OUTPUT: 'console',
		};
	},
};

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

export class LogsHelper {
	constructor(private readonly endpoint: string) {}

	async exportAll(options: LogQueryOptions = {}): Promise<string> {
		const logs = await this.query('*', { limit: 10000, ...options });
		return logs.map((log) => JSON.stringify(log)).join('\n');
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
		const { setTimeout: wait } = await import('node:timers/promises');
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

export function createLogsHelper(ctx: HelperContext): LogsHelper {
	const result = ctx.serviceResults.victoriaLogs as VictoriaLogsResult | undefined;
	if (!result) {
		throw new Error('VictoriaLogs service not found in context');
	}
	return new LogsHelper(result.meta.queryEndpoint);
}

/**
 * Escape special characters in LogsQL queries.
 */
export function escapeLogsQL(str: string): string {
	return str.replace(/["\\]/g, '\\$&');
}
