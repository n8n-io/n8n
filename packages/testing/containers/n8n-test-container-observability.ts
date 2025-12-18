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
	/** Job name for grouping (e.g., 'n8n-main', 'n8n-worker') */
	job: string;
	/** Instance identifier (e.g., 'n8n-main-1', 'n8n-worker-2') */
	instance: string;
	/** Hostname for scraping */
	host: string;
	/** Port for scraping */
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
			Wait.forHttp('/health', VICTORIA_LOGS_HTTP_PORT).forStatusCode(200).withStartupTimeout(60000),
		)
		.withReuse()
		.start();

	const httpPort = container.getMappedPort(VICTORIA_LOGS_HTTP_PORT);

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
 *
 * Groups targets by job name so that:
 * - job = service type (e.g., 'n8n-main', 'n8n-worker')
 * - instance = specific instance identifier (e.g., 'n8n-main-1')
 */
function generateScrapeConfig(targets: ScrapeTarget[]): string {
	// Group targets by job name
	const jobGroups = new Map<string, ScrapeTarget[]>();
	for (const target of targets) {
		const existing = jobGroups.get(target.job) ?? [];
		existing.push(target);
		jobGroups.set(target.job, existing);
	}

	// Generate scrape config for each job group
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

	// Note: VictoriaMetrics doesn't support evaluation_interval (Prometheus-only field)
	return `
global:
  scrape_interval: 15s

scrape_configs:
${scrapeConfigs.join('\n')}
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
