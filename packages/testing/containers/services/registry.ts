import { cloudflared } from './cloudflared';
import { gitea, createGiteaHelper } from './gitea';
import { kafka, createKafkaHelper } from './kafka';
import { keycloak, createKeycloakHelper } from './keycloak';
import { loadBalancer } from './load-balancer';
import { mailpit, createMailpitHelper } from './mailpit';
import { createObservabilityHelper } from './observability';
import { postgres } from './postgres';
import { proxy } from './proxy';
import { redis } from './redis';
import { taskRunner } from './task-runner';
import { tracing, createTracingHelper } from './tracing';
import type { Service, ServiceName, ServiceResult, HelperFactories } from './types';
import { vector } from './vector';
import { victoriaLogs } from './victoria-logs';
import { victoriaMetrics } from './victoria-metrics';

/** Service registry - must include all ServiceName entries */
export const services: Record<ServiceName, Service<ServiceResult>> = {
	postgres,
	redis,
	mailpit,
	gitea,
	keycloak,
	victoriaLogs,
	victoriaMetrics,
	vector,
	tracing,
	proxy,
	taskRunner,
	loadBalancer,
	cloudflared,
	kafka,
};

export const helperFactories: Partial<HelperFactories> = {
	mailpit: createMailpitHelper,
	gitea: createGiteaHelper,
	keycloak: createKeycloakHelper,
	observability: createObservabilityHelper,
	tracing: createTracingHelper,
	kafka: createKafkaHelper,
};
