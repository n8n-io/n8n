/**
 * Tracing Stack for Workflow Execution Visualization
 *
 * This module provides n8n-tracer and Jaeger containers for:
 * - Distributed tracing of workflow executions
 * - Visualizing job lifecycle in queue mode (job → workflow → node → task)
 * - Debugging multi-main/worker coordination
 */

import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from './test-containers';

// Default ports for tracing stack
const JAEGER_OTLP_PORT = 4318;
const JAEGER_UI_PORT = 16686;
const N8N_TRACER_INGEST_PORT = 8889;
const N8N_TRACER_HEALTH_PORT = 8888;

// Hostnames for container networking
const JAEGER_HOSTNAME = 'jaeger';
const N8N_TRACER_HOSTNAME = 'n8n-tracer';

export interface JaegerSetupResult {
	container: StartedTestContainer;
	/** External UI URL for viewing traces (from host) */
	uiUrl: string;
	/** Internal OTLP endpoint for container-to-container communication */
	internalOtlpEndpoint: string;
}

export interface N8nTracerSetupResult {
	container: StartedTestContainer;
	/** Internal ingest endpoint for n8n log streaming */
	internalIngestEndpoint: string;
	/** Internal ingest URL for log streaming destination config */
	ingestUrl: string;
}

export interface TracingStack {
	jaeger: JaegerSetupResult;
	n8nTracer: N8nTracerSetupResult;
}

/**
 * Setup Jaeger container for trace visualization
 *
 * Jaeger provides:
 * - OTLP receiver for traces from n8n-tracer
 * - Web UI for trace visualization
 * - Search and analysis of distributed traces
 */
export async function setupJaeger({
	projectName,
	network,
	hostname = JAEGER_HOSTNAME,
}: {
	projectName: string;
	network: StartedNetwork;
	hostname?: string;
}): Promise<JaegerSetupResult> {
	const container = await new GenericContainer(TEST_CONTAINER_IMAGES.jaeger)
		.withName(`${projectName}-jaeger`)
		.withNetwork(network)
		.withNetworkAliases(hostname)
		.withLabels({
			'com.docker.compose.project': projectName,
			'com.docker.compose.service': 'jaeger',
		})
		.withExposedPorts(JAEGER_UI_PORT, JAEGER_OTLP_PORT)
		.withEnvironment({
			COLLECTOR_OTLP_ENABLED: 'true',
			// Bind OTLP HTTP to all interfaces for container-to-container communication
			COLLECTOR_OTLP_HTTP_HOST_PORT: '0.0.0.0:4318',
		})
		.withWaitStrategy(
			Wait.forHttp('/', JAEGER_UI_PORT).forStatusCode(200).withStartupTimeout(60000),
		)
		.withReuse()
		.start();

	const uiPort = container.getMappedPort(JAEGER_UI_PORT);

	return {
		container,
		uiUrl: `http://localhost:${uiPort}`,
		internalOtlpEndpoint: `http://${hostname}:${JAEGER_OTLP_PORT}`,
	};
}

/**
 * Setup n8n-tracer container for trace generation
 *
 * n8n-tracer provides:
 * - HTTP endpoint for n8n log streaming events
 * - Conversion of n8n events to OpenTelemetry traces
 * - Export to Jaeger via OTLP
 *
 * Note: Only 'scaling' mode is supported for container testing.
 * 'regular' mode watches local log files which doesn't apply to containers.
 */
export async function setupN8nTracer({
	projectName,
	network,
	jaegerOtlpEndpoint,
	deploymentMode = 'scaling',
	hostname = N8N_TRACER_HOSTNAME,
}: {
	projectName: string;
	network: StartedNetwork;
	jaegerOtlpEndpoint: string;
	deploymentMode?: 'scaling';
	hostname?: string;
}): Promise<N8nTracerSetupResult> {
	const container = await new GenericContainer(TEST_CONTAINER_IMAGES.n8nTracer)
		.withName(`${projectName}-n8n-tracer`)
		.withNetwork(network)
		.withNetworkAliases(hostname)
		.withLabels({
			'com.docker.compose.project': projectName,
			'com.docker.compose.service': 'n8n-tracer',
		})
		.withExposedPorts(N8N_TRACER_INGEST_PORT, N8N_TRACER_HEALTH_PORT)
		.withEnvironment({
			N8N_DEPLOYMENT_MODE: deploymentMode,
			OTEL_EXPORTER_OTLP_ENDPOINT: jaegerOtlpEndpoint,
			HTTP_INGEST_PORT: String(N8N_TRACER_INGEST_PORT),
			HEALTH_PORT: String(N8N_TRACER_HEALTH_PORT),
		})
		.withWaitStrategy(
			Wait.forHttp('/health', N8N_TRACER_HEALTH_PORT).forStatusCode(200).withStartupTimeout(60000),
		)
		.withReuse()
		.start();

	return {
		container,
		internalIngestEndpoint: `http://${hostname}:${N8N_TRACER_INGEST_PORT}`,
		ingestUrl: `http://${hostname}:${N8N_TRACER_INGEST_PORT}/ingest`,
	};
}

/**
 * Setup complete tracing stack with Jaeger and n8n-tracer
 */
export async function setupTracingStack({
	projectName,
	network,
	deploymentMode = 'scaling',
}: {
	projectName: string;
	network: StartedNetwork;
	deploymentMode?: 'scaling';
}): Promise<TracingStack> {
	// Start Jaeger first (OTLP receiver)
	const jaeger = await setupJaeger({ projectName, network });

	// Start n8n-tracer pointing to Jaeger
	const n8nTracer = await setupN8nTracer({
		projectName,
		network,
		jaegerOtlpEndpoint: jaeger.internalOtlpEndpoint,
		deploymentMode,
	});

	return {
		jaeger,
		n8nTracer,
	};
}

/**
 * Webhook destination configuration for n8n-tracer.
 * Use with api.createWebhookDestination() to enable tracing via log streaming.
 */
export interface TracerWebhookConfig {
	url: string;
	method: 'POST';
	label: string;
	subscribedEvents: string[];
}

/**
 * Get webhook destination config for n8n-tracer.
 *
 * @example
 * ```typescript
 * await api.enableFeature('logStreaming');
 * const config = getTracerWebhookConfig(tracingStack);
 * const destination = await api.createWebhookDestination(config);
 * ```
 */
export function getTracerWebhookConfig(
	stack: TracingStack,
	label = 'n8n-tracer',
): TracerWebhookConfig {
	return {
		url: stack.n8nTracer.ingestUrl,
		method: 'POST',
		label,
		subscribedEvents: ['*'],
	};
}
