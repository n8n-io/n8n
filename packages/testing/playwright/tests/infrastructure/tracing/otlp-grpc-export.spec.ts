/**
 * OTLP/gRPC trace export against a real collector.
 *
 * Boots n8n with `N8N_OTEL_EXPORTER_OTLP_PROTOCOL=grpc` pointed at the tracing
 * stack's Jaeger (which serves OTLP/gRPC on 4317 natively) and proves that a
 * production execution's spans arrive over gRPC. The gRPC exporter and grpc-js
 * are imported lazily at exporter construction, so this is also the only check
 * that both resolve inside the built n8n image.
 *
 * Jaeger's query API is protocol-agnostic, so these assertions are the same
 * ones an HTTP/protobuf run would satisfy — what's under test is the wire
 * protocol, not the span content.
 *
 * `@mode:sqlite` pins the spec to the cheapest container project
 * (`sqlite:infrastructure`) so the tracing stack boots once instead of once per
 * topology. See `playwright-projects.ts`.
 */

import { test, expect } from '../../../fixtures/base';

/**
 * The exporter is configured by env var before the stack boots, so the endpoint
 * cannot come from the tracing helper — it is asserted against the helper below
 * to catch drift in the Jaeger hostname/port.
 */
const JAEGER_OTLP_GRPC_ENDPOINT = 'http://jaeger:4317';
const OTEL_SERVICE_NAME = 'n8n-otlp-grpc';
const WORKFLOW_SPAN_NAME = 'workflow.execute';
const WORKFLOW_ID_TAG = 'n8n.workflow.id';

/**
 * Jaeger filters traces by the span timestamps n8n wrote inside its container,
 * so the query window is kept wide enough to absorb host/container clock skew.
 * The workflow id — unique per run — is what actually scopes the result, so a
 * wide window cannot pick up spans from an earlier run.
 */
const TRACE_QUERY_WINDOW_MS = 5 * 60_000;

test.use({
	capability: {
		services: ['tracing'],
		env: {
			N8N_OTEL_ENABLED: 'true',
			N8N_OTEL_EXPORTER_OTLP_PROTOCOL: 'grpc',
			N8N_OTEL_EXPORTER_OTLP_ENDPOINT: JAEGER_OTLP_GRPC_ENDPOINT,
			N8N_OTEL_EXPORTER_SERVICE_NAME: OTEL_SERVICE_NAME,
			TEST_ISOLATION: 'otlp-grpc-export',
		},
	},
});

// Boots n8n plus Jaeger and n8n-tracer, then waits out the span batch delay.
test.setTimeout(240_000);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/**
 * Operation names of the spans Jaeger holds for one workflow, read from the raw
 * `/api/traces` payload (`{ data: [{ spans: [{ operationName, tags }] }] }`).
 */
function spanNamesForWorkflow(traces: unknown[], workflowId: string): string[] {
	const names: string[] = [];

	for (const trace of traces) {
		if (!isRecord(trace) || !Array.isArray(trace.spans)) continue;

		for (const span of trace.spans) {
			if (!isRecord(span) || typeof span.operationName !== 'string') continue;
			if (!Array.isArray(span.tags)) continue;

			const isOurWorkflow = span.tags.some(
				(tag) => isRecord(tag) && tag.key === WORKFLOW_ID_TAG && tag.value === workflowId,
			);
			if (isOurWorkflow) names.push(span.operationName);
		}
	}

	return names;
}

test.describe(
	'OpenTelemetry gRPC export @mode:sqlite @capability:tracing',
	{
		annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }],
	},
	() => {
		test('should export execution spans to the collector over gRPC', async ({ api, services }) => {
			const tracing = services.tracing;

			// Guards the hardcoded env endpoint against a rename in the tracing service.
			expect(tracing.internalOtlpGrpcEndpoint).toBe(JAEGER_OTLP_GRPC_ENDPOINT);

			const { webhookPath, workflowId } = await api.workflows.importWorkflowFromFile(
				'simple-webhook-test.json',
			);

			// Only production executions are traced by default, so trigger the
			// activated workflow through its webhook rather than running it manually.
			const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
				data: { protocol: 'grpc' },
			});
			expect(webhookResponse.ok()).toBe(true);

			const execution = await api.workflows.waitForExecution(workflowId, 30_000);
			expect(execution.status).toBe('success');

			// Reachable while the stack is up, e.g. with N8N_CONTAINERS_KEEPALIVE=true.
			console.log(`[OTEL gRPC] Jaeger UI: ${tracing.jaegerUiUrl}`);

			// The SDK batches spans (5s default flush), then Jaeger indexes them.
			await expect
				.poll(
					async () => {
						const now = Date.now();
						const traces = await tracing.fetchTraces({
							since: new Date(now - TRACE_QUERY_WINDOW_MS),
							until: new Date(now + TRACE_QUERY_WINDOW_MS),
							services: [OTEL_SERVICE_NAME],
						});
						return spanNamesForWorkflow(traces, workflowId);
					},
					{ timeout: 60_000, intervals: [1_000, 2_000, 5_000] },
				)
				.toContain(WORKFLOW_SPAN_NAME);
		});
	},
);
