/**
 * n8n Test Containers
 *
 * This package provides container management utilities for n8n testing.
 * Services are accessed via n8nContainer.services.* in tests.
 */

// Stack orchestration
export { createN8NStack } from './stack';
export type { N8NConfig, N8NStack } from './stack';

// Performance plans (CLI-only, not for tests)
export * from './performance-plans';

// Service types
export type {
	Service,
	ServiceResult,
	ServiceHelpers,
	HelperContext,
	HelperFactory,
	HelperFactories,
} from './services/types';

// Mailpit - Types for email testing
export {
	type MailpitMessage,
	type MailpitMessageSummary,
	type MailpitQuery,
	type MailpitMeta,
} from './services/mailpit';

// Keycloak/OIDC - Types only (credentials accessed via n8nContainer.services.keycloak)
export {
	N8N_KEYCLOAK_CERT_PATH,
	type KeycloakMeta,
} from './services/keycloak';

// Observability - Types for logs/metrics (accessed via n8nContainer.services.observability)
export {
	escapeLogsQL,
	type ObservabilityMeta,
	type LogEntry,
	type LogQueryOptions,
	type MetricResult,
	type WaitForMetricOptions,
} from './services/observability';

// Tracing - Types (accessed via n8nContainer.services.tracing)
export { type TracingMeta } from './services/tracing';

// Gitea - Types for source control (accessed via n8nContainer.services.gitea)
export { type GiteaHelper, type GiteaMeta } from './services/gitea';

// Service registry
export { services, helperFactories } from './services/registry';
