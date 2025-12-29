/**
 * Container Test Helpers
 *
 * Provides a unified interface for interacting with test containers,
 * including a Proxy-based `services` accessor for type-safe helper access.
 *
 * Usage in tests:
 * ```typescript
 * test('example', async ({ chaos }) => {
 *   // Primary: Access service helpers via .services (type-safe, discoverable)
 *   await chaos.services.mailpit.waitForMessage({ to: 'user@example.com' });
 *   await chaos.services.gitea.createRepo('my-repo');
 *   await chaos.services.observability.logs.query('level:error');
 *
 *   // Shortcuts: Convenience accessors for common services
 *   await chaos.logs.query('level:error');     // chaos.services.observability.logs
 *   await chaos.metrics.query('up');           // chaos.services.observability.metrics
 *   await chaos.mail.waitForMessage({ ... }); // chaos.services.mailpit (deprecated)
 * });
 * ```
 */

import type { StartedTestContainer, StoppedTestContainer } from 'testcontainers';

import { createHelperContext } from './context';
import { helperFactories } from '../services/registry';
import type { ServiceResult, ServiceHelpers, HelperFactories } from '../services/types';

export interface ContainerTestHelpersOptions {
	/** Service results for helper instantiation */
	serviceResults?: Record<string, ServiceResult>;
}

/**
 * Container helpers bound to a specific set of containers.
 *
 * @example
 * ```typescript
 * // Access service helpers via the Proxy-based services accessor
 * await chaos.services.mailpit.waitForMessage({ to: 'user@example.com' });
 * await chaos.services.keycloak.internalDiscoveryUrl;
 * await chaos.services.observability.logs.query('level:error');
 *
 * // Or use convenience shortcuts
 * await chaos.logs.query('level:error');
 * await chaos.mail.waitForMessage({ ... });
 * ```
 */
export class ContainerTestHelpers {
	private readonly _containers: StartedTestContainer[];
	private readonly _serviceResults: Record<string, ServiceResult>;
	private _services?: ServiceHelpers;

	constructor(containers: StartedTestContainer[], options?: ContainerTestHelpersOptions) {
		this._containers = containers;
		this._serviceResults = options?.serviceResults ?? {};
	}

	/**
	 * Type-safe accessor for service helpers.
	 * Uses Proxy for lazy instantiation and caching.
	 *
	 * @example
	 * ```typescript
	 * await chaos.services.mailpit.waitForMessage({ to: 'user@example.com' });
	 * await chaos.services.gitea.createRepo('my-repo');
	 * await chaos.services.observability.logs.query('level:error');
	 * ```
	 */
	get services(): ServiceHelpers {
		if (!this._services) {
			const ctx = createHelperContext(this._containers, this._serviceResults);
			const cache: Partial<ServiceHelpers> = {};

			this._services = new Proxy({} as ServiceHelpers, {
				get: <K extends keyof ServiceHelpers>(
					_target: ServiceHelpers,
					prop: K,
				): ServiceHelpers[K] => {
					if (prop in cache) {
						return cache[prop]!;
					}

					const factory = (helperFactories as HelperFactories)[prop];
					if (!factory) {
						throw new Error(
							`No helper factory found for service: ${String(prop)}. ` +
								`Available helpers: ${Object.keys(helperFactories).join(', ')}`,
						);
					}

					const helper = factory(ctx);
					cache[prop] = helper;
					return helper;
				},
				has: (_target, prop) => prop in helperFactories,
				ownKeys: () => Object.keys(helperFactories),
				getOwnPropertyDescriptor: (_target, prop) => {
					if (prop in helperFactories) {
						return { enumerable: true, configurable: true };
					}
					return undefined;
				},
			});
		}
		return this._services;
	}

	/**
	 * All containers in the stack
	 */
	get containers(): StartedTestContainer[] {
		return this._containers;
	}

	// =========================================================================
	// Convenience Shortcuts
	// =========================================================================

	/**
	 * Shortcut for observability logs helper.
	 * Equivalent to `chaos.services.observability.logs`.
	 *
	 * @throws Error if observability capability is not enabled
	 */
	get logs(): ServiceHelpers['observability']['logs'] {
		return this.services.observability.logs;
	}

	/**
	 * Shortcut for observability metrics helper.
	 * Equivalent to `chaos.services.observability.metrics`.
	 *
	 * @throws Error if observability capability is not enabled
	 */
	get metrics(): ServiceHelpers['observability']['metrics'] {
		return this.services.observability.metrics;
	}

	/**
	 * Shortcut for mailpit helper.
	 * Equivalent to `chaos.services.mailpit`.
	 *
	 * @deprecated Use `chaos.services.mailpit` instead for consistency
	 * @throws Error if email capability is not enabled
	 */
	get mail(): ServiceHelpers['mailpit'] {
		return this.services.mailpit;
	}

	// =========================================================================
	// Container Operations
	// =========================================================================

	/**
	 * Find containers by name pattern
	 */
	findContainers(namePattern: string | RegExp): StartedTestContainer[] {
		const regex = typeof namePattern === 'string' ? new RegExp(namePattern) : namePattern;
		return this._containers.filter((container) => regex.test(container.getName()));
	}

	/**
	 * Stop container by name pattern
	 */
	async stopContainer(namePattern: string | RegExp): Promise<StoppedTestContainer | null> {
		const container = this.findContainers(namePattern)[0];
		return container ? await container.stop() : null;
	}
}
