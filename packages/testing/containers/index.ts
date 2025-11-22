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
export {
	setupDex,
	getDexEnvironment,
	getDexDiscoveryUrl,
	getDexIssuerUrl,
	DEFAULT_DEX_PORT,
	DEX_TEST_CLIENT_ID,
	DEX_TEST_CLIENT_SECRET,
	DEX_TEST_USER_EMAIL,
	DEX_TEST_USER_PASSWORD,
} from './n8n-test-container-dex';
