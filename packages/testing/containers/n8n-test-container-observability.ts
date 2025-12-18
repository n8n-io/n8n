/**
 * VictoriaObs Stack for Test Container Observability
 *
 * This module provides VictoriaLogs and VictoriaMetrics containers for:
 * - Log streaming feature testing (enterprise syslog destination)
 * - Container log collection for test debugging
 * - Metrics collection via PromQL queries
 */

import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from './test-containers';

// Default ports for VictoriaObs stack
const VICTORIA_LOGS_HTTP_PORT = 9428;
const VICTORIA_LOGS_SYSLOG_PORT = 514;
const VICTORIA_METRICS_HTTP_PORT = 8428;

// Hostnames for container networking
const VICTORIA_LOGS_HOSTNAME = 'victoria-logs';
const VICTORIA_METRICS_HOSTNAME = 'victoria-metrics';

export interface VictoriaLogsSetupResult {
	container: StartedTestContainer;
	/** External HTTP endpoint for queries (from host) */
	queryEndpoint: string;
	/** Internal HTTP endpoint for container-to-container communication */
	internalEndpoint: string;
	/** Syslog endpoint for log streaming */
	syslog: {
		host: string;
		port: number;
	};
}

export interface VictoriaMetricsSetupResult {
	container: StartedTestContainer;
	/** External HTTP endpoint for queries (from host) */
	queryEndpoint: string;
	/** Internal HTTP endpoint for container-to-container communication */
	internalEndpoint: string;
}

export interface ObservabilityStack {
	victoriaLogs: VictoriaLogsSetupResult;
	victoriaMetrics: VictoriaMetricsSetupResult;
}

export interface ScrapeTarget {
	name: string;
	host: string;
	port: number;
}

/**
 * Get environment variables for configuring n8n log streaming to VictoriaLogs syslog
 */
export function getLogStreamingSyslogEnvironment(
	hostname: string = VICTORIA_LOGS_HOSTNAME,
	port: number = VICTORIA_LOGS_SYSLOG_PORT,
): Record<string, string> {
	return {
		N8N_LOG_STREAMING_SYSLOG_HOST: hostname,
		N8N_LOG_STREAMING_SYSLOG_PORT: String(port),
		N8N_LOG_STREAMING_SYSLOG_PROTOCOL: 'tcp',
		N8N_LOG_STREAMING_SYSLOG_FACILITY: 'local0',
		N8N_LOG_STREAMING_SYSLOG_APP_NAME: 'n8n',
	};
}

/**
 * Get syslog configuration object for n8n log streaming destination
 */
export function getLogStreamingSyslogConfig(
	hostname: string = VICTORIA_LOGS_HOSTNAME,
	port: number = VICTORIA_LOGS_SYSLOG_PORT,
) {
	return {
		host: hostname,
		port,
		protocol: 'tcp' as const,
		facility: 'local0' as const,
		app_name: 'n8n',
	};
}

/**
 * Setup VictoriaLogs container for log aggregation
 *
 * VictoriaLogs provides:
 * - Syslog listener for n8n log streaming feature testing
 * - HTTP API for log queries using LogsQL
 * - JSON line ingestion for container log forwarding
 */
export async function setupVictoriaLogs({
	projectName,
	network,
	hostname = VICTORIA_LOGS_HOSTNAME,
}: {
	projectName: string;
	network: StartedNetwork;
	hostname?: string;
}): Promise<VictoriaLogsSetupResult> {
	const container = await new GenericContainer(TEST_CONTAINER_IMAGES.victoriaLogs)
		.withName(`${projectName}-victoria-logs`)
		.withNetwork(network)
		.withNetworkAliases(hostname)
		.withExposedPorts(VICTORIA_LOGS_HTTP_PORT, VICTORIA_LOGS_SYSLOG_PORT)
		.withCommand([
			'-storageDataPath=/victoria-logs-data',
			'-retentionPeriod=1d',
			`-syslog.listenAddr.tcp=:${VICTORIA_LOGS_SYSLOG_PORT}`,
		])
		.withWaitStrategy(Wait.forHttp('/health', VICTORIA_LOGS_HTTP_PORT).forStatusCode(200))
		.start();

	const httpPort = container.getMappedPort(VICTORIA_LOGS_HTTP_PORT);
	const syslogPort = container.getMappedPort(VICTORIA_LOGS_SYSLOG_PORT);

	return {
		container,
		queryEndpoint: `http://localhost:${httpPort}`,
		internalEndpoint: `http://${hostname}:${VICTORIA_LOGS_HTTP_PORT}`,
		syslog: {
			host: hostname,
			port: VICTORIA_LOGS_SYSLOG_PORT,
		},
	};
}

