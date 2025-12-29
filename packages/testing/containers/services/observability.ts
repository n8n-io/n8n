/**
 * Observability Stack Service
 *
 * Combines VictoriaLogs, VictoriaMetrics, and Vector for:
 * - Log streaming feature testing (enterprise syslog destination)
 * - Container log collection for test debugging
 * - Metrics collection via PromQL queries
 */

import { setTimeout as wait } from 'node:timers/promises';
import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { HelperContext, Service, ServiceResult } from './types';

// Constants
const VICTORIA_LOGS_HTTP_PORT = 9428;
const VICTORIA_LOGS_SYSLOG_PORT = 514;
const VICTORIA_METRICS_HTTP_PORT = 8428;
const VICTORIA_LOGS_HOSTNAME = 'victoria-logs';
const VICTORIA_METRICS_HOSTNAME = 'victoria-metrics';

// Syslog facility codes (RFC 5424)
const SYSLOG_FACILITY_LOCAL0 = 16;

// Types
export interface ScrapeTarget {
	job: string;
	instance: string;
	host: string;
	port: number;
}

export interface ObservabilityConfig {
	scrapeTargets?: ScrapeTarget[];
}

export interface ObservabilityMeta {
	logs: {
		queryEndpoint: string;
		internalEndpoint: string;
		syslog: {
			host: string;
			port: number;
			/** Default syslog protocol */
			protocol: 'tcp' | 'udp';
			/** Default syslog facility (RFC 5424) */
			facility: number;
			/** Default app name for syslog messages */
			appName: string;
		};
	};
	metrics: {
		queryEndpoint: string;
		internalEndpoint: string;
	};
}

