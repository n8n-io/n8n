import type { N8NConfig } from 'n8n-containers/stack';

/**
 * Capability definitions for `test.use({ capability: 'email' })`.
 * Add `@capability:X` tag to tests for orchestration grouping.
 *
 * Maps capability names to service registry keys.
 * Note: task-runner is always enabled, no capability needed.
 */
export const CAPABILITIES = {
	email: { services: ['mailpit'] },
	proxy: { services: ['proxy'] },
	'source-control': { services: ['gitea'] },
	oidc: { services: ['keycloak'] },
	observability: { services: ['victoriaLogs', 'victoriaMetrics', 'vector'] },
} as const satisfies Record<string, Partial<N8NConfig>>;

export type Capability = keyof typeof CAPABILITIES;

/**
 * Infrastructure modes (`@mode:X` tags). Most tests run against ALL modes via projects.
 * Use @mode:X only for tests requiring specific infrastructure.
 */
export const INFRASTRUCTURE_MODES = ['postgres', 'queue', 'multi-main'] as const;

/**
 * Tests requiring enterprise license features (`@licensed` tag).
 * These tests only run in container mode where a license file is available.
 * Use for tests that interact with enterprise-only API endpoints (log streaming, SSO, etc.)
 */
export const LICENSED_TAG = 'licensed';

// Used by playwright-projects.ts to filter container-only tests in local mode
export const CONTAINER_ONLY_CAPABILITIES = Object.keys(CAPABILITIES) as Capability[];
export const CONTAINER_ONLY_MODES = INFRASTRUCTURE_MODES;
