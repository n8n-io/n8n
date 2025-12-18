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
