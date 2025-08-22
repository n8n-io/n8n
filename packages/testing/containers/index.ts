/**
 * n8n Test Containers
 *
 * This package provides container management utilities for n8n testing.
 */

export { createN8NStack } from './n8n-test-container-creation';
export type { N8NConfig, N8NStack } from './n8n-test-container-creation';

export * from './performance-plans';

export { ContainerTestHelpers } from './n8n-test-container-helpers';
