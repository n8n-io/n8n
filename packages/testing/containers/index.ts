/**
 * n8n Test Containers
 *
 * This package provides container management utilities for n8n testing.
 */

// Stack orchestration
export { createN8NStack } from './stack';
export type { N8NConfig, N8NStack } from './stack';

// Performance plans
export * from './performance-plans';

// Container test helpers
export { ContainerTestHelpers } from './helpers/container';
export type { ContainerTestHelpersOptions } from './helpers/container';

// Service types
export type {
	Service,
	ServiceResult,
	ServiceHelpers,
	HelperContext,
	HelperFactory,
	HelperFactories,
} from './services/types';

// Mailpit
export {
	MailpitHelper,
	type MailpitMessage,
	type MailpitMessageSummary,
	type MailpitQuery,
	type MailpitMeta,
	type MailpitResult,
} from './services/mailpit';

// Keycloak/OIDC test constants
export {
	KEYCLOAK_TEST_REALM,
	KEYCLOAK_TEST_CLIENT_ID,
	KEYCLOAK_TEST_CLIENT_SECRET,
	KEYCLOAK_TEST_USER_EMAIL,
	KEYCLOAK_TEST_USER_PASSWORD,
	KEYCLOAK_TEST_USER_FIRSTNAME,
	KEYCLOAK_TEST_USER_LASTNAME,
	N8N_KEYCLOAK_CERT_PATH,
	KeycloakHelper,
	type KeycloakConfig,
	type KeycloakMeta,
	type KeycloakResult,
} from './services/keycloak';

// Observability stack
export {
	SYSLOG_DEFAULTS,
	ObservabilityHelper,
	LogsHelper,
	MetricsHelper,
	escapeLogsQL,
	type ScrapeTarget,
	type ObservabilityConfig,
	type ObservabilityMeta,
	type ObservabilityResult,
	type LogEntry,
	type LogQueryOptions,
	type MetricResult,
	type WaitForMetricOptions,
} from './services/observability';

// Tracing stack
export {
	TracingHelper,
	type TracingConfig,
	type TracingMeta,
	type TracingResult,
} from './services/tracing';

// Gitea (source control)
export { GiteaHelper, type GiteaMeta, type GiteaResult } from './services/gitea';

// Service registry
export { services, helperFactories } from './services/registry';
