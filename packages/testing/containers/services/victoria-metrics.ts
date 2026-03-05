import type { StartedNetwork } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { HelperContext, Service, ServiceResult, StartContext } from './types';

const VICTORIA_METRICS_HTTP_PORT = 8428;
const VICTORIA_METRICS_HOSTNAME = 'victoria-metrics';

export interface ScrapeTarget {
	job: string;
	instance: string;
	host: string;
	port: number;
}

export interface VictoriaMetricsConfig {
	scrapeTargets: ScrapeTarget[];
}

export interface VictoriaMetricsMeta {
	queryEndpoint: string;
	internalEndpoint: string;
}

export type VictoriaMetricsResult = ServiceResult<VictoriaMetricsMeta>;

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

export const victoriaMetrics: Service<VictoriaMetricsResult> = {
	description: 'VictoriaMetrics',

	getOptions(ctx: StartContext): VictoriaMetricsConfig {
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

		return { scrapeTargets };
	},

	async start(
		network: StartedNetwork,
		projectName: string,
		config?: unknown,
	): Promise<VictoriaMetricsResult> {
		const { scrapeTargets = [] } = (config as VictoriaMetricsConfig) ?? {};
		const scrapeConfig = generateScrapeConfig(scrapeTargets);

		const container = await new GenericContainer(TEST_CONTAINER_IMAGES.victoriaMetrics)
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

		const httpPort = container.getMappedPort(VICTORIA_METRICS_HTTP_PORT);

		return {
			container,
			meta: {
				queryEndpoint: `http://localhost:${httpPort}`,
				internalEndpoint: `http://${VICTORIA_METRICS_HOSTNAME}:${VICTORIA_METRICS_HTTP_PORT}`,
			},
		};
	},

	env(): Record<string, string> {
		return {
			N8N_METRICS_ENABLED: 'true',
		};
	},
};

export interface MetricResult {
	labels: Record<string, string>;
	value: number;
}

export interface WaitForMetricOptions {
	timeoutMs?: number;
	intervalMs?: number;
	predicate?: (values: MetricResult[]) => boolean;
}

export class MetricsHelper {
	constructor(private readonly endpoint: string) {}

	async exportAll(options: { start?: string; end?: string } = {}): Promise<string> {
		const params = new URLSearchParams({
			'match[]': '{__name__=~".+"}',
		});
		if (options.start) params.set('start', options.start);
		if (options.end) params.set('end', options.end);

		const response = await fetch(`${this.endpoint}/api/v1/export?${params}`);
		if (!response.ok) {
			throw new Error(`VictoriaMetrics export failed: ${response.status}`);
		}

		return await response.text();
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
		const { setTimeout: wait } = await import('node:timers/promises');
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

export function createMetricsHelper(ctx: HelperContext): MetricsHelper {
	const result = ctx.serviceResults.victoriaMetrics as VictoriaMetricsResult | undefined;
	if (!result) {
		throw new Error('VictoriaMetrics service not found in context');
	}
	return new MetricsHelper(result.meta.queryEndpoint);
}
