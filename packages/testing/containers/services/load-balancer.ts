import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { Service, ServiceResult } from './types';

export interface LoadBalancerConfig {
	mainCount: number;
	hostPort?: number;
}

export interface LoadBalancerMeta {
	hostPort: number;
	baseUrl: string;
}

export type LoadBalancerResult = ServiceResult<LoadBalancerMeta>;

function buildCaddyConfig(upstreamServers: string[]): string {
	const backends = upstreamServers.join(' ');
	return `
:80 {
  # Reverse proxy with load balancing
  reverse_proxy ${backends} {
    # Use first available backend for simpler debugging
    lb_policy first

    # Health check
    health_uri /healthz
    health_interval 10s

    # Timeouts
    transport http {
      dial_timeout 60s
      read_timeout 60s
      write_timeout 60s
    }
  }

  # Set max request body size
  request_body {
    max_size 50MB
  }
}`;
}

export const loadBalancer: Service<LoadBalancerResult> = {
	description: 'Caddy load balancer',
	shouldStart: (ctx) => ctx.needsLoadBalancer,

	getOptions(ctx) {
		return {
			mainCount: ctx.mains,
			hostPort: ctx.allocatedPorts.loadBalancer,
		} as LoadBalancerConfig;
	},

	env(result) {
		return {
			WEBHOOK_URL: result.meta.baseUrl,
			N8N_PROXY_HOPS: '1',
		};
	},

	async start(network, projectName, config?: unknown): Promise<LoadBalancerResult> {
		const { mainCount, hostPort } = config as LoadBalancerConfig;
		const { consumer, throwWithLogs } = createSilentLogConsumer();

		// Generate upstream server addresses
		const upstreamServers = Array.from(
			{ length: mainCount },
			(_, index) => `${projectName}-n8n-main-${index + 1}:5678`,
		);

		const caddyConfig = buildCaddyConfig(upstreamServers);

		try {
			const container = await new GenericContainer(TEST_CONTAINER_IMAGES.caddy)
				.withNetwork(network)
				.withExposedPorts(hostPort ? { container: 80, host: hostPort } : 80)
				.withCopyContentToContainer([{ content: caddyConfig, target: '/etc/caddy/Caddyfile' }])
				.withWaitStrategy(Wait.forListeningPorts())
				.withLabels({
					'com.docker.compose.project': projectName,
					'com.docker.compose.service': 'caddy-lb',
				})
				.withName(`${projectName}-caddy-lb`)
				.withReuse()
				.withLogConsumer(consumer)
				.start();

			const actualHostPort = container.getMappedPort(80);

			return {
				container,
				meta: {
					hostPort: actualHostPort,
					baseUrl: `http://localhost:${actualHostPort}`,
				},
			};
		} catch (error) {
			return throwWithLogs(error);
		}
	},
};
