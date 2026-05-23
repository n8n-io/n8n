/**
 * n8n Test Containers
 *
 * This package provides container management utilities for n8n testing.
 * Services are accessed via n8nContainer.services.* in tests.
 */

// Stack orchestration - primary public API
export { createN8NStack } from './stack';
export type { N8NConfig, N8NStack } from './stack';

// Startup failure diagnostics — consumed by the playwright observability fixture
// to attach n8n container logs / readiness payloads when n8nContainer is undefined
// because createN8NStack threw before returning.
export { consumeStartupFailure } from './startup-diagnostics';
export type { N8NStartupDiagnostics } from './services/n8n';

// K3s + Helm chart stack - for Kubernetes deployment validation
export { createHelmStack } from './helm-stack';
export type { HelmStack, HelmStackConfig, HelmStackMode } from './helm-stack';

// Service-only stack (no n8n containers) - for integration tests
export {
	createServiceStack,
	collectExternalEnv,
	devEnvFilePath,
	writeDevEnvFile,
} from './service-stack';

export type { StackTelemetryRecord } from './telemetry';

// Performance plans (CLI-only)
export * from './performance-plans';

// Types used externally by tests
export { type LogEntry, type MetricsHelper } from './services/observability';
export { type GiteaHelper } from './services/gitea';
export { KafkaHelper } from './services/kafka';
