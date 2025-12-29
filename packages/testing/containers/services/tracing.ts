/**
 * Tracing Stack Service
 *
 * Combines Jaeger and n8n-tracer for:
 * - Distributed tracing of workflow executions
 * - Visualizing job lifecycle in queue mode (job → workflow → node → task)
 * - Debugging multi-main/worker coordination
 */

import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { HelperContext, Service, ServiceResult } from './types';

// Constants
const JAEGER_OTLP_PORT = 4318;
const JAEGER_UI_PORT = 16686;
const N8N_TRACER_INGEST_PORT = 8889;
const N8N_TRACER_HEALTH_PORT = 8888;
const JAEGER_HOSTNAME = 'jaeger';
const N8N_TRACER_HOSTNAME = 'n8n-tracer';

// Types
export interface TracingConfig {
	deploymentMode?: 'scaling';
}

export interface TracingMeta {
	jaeger: {
		uiUrl: string;
		internalOtlpEndpoint: string;
	};
	tracer: {
		internalIngestEndpoint: string;
		ingestUrl: string;
	};
}

export type TracingResult = ServiceResult<TracingMeta> & {
	// Additional containers for cleanup
	containers: StartedTestContainer[];
};

/** Webhook destination configuration for n8n-tracer. */
export interface TracerWebhookConfig {
	url: string;
	method: 'POST';
	label: string;
	subscribedEvents: string[];
}

// Service definition
export const tracing: Service<TracingResult> = {
	description: 'Tracing stack (Jaeger + n8n-tracer)',
	configKey: 'tracing',

	async start(
		network: StartedNetwork,
		projectName: string,
		config?: unknown,
	): Promise<TracingResult> {
		const { deploymentMode = 'scaling' } = (config as TracingConfig) ?? {};

		// Start Jaeger first (OTLP receiver)
		const jaegerContainer = await new GenericContainer(TEST_CONTAINER_IMAGES.jaeger)
			.withName(`${projectName}-jaeger`)
			.withNetwork(network)
			.withNetworkAliases(JAEGER_HOSTNAME)
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': 'jaeger',
			})
			.withExposedPorts(JAEGER_UI_PORT, JAEGER_OTLP_PORT)
			.withEnvironment({
				COLLECTOR_OTLP_ENABLED: 'true',
				COLLECTOR_OTLP_HTTP_HOST_PORT: '0.0.0.0:4318',
			})
			.withWaitStrategy(
				Wait.forHttp('/', JAEGER_UI_PORT).forStatusCode(200).withStartupTimeout(60000),
			)
			.withReuse()
			.start();

		const jaegerUiPort = jaegerContainer.getMappedPort(JAEGER_UI_PORT);
		const internalOtlpEndpoint = `http://${JAEGER_HOSTNAME}:${JAEGER_OTLP_PORT}`;

		// Start n8n-tracer pointing to Jaeger
		const tracerContainer = await new GenericContainer(TEST_CONTAINER_IMAGES.n8nTracer)
			.withName(`${projectName}-n8n-tracer`)
			.withNetwork(network)
			.withNetworkAliases(N8N_TRACER_HOSTNAME)
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': 'n8n-tracer',
			})
			.withExposedPorts(N8N_TRACER_INGEST_PORT, N8N_TRACER_HEALTH_PORT)
			.withEnvironment({
				N8N_DEPLOYMENT_MODE: deploymentMode,
				OTEL_EXPORTER_OTLP_ENDPOINT: internalOtlpEndpoint,
				HTTP_INGEST_PORT: String(N8N_TRACER_INGEST_PORT),
				HEALTH_PORT: String(N8N_TRACER_HEALTH_PORT),
			})
			.withWaitStrategy(
				Wait.forHttp('/health', N8N_TRACER_HEALTH_PORT)
					.forStatusCode(200)
					.withStartupTimeout(60000),
			)
			.withReuse()
			.start();

		const internalIngestEndpoint = `http://${N8N_TRACER_HOSTNAME}:${N8N_TRACER_INGEST_PORT}`;

		return {
			container: jaegerContainer, // Primary container
			containers: [jaegerContainer, tracerContainer],
			meta: {
				jaeger: {
					uiUrl: `http://localhost:${jaegerUiPort}`,
					internalOtlpEndpoint,
				},
				tracer: {
					internalIngestEndpoint,
					ingestUrl: `${internalIngestEndpoint}/ingest`,
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

// Helper class
export class TracingHelper {
	private readonly meta: TracingMeta;

	constructor(meta: TracingMeta) {
		this.meta = meta;
	}

	/** External Jaeger UI URL for viewing traces (from host) */
	get jaegerUiUrl(): string {
		return this.meta.jaeger.uiUrl;
	}

	/** Internal OTLP endpoint for container-to-container communication */
	get internalOtlpEndpoint(): string {
		return this.meta.jaeger.internalOtlpEndpoint;
	}

	/** Internal ingest endpoint for n8n log streaming */
	get internalIngestEndpoint(): string {
		return this.meta.tracer.internalIngestEndpoint;
	}

	/** Ingest URL for log streaming destination config */
	get ingestUrl(): string {
		return this.meta.tracer.ingestUrl;
	}

	/**
	 * Get webhook destination config for n8n-tracer.
	 *
	 * @example
	 * ```typescript
	 * await api.enableFeature('logStreaming');
	 * const config = tracing.getWebhookConfig();
	 * const destination = await api.createWebhookDestination(config);
	 * ```
	 */
	getWebhookConfig(label = 'n8n-tracer'): TracerWebhookConfig {
		return {
			url: this.meta.tracer.ingestUrl,
			method: 'POST',
			label,
			subscribedEvents: ['*'],
		};
	}
}

// Helper factory
export function createTracingHelper(ctx: HelperContext): TracingHelper {
	const result = ctx.serviceResults.tracing as TracingResult | undefined;
	if (!result) {
		throw new Error('Tracing service not found in context');
	}
	return new TracingHelper(result.meta);
}

// Type registration via declaration merging
declare module './types' {
	interface ServiceHelpers {
		tracing: TracingHelper;
	}
}
