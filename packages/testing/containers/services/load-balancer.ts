import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { LoadBalancerPolicy, Service, ServiceResult } from './types';

export interface LoadBalancerConfig {
	mainCount: number;
	/**
	 * Number of dedicated `n8n webhook` upstreams. When > 0, Caddy adds a path
	 * matcher that routes `/webhook/*` and `/form/*` to webhook procs;
	 * `/webhook-test/*`, `/webhook-waiting/*`, `/form-test/*`, and everything
	 * else continue to flow to mains. When 0, Caddy runs in single-pool mode.
	 */
	webhookCount: number;
	hostPort?: number;
	policy: LoadBalancerPolicy;
}

export interface LoadBalancerMeta {
	hostPort: number;
	baseUrl: string;
}

export type LoadBalancerResult = ServiceResult<LoadBalancerMeta>;

/**
 * Production webhook paths that `n8n webhook` intercepts. Test-mode paths
 * (`/webhook-test/*`, `/form-test/*`) and waiting webhooks (`/webhook-waiting/*`)
 * are explicitly *not* in this list — they're handled by main, per the n8n
 * webhook command contract (`packages/cli/src/commands/webhook.ts`).
 */
const WEBHOOK_PROC_PATHS = ['/webhook/*', '/form/*'] as const;

function buildCaddyConfig(
	mainUpstreams: string[],
	webhookUpstreams: string[],
	policy: LoadBalancerPolicy,
): string {
	const mainBackends = mainUpstreams.join(' ');
	const webhookBackends = webhookUpstreams.join(' ');

	const sharedReverseProxyBlock = `    lb_policy ${policy}

    # Health check
    health_uri /healthz
    health_interval 10s

    # Timeouts
    transport http {
      dial_timeout 60s
      read_timeout 60s
      write_timeout 60s
    }`;

	// Single-pool fallback for stacks without dedicated webhook procs —
	// preserves the historical behaviour exactly (all paths to mains).
	if (webhookUpstreams.length === 0) {
		return `
:80 {
  # Reverse proxy with load balancing
  reverse_proxy ${mainBackends} {
${sharedReverseProxyBlock}
  }

  # Set max request body size
  request_body {
    max_size 50MB
  }
}`;
	}

	// Two-pool routing: production webhook + form paths to webhook procs,
	// everything else (UI, REST, test/waiting webhook paths) to mains.
	const webhookMatcher = WEBHOOK_PROC_PATHS.join(' ');
	return `
:80 {
  request_body {
    max_size 50MB
  }

  # Production webhook + form paths → dedicated webhook procs
  @webhooks path ${webhookMatcher}
  handle @webhooks {
    reverse_proxy ${webhookBackends} {
${sharedReverseProxyBlock}
    }
  }

  # Everything else (UI, REST, /webhook-test/*, /webhook-waiting/*, /form-test/*, /healthz/*) → mains
  handle {
    reverse_proxy ${mainBackends} {
${sharedReverseProxyBlock}
    }
  }
}`;
}

export const loadBalancer: Service<LoadBalancerResult> = {
	description: 'Caddy load balancer',
	shouldStart: (ctx) => ctx.needsLoadBalancer,

	getOptions(ctx) {
		return {
			mainCount: ctx.mains,
			webhookCount: ctx.webhooks,
			hostPort: ctx.allocatedPorts.loadBalancer,
			policy: ctx.config.lbPolicy ?? 'first',
		} as LoadBalancerConfig;
	},

	env(result) {
		return {
			WEBHOOK_URL: result.meta.baseUrl,
			N8N_PROXY_HOPS: '1',
		};
	},

	async start(network, projectName, config?: unknown): Promise<LoadBalancerResult> {
		const { mainCount, webhookCount, hostPort, policy } = config as LoadBalancerConfig;
		const { consumer, throwWithLogs } = createSilentLogConsumer();

		// Generate upstream server addresses. When mains === 1 (single-main, but
		// webhooks > 0 triggered the LB), the single main container is named
		// `${projectName}-n8n` rather than `${projectName}-n8n-main-1`.
		const mainHostname = (index: number): string =>
			mainCount > 1 ? `${projectName}-n8n-main-${index}:5678` : `${projectName}-n8n:5678`;
		const mainUpstreams = Array.from({ length: mainCount }, (_, index) => mainHostname(index + 1));
		const webhookUpstreams = Array.from(
			{ length: webhookCount },
			(_, index) => `${projectName}-n8n-webhook-${index + 1}:5678`,
		);

		const caddyConfig = buildCaddyConfig(mainUpstreams, webhookUpstreams, policy);

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
