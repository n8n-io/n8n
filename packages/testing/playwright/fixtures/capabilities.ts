import type { N8NConfig } from 'n8n-containers/n8n-test-container-creation';

/**
 * Capability definitions for `test.use({ capability: 'email' })`.
 * Add `@capability:X` tag to tests for orchestration grouping.
 */
export const CAPABILITIES = {
	email: { email: true },
	proxy: { proxyServerEnabled: true },
	'source-control': { sourceControl: true },
	'task-runner': { taskRunner: true },
	oidc: { oidc: true },
	observability: { observability: true },
} as const satisfies Record<string, Partial<N8NConfig>>;

export type Capability = keyof typeof CAPABILITIES;

/**
 * Infrastructure modes (`@mode:X` tags). Most tests run against ALL modes via projects.
 * Use @mode:X only for tests requiring specific infrastructure.
 */
export const INFRASTRUCTURE_MODES = ['postgres', 'queue', 'multi-main'] as const;

// Used by playwright-projects.ts to filter container-only tests in local mode
export const CONTAINER_ONLY_CAPABILITIES = Object.keys(CAPABILITIES) as Capability[];
export const CONTAINER_ONLY_MODES = INFRASTRUCTURE_MODES;