/**
 * Generate Prometheus scrape configuration for VictoriaMetrics
 */
function generateScrapeConfig(targets: ScrapeTarget[]): string {
	const scrapeConfigs = targets.map((target) => ({
		job_name: target.name,
		static_configs: [
			{
				targets: [`${target.host}:${target.port}`],
				labels: {
					instance: target.name,
				},
			},
		],
		metrics_path: '/metrics',
		scrape_interval: '5s',
	}));

	return `
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
${scrapeConfigs
	.map(
		(config) => `  - job_name: '${config.job_name}'
    static_configs:
      - targets: ['${config.static_configs[0].targets[0]}']
        labels:
          instance: '${config.static_configs[0].labels.instance}'
    metrics_path: '${config.metrics_path}'
    scrape_interval: '${config.scrape_interval}'`,
	)
	.join('\n')}
`;
}

/**
 * Setup VictoriaMetrics container for metrics collection
 *
 * VictoriaMetrics provides:
 * - Prometheus-compatible scraping of n8n /metrics endpoints
 * - PromQL query API for metrics analysis
 */
export async function setupVictoriaMetrics({
	projectName,
	network,
	hostname = VICTORIA_METRICS_HOSTNAME,
	scrapeTargets = [],
}: {
	projectName: string;
	network: StartedNetwork;
	hostname?: string;
	scrapeTargets?: ScrapeTarget[];
}): Promise<VictoriaMetricsSetupResult> {
	const scrapeConfig = generateScrapeConfig(scrapeTargets);

	const container = await new GenericContainer(TEST_CONTAINER_IMAGES.victoriaMetrics)
		.withName(`${projectName}-victoria-metrics`)
		.withNetwork(network)
		.withNetworkAliases(hostname)
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
		.withWaitStrategy(Wait.forHttp('/health', VICTORIA_METRICS_HTTP_PORT).forStatusCode(200))
		.start();

	const httpPort = container.getMappedPort(VICTORIA_METRICS_HTTP_PORT);

	return {
		container,
		queryEndpoint: `http://localhost:${httpPort}`,
		internalEndpoint: `http://${hostname}:${VICTORIA_METRICS_HTTP_PORT}`,
	};
}

/**
 * Setup complete observability stack with VictoriaLogs and VictoriaMetrics
 */
export async function setupObservabilityStack({
	projectName,
	network,
	scrapeTargets = [],
}: {
	projectName: string;
	network: StartedNetwork;
	scrapeTargets?: ScrapeTarget[];
}): Promise<ObservabilityStack> {
	// Start both containers in parallel
	const [victoriaLogs, victoriaMetrics] = await Promise.all([
		setupVictoriaLogs({ projectName, network }),
		setupVictoriaMetrics({ projectName, network, scrapeTargets }),
	]);

	return {
		victoriaLogs,
		victoriaMetrics,
	};
}

/**
 * Get the LogsQL query URL for VictoriaLogs
 */
export function getVictoriaLogsQueryUrl(result: VictoriaLogsSetupResult): string {
	return `${result.queryEndpoint}/select/logsql/query`;
}

/**
 * Get the PromQL query URL for VictoriaMetrics
 */
export function getVictoriaMetricsQueryUrl(result: VictoriaMetricsSetupResult): string {
	return `${result.queryEndpoint}/api/v1/query`;
}
