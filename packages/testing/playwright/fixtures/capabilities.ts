/**
 * Shared container capability configurations.
 *
 * IMPORTANT: Import these instead of defining inline objects in test.use().
 * Using the same object reference enables Playwright worker reuse across
 * test files with identical configurations, avoiding redundant container creation.
 *
 * @example
 * ```ts
 * import { capabilities } from '../fixtures/capabilities';
 * test.use({ addContainerCapability: capabilities.email });
 * ```
 */
export const capabilities = {
	/** Email testing with Mailpit SMTP server */
	email: { email: true },

	/** Mock HTTP server for external API testing */
	proxy: { proxyServerEnabled: true },

	/** Git-based source control testing */
	sourceControl: { sourceControl: true },

	/** External task runner container */
	taskRunner: { taskRunner: true },

	/** OIDC/SSO testing with Keycloak (includes postgres) */
	oidc: { oidc: true },

	/** Observability stack (VictoriaLogs + VictoriaMetrics) */
	observability: { observability: true },
} as const;

export type CapabilityName = keyof typeof capabilities;
