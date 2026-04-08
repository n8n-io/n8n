import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { HelperContext, Service, ServiceResult } from './types';

const JAEGER_OTLP_PORT = 4318;
const JAEGER_UI_PORT = 16686;
const N8N_TRACER_INGEST_PORT = 8889;
const N8N_TRACER_HEALTH_PORT = 8888;
const JAEGER_HOSTNAME = 'jaeger';
const N8N_TRACER_HOSTNAME = 'n8n-tracer';

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
	containers: StartedTestContainer[];
};

export interface TracerWebhookConfig {
	url: string;
	method: 'POST';
	label: string;
	subscribedEvents: string[];
}

export const tracing: Service<TracingResult> = {
	description: 'Tracing stack (Jaeger + n8n-tracer)',

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

export class TracingHelper {
	private readonly meta: TracingMeta;

	constructor(meta: TracingMeta) {
		this.meta = meta;
	}

	get jaegerUiUrl(): string {
		return this.meta.jaeger.uiUrl;
	}

	get internalOtlpEndpoint(): string {
		return this.meta.jaeger.internalOtlpEndpoint;
	}

	get internalIngestEndpoint(): string {
		return this.meta.tracer.internalIngestEndpoint;
	}

	get ingestUrl(): string {
		return this.meta.tracer.ingestUrl;
	}

	getWebhookConfig(label = 'n8n-tracer'): TracerWebhookConfig {
		return {
			url: this.meta.tracer.ingestUrl,
			method: 'POST',
			label,
			subscribedEvents: ['*'],
		};
	}
}

export function createTracingHelper(ctx: HelperContext): TracingHelper {
	const result = ctx.serviceResults.tracing as TracingResult | undefined;
	if (!result) {
		throw new Error('Tracing service not found in context');
	}
	return new TracingHelper(result.meta);
}

declare module './types' {
	interface ServiceHelpers {
		tracing: TracingHelper;
	}
}
