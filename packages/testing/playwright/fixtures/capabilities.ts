import type { N8NConfig } from 'n8n-containers/stack';

/**
 * Capability definitions for `test.use({ capability: 'email' })`.
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
	kafka: { services: ['kafka'] },
	'external-secrets': {
		services: ['localstack'],
		env: {
			// Enable project-scoped external secrets feature at startup
			// (required for secret-providers-connections API)
			N8N_ENV_FEAT_EXTERNAL_SECRETS_FOR_PROJECTS: 'true',
		},
	},
	kent: { services: ['kent'] },
	'dynamic-credentials': {
		services: ['keycloak'],
		env: {
			N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: 'true',
			// Static token required to allow unauthenticated (external) requests to dynamic credential endpoints
			N8N_DYNAMIC_CREDENTIALS_ENDPOINT_AUTH_TOKEN: 'e2e-test-endpoint-token',
		},
	},
} as const satisfies Record<string, Partial<N8NConfig>>;

// Community package requests add unrelated traffic to proxy recordings.
export const PROXY_WITHOUT_COMMUNITY_PACKAGES = {
	services: ['proxy'],
	env: { N8N_COMMUNITY_PACKAGES_ENABLED: 'false' },
} as const satisfies Partial<N8NConfig>;

export type Capability = keyof typeof CAPABILITIES;
export type CapabilityOption = Capability | N8NConfig;

export function shouldSkipContainerRequirement(
	capability: CapabilityOption | undefined,
	isLocal: boolean,
): boolean {
	if (!isLocal || !capability) return false;
	const config = typeof capability === 'string' ? CAPABILITIES[capability] : capability;
	return (config.services?.length ?? 0) > 0;
}

export const ALLOW_CONTAINER_ONLY = process.env.PLAYWRIGHT_ALLOW_CONTAINER_ONLY === 'true';

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

export const CONTAINER_ONLY_MODES = INFRASTRUCTURE_MODES;
