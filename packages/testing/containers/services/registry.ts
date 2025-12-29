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

export const helperFactories: Partial<HelperFactories> = {
	mailpit: createMailpitHelper,
	gitea: createGiteaHelper,
	keycloak: createKeycloakHelper,
	observability: createObservabilityHelper,
	tracing: createTracingHelper,
};
