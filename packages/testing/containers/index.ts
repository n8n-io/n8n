/**
 * n8n Test Containers
 *
 * This package provides container management utilities for n8n testing.
 * Services are accessed via n8nContainer.services.* in tests.
 */

// Stack orchestration - primary public API
export { createN8NStack } from './stack';
export type { N8NConfig, N8NStack } from './stack';

// Performance plans (CLI-only)
export * from './performance-plans';

// Types used externally by tests
export { type LogEntry, type MetricsHelper } from './services/observability';
export { type GiteaHelper } from './services/gitea';
