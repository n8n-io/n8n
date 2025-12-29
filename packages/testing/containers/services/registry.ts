/**
 * Service Registry
 *
 * Central registry of all available services and their helper factories.
 * Each service is explicitly imported to ensure type safety and easy debugging.
 */

// Import all services
import { gitea, createGiteaHelper } from './gitea';
import { keycloak, createKeycloakHelper } from './keycloak';
import { loadBalancer } from './load-balancer';
import { mailpit, createMailpitHelper } from './mailpit';
import { observability, createObservabilityHelper } from './observability';
import { postgres } from './postgres';
import { proxy } from './proxy';
import { redis } from './redis';
import { taskRunner } from './task-runner';
import { tracing, createTracingHelper } from './tracing';
import type { Service, ServiceResult, HelperFactories } from './types';

/**
 * Registry of all available services.
 * Add new services here when they are created.
 */
export const services: Record<string, Service<ServiceResult>> = {
	postgres,
	redis,
	mailpit,
	gitea,
	keycloak,
	observability,
	tracing,
	proxy,
	taskRunner,
	loadBalancer,
};

/**
 * Registry of helper factories for services that have helpers.
 * These are used to create helper instances from the HelperContext.
 */
export const helperFactories: Partial<HelperFactories> = {
	mailpit: createMailpitHelper,
	gitea: createGiteaHelper,
	keycloak: createKeycloakHelper,
	observability: createObservabilityHelper,
	tracing: createTracingHelper,
};

// Re-export all services for direct import
export { postgres } from './postgres';
export { redis } from './redis';
export { mailpit, MailpitHelper, createMailpitHelper } from './mailpit';
export { gitea, GiteaHelper, createGiteaHelper } from './gitea';
export { keycloak, KeycloakHelper, createKeycloakHelper } from './keycloak';
export { observability, ObservabilityHelper, createObservabilityHelper } from './observability';
export { tracing, TracingHelper, createTracingHelper } from './tracing';
export { proxy } from './proxy';
export { taskRunner } from './task-runner';
export { loadBalancer } from './load-balancer';

// Re-export types
export type {
	Service,
	ServiceResult,
	ServiceHelpers,
	HelperContext,
	HelperFactory,
	HelperFactories,
} from './types';
