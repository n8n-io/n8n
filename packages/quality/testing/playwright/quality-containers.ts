import { containerFixtures, type ContainerWorkerFixtures } from './fixtures/containers';
import { observabilityFixtures, type ObservabilityTestFixtures } from './fixtures/observability';
import { test as base } from './quality-test';

export { expect } from './quality-test';
export type { ContainerWorkerFixtures } from './fixtures/containers';
export type { N8NConfig, N8NStack } from 'n8n-containers/stack';

export const test = base.extend<ObservabilityTestFixtures, ContainerWorkerFixtures>({
	...containerFixtures,
	...observabilityFixtures,
});