export type ObservabilityResult = ServiceResult<ObservabilityMeta> & {
	// Additional containers for cleanup
	containers: StartedTestContainer[];
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
 * Generate Prometheus scrape configuration for VictoriaMetrics
 */
function generateScrapeConfig(targets: ScrapeTarget[]): string {
	const jobGroups = new Map<string, ScrapeTarget[]>();
	for (const target of targets) {
		const existing = jobGroups.get(target.job) ?? [];
		existing.push(target);
		jobGroups.set(target.job, existing);
	}

	const scrapeConfigs: string[] = [];
	for (const [jobName, jobTargets] of jobGroups) {
		const targetConfigs = jobTargets
			.map(
				(t) => `      - targets: ['${t.host}:${t.port}']
        labels:
          instance: '${t.instance}'`,
			)
			.join('\n');

		scrapeConfigs.push(`  - job_name: '${jobName}'
    static_configs:
${targetConfigs}
    metrics_path: '/metrics'
    scrape_interval: '5s'`);
	}

	return `
global:
  scrape_interval: 15s

scrape_configs:
${scrapeConfigs.join('\n')}
`;
}

/**
 * Generate Vector configuration for Docker log collection
 */
function generateVectorConfig(projectName: string, victoriaLogsEndpoint: string): string {
	return `
# Disable healthcheck to allow Vector to start while Docker socket becomes available
[healthchecks]
enabled = false

[sources.docker_logs]
type = "docker_logs"
include_labels = ["com.docker.compose.project=${projectName}"]

[transforms.format_for_victorialogs]
type = "remap"
inputs = ["docker_logs"]
source = '''
._msg = .message
._time = .timestamp
.project = "${projectName}"
.service = .label."com.docker.compose.service" || "unknown"
.container = .container_name || "unknown"
._stream = .stream || "unknown"
del(.message)
del(.timestamp)
del(.label)
del(.source_type)
del(.stream)
'''

[sinks.victoria_logs]
type = "http"
inputs = ["format_for_victorialogs"]
uri = "${victoriaLogsEndpoint}/insert/jsonline"
method = "post"
framing.method = "newline_delimited"
encoding.codec = "json"
`;
}

// Service definition
export const observability: Service<ObservabilityResult> = {
	description: 'Observability stack (VictoriaLogs + VictoriaMetrics + Vector)',
	configKey: 'observability',

	getOptions(ctx) {
		const { mains, workers, projectName } = ctx;
		const scrapeTargets: ScrapeTarget[] = [];

		for (let i = 1; i <= mains; i++) {
			const hostname = mains > 1 ? `${projectName}-n8n-main-${i}` : `${projectName}-n8n`;
			scrapeTargets.push({
				job: 'n8n-main',
				instance: `n8n-main-${i}`,
				host: hostname,
				port: 5678,
			});
		}
		for (let i = 1; i <= workers; i++) {
			scrapeTargets.push({
				job: 'n8n-worker',
				instance: `n8n-worker-${i}`,
				host: `${projectName}-n8n-worker-${i}`,
				port: 5678,
			});
		}

		return { scrapeTargets } as ObservabilityConfig;
	},

	async start(
		network: StartedNetwork,
		projectName: string,
		config?: unknown,
	): Promise<ObservabilityResult> {
		const { scrapeTargets = [] } = (config as ObservabilityConfig) ?? {};

		// Start VictoriaLogs
		const logsContainer = await new GenericContainer(TEST_CONTAINER_IMAGES.victoriaLogs)
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

		const logsHttpPort = logsContainer.getMappedPort(VICTORIA_LOGS_HTTP_PORT);
		const logsInternalEndpoint = `http://${VICTORIA_LOGS_HOSTNAME}:${VICTORIA_LOGS_HTTP_PORT}`;

		// Start VictoriaMetrics
		const scrapeConfig = generateScrapeConfig(scrapeTargets);
		const metricsContainer = await new GenericContainer(TEST_CONTAINER_IMAGES.victoriaMetrics)
			.withName(`${projectName}-victoria-metrics`)
			.withNetwork(network)
			.withNetworkAliases(VICTORIA_METRICS_HOSTNAME)
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': 'victoria-metrics',
			})
			.withExposedPorts(VICTORIA_METRICS_HTTP_PORT)
			.withCommand([
				'-storageDataPath=/victoria-metrics-data',
				'-retentionPeriod=1d',
				'-promscrape.config=/etc/prometheus/prometheus.yml',
			])
			.withCopyContentToContainer([
				{
					content: scrapeConfig,
					target: '/etc/prometheus/prometheus.yml',
				},
			])
			.withWaitStrategy(
				Wait.forHttp('/health', VICTORIA_METRICS_HTTP_PORT)
					.forStatusCode(200)
					.withStartupTimeout(60000),
			)
			.withReuse()
			.start();

		const metricsHttpPort = metricsContainer.getMappedPort(VICTORIA_METRICS_HTTP_PORT);

		// Start Vector for log collection
		const vectorConfig = generateVectorConfig(projectName, logsInternalEndpoint);
		const vectorContainer = await new GenericContainer(TEST_CONTAINER_IMAGES.vector)
			.withName(`${projectName}-vector`)
			.withNetwork(network)
			.withNetworkAliases('vector')
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': 'vector',
			})
			.withBindMounts([
				{
					source: '/var/run/docker.sock',
					target: '/var/run/docker.sock',
					mode: 'ro',
				},
			])
			.withCopyContentToContainer([
				{
					content: vectorConfig,
					target: '/etc/vector/vector.toml',
				},
			])
			.withCommand(['--config', '/etc/vector/vector.toml'])
			.withWaitStrategy(Wait.forLogMessage(/Vector has started/, 1).withStartupTimeout(60000))
			.withReuse()
			.start();

		return {
			container: logsContainer, // Primary container
			containers: [logsContainer, metricsContainer, vectorContainer],
			meta: {
				logs: {
					queryEndpoint: `http://localhost:${logsHttpPort}`,
					internalEndpoint: logsInternalEndpoint,
					syslog: {
						host: VICTORIA_LOGS_HOSTNAME,
						port: VICTORIA_LOGS_SYSLOG_PORT,
						protocol: 'tcp',
						facility: SYSLOG_FACILITY_LOCAL0,
						appName: 'n8n',
					},
				},
				metrics: {
					queryEndpoint: `http://localhost:${metricsHttpPort}`,
					internalEndpoint: `http://${VICTORIA_METRICS_HOSTNAME}:${VICTORIA_METRICS_HTTP_PORT}`,
				},
			},
		};
	},

	env(): Record<string, string> {
		return {
			N8N_LOG_OUTPUT: 'console',
			N8N_METRICS_ENABLED: 'true',
		};
	},
};

// Logs Helper
export class LogsHelper {
	constructor(private readonly endpoint: string) {}

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

// Metrics Helper
export class MetricsHelper {
	constructor(private readonly endpoint: string) {}

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

// Combined Observability Helper
export class ObservabilityHelper {
	readonly logs: LogsHelper;
	readonly metrics: MetricsHelper;
	readonly syslog: ObservabilityMeta['logs']['syslog'];

	constructor(meta: ObservabilityMeta) {
		this.logs = new LogsHelper(meta.logs.queryEndpoint);
		this.metrics = new MetricsHelper(meta.metrics.queryEndpoint);
		this.syslog = meta.logs.syslog;
	}
}

// Helper factory
export function createObservabilityHelper(ctx: HelperContext): ObservabilityHelper {
	const result = ctx.serviceResults.observability as ObservabilityResult | undefined;
	if (!result) {
		throw new Error('Observability service not found in context');
	}
	return new ObservabilityHelper(result.meta);
}

// Type registration via declaration merging
declare module './types' {
	interface ServiceHelpers {
		observability: ObservabilityHelper;
	}
}

/**
 * Escape special characters in LogsQL queries.
 */
export function escapeLogsQL(str: string): string {
	return str.replace(/["\\]/g, '\\$&');
}
