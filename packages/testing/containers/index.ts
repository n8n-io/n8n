/**
 * n8n Test Containers
 *
 * This package provides container management utilities for n8n testing.
 */

export { createN8NStack } from './n8n-test-container-creation';
export type { N8NConfig, N8NStack } from './n8n-test-container-creation';

export * from './performance-plans';

export { ContainerTestHelpers } from './n8n-test-container-helpers';
export {
	setupMailpit,
	getMailpitEnvironment,
	mailpitClear,
	mailpitList,
	mailpitGet,
	mailpitWaitForMessage,
	type MailpitMessage,
	type MailpitQuery,
} from './n8n-test-container-mailpit';

// Keycloak/OIDC test constants
export {
	KEYCLOAK_TEST_REALM,
	KEYCLOAK_TEST_CLIENT_ID,
	KEYCLOAK_TEST_CLIENT_SECRET,
	KEYCLOAK_TEST_USER_EMAIL,
	KEYCLOAK_TEST_USER_PASSWORD,
	KEYCLOAK_TEST_USER_FIRSTNAME,
	KEYCLOAK_TEST_USER_LASTNAME,
} from './n8n-test-container-keycloak';

// VictoriaObs stack for test observability
export {
	setupVictoriaLogs,
	setupVictoriaMetrics,
	setupObservabilityStack,
	SYSLOG_DEFAULTS,
	type VictoriaLogsSetupResult,
	type VictoriaMetricsSetupResult,
	type ObservabilityStack,
	type ScrapeTarget,
} from './n8n-test-container-observability';

// VictoriaObs query helpers
export {
	VictoriaLogsHelper,
	VictoriaMetricsHelper,
	ObservabilityHelper,
	type LogEntry,
	type LogQueryOptions,
	type MetricResult,
	type WaitForMetricOptions,
} from './n8n-test-container-victoria-helpers';

// Export Vector setup result type for observability stack
export { type VectorSetupResult } from './n8n-test-container-observability';

// Tracing stack for workflow execution visualization
export {
	setupJaeger,
	setupN8nTracer,
	setupTracingStack,
	getTracerWebhookConfig,
	type JaegerSetupResult,
	type N8nTracerSetupResult,
	type TracingStack,
	type TracerWebhookConfig,
} from './n8n-test-container-tracing';
