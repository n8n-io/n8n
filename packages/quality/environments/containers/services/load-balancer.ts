import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { LoadBalancerPolicy, Service, ServiceResult } from './types';

export interface LoadBalancerConfig {
	mainCount: number;
	/** When > 0, Caddy path-routes `WEBHOOK_PROC_PATHS` to webhook procs. */
	webhookCount: number;
	/** Also route the public agent paths to webhook procs. They serve them only in agent queue mode. */
	agentIngress: boolean;
	/** Hostname from `N8N_APPS_BASE_URL`. With agent ingress, its subdomains (app hosts) go to webhook procs. */
	appsHost?: string;
	hostPort?: number;
	policy: LoadBalancerPolicy;
}

export interface LoadBalancerMeta {
	hostPort: number;
	baseUrl: string;
}

export type LoadBalancerResult = ServiceResult<LoadBalancerMeta>;

// Production paths the `n8n webhook` proc serves. Test/waiting/form-test paths
// stay on main, per `packages/cli/src/commands/webhook.ts`. `/chat` is the chat
// widget's WebSocket endpoint: the widget always connects to the origin that
// served the chat webhook, so it must route to the webhook procs too — same as
// production setups where WEBHOOK_URL points at the dedicated webhook server.
const WEBHOOK_PROC_PATHS = ['/webhook/*', '/form/*', '/chat'] as const;
// Public agent routes: the Responses API and chat platform webhooks.
const AGENT_INGRESS_PATHS = ['/agent-webhook/*', '/agent-hook/*'] as const;

// NOTE: Caddy silently drops request headers whose NAME contains an underscore
// (verified against caddy:2). Tests running through this LB must not generate
// header names with '_' — beware nanoid(), whose default alphabet includes it.
function buildCaddyConfig(
	mainUpstreams: string[],
	webhookUpstreams: string[],
	policy: LoadBalancerPolicy,
	agentIngress: boolean,
	appsHost?: string,
): string {
	const mainBackends = mainUpstreams.join(' ');
	const webhookBackends = webhookUpstreams.join(' ');

	const sharedReverseProxyBlock = `    lb_policy ${policy}

    # Health check
    health_uri /healthz
    health_interval 500ms

    # Timeouts. Agent turns that do not stream answer only at the end, which can take minutes under load.
    transport http {
      dial_timeout 60s
      read_timeout 300s
      write_timeout 300s
    }`;

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

	const webhookMatcher = [...WEBHOOK_PROC_PATHS, ...(agentIngress ? AGENT_INGRESS_PATHS : [])].join(
		' ',
	);
	const appHostBlock =
		agentIngress && appsHost
			? `
  @appHosts host *.${appsHost}
  handle @appHosts {
    reverse_proxy ${webhookBackends} {
${sharedReverseProxyBlock}
    }
  }
`
			: '';
	return `
:80 {
  request_body {
    max_size 50MB
  }
${appHostBlock}
  @webhooks path ${webhookMatcher}
  handle @webhooks {
    reverse_proxy ${webhookBackends} {
${sharedReverseProxyBlock}
    }
  }

  handle {
    reverse_proxy ${mainBackends} {
${sharedReverseProxyBlock}
    }
  }
}`;
}

function appsHostname(appsBaseUrl: string | undefined): string | undefined {
	if (!appsBaseUrl) return undefined;
	try {
		return new URL(appsBaseUrl).hostname;
	} catch {
		return undefined;
	}
}

export const loadBalancer: Service<LoadBalancerResult> = {
	description: 'Caddy load balancer',
	shouldStart: (ctx) => ctx.needsLoadBalancer,

	getOptions(ctx) {
		return {
			mainCount: ctx.mains,
			webhookCount: ctx.webhooks,
			agentIngress: ctx.config.env?.N8N_AGENTS_QUEUE_MODE_ENABLED === 'true',
			appsHost: appsHostname(ctx.config.env?.N8N_APPS_BASE_URL),
			hostPort: ctx.allocatedPorts.loadBalancer,
			policy: ctx.config.lbPolicy ?? 'first',
		};
	},

	env(result) {
		return {
			WEBHOOK_URL: result.meta.baseUrl,
			N8N_PROXY_HOPS: '1',
		};
	},

	async start(network, projectName, config?: unknown): Promise<LoadBalancerResult> {
		const { mainCount, webhookCount, agentIngress, appsHost, hostPort, policy } =
			config as LoadBalancerConfig;
		const { consumer, throwWithLogs } = createSilentLogConsumer();

		// Single-main containers are named `${projectName}-n8n`, not `-n8n-main-1`.
		const mainHostname = (index: number): string =>
			mainCount > 1 ? `${projectName}-n8n-main-${index}:5678` : `${projectName}-n8n:5678`;
		const mainUpstreams = Array.from({ length: mainCount }, (_, index) => mainHostname(index + 1));
		const webhookUpstreams = Array.from(
			{ length: webhookCount },
			(_, index) => `${projectName}-n8n-webhook-${index + 1}:5678`,
		);

		const caddyConfig = buildCaddyConfig(
			mainUpstreams,
			webhookUpstreams,
			policy,
			agentIngress,
			appsHost,
		);

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
