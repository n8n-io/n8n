import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { LoadBalancerPolicy, Service, ServiceResult } from './types';

export interface LoadBalancerConfig {
	mainCount: number;
	/** When > 0, Caddy path-routes `WEBHOOK_PROC_PATHS` to webhook procs. */
	webhookCount: number;
	hostPort?: number;
	policy: LoadBalancerPolicy;
	pathPrefix?: string;
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

// NOTE: Caddy silently drops request headers whose NAME contains an underscore
// (verified against caddy:2). Tests running through this LB must not generate
// header names with '_' — beware nanoid(), whose default alphabet includes it.
function buildCaddyConfig(
	mainUpstreams: string[],
	webhookUpstreams: string[],
	policy: LoadBalancerPolicy,
	pathPrefix?: string,
): string {
	const indent = (block: string) => block.replace(/^.+/gm, '  $&');
	const reverseProxy = (upstreams: string[]) => `reverse_proxy ${upstreams.join(' ')} {
  lb_policy ${policy}

  # Health check
  health_uri /healthz
  health_interval 500ms

  # Timeouts
  transport http {
    dial_timeout 60s
    read_timeout 60s
    write_timeout 60s
  }
}`;

	const mainProxy = reverseProxy(mainUpstreams);
	let routes = mainProxy;
	if (webhookUpstreams.length > 0) {
		routes = `@webhooks path ${WEBHOOK_PROC_PATHS.join(' ')}
handle @webhooks {
${indent(reverseProxy(webhookUpstreams))}
}

handle {
${indent(mainProxy)}
}`;
	}

	if (pathPrefix) {
		// n8n uses N8N_PATH for public URLs but serves its routes at the root.
		routes = `handle_path ${pathPrefix}* {
${indent(routes)}
}

handle {
  respond 404
}`;
	}

	return `
:80 {
  request_body {
    max_size 50MB
  }

${indent(routes)}
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
			pathPrefix: ctx.config.pathPrefix,
		};
	},

	env(result) {
		return {
			WEBHOOK_URL: result.meta.baseUrl,
			N8N_PROXY_HOPS: '1',
		};
	},

	async start(network, projectName, config?: unknown): Promise<LoadBalancerResult> {
		const { mainCount, webhookCount, hostPort, policy, pathPrefix } = config as LoadBalancerConfig;
		const { consumer, throwWithLogs } = createSilentLogConsumer();

		// Single-main containers are named `${projectName}-n8n`, not `-n8n-main-1`.
		const mainHostname = (index: number): string =>
			mainCount > 1 ? `${projectName}-n8n-main-${index}:5678` : `${projectName}-n8n:5678`;
		const mainUpstreams = Array.from({ length: mainCount }, (_, index) => mainHostname(index + 1));
		const webhookUpstreams = Array.from(
			{ length: webhookCount },
			(_, index) => `${projectName}-n8n-webhook-${index + 1}:5678`,
		);

		const caddyConfig = buildCaddyConfig(mainUpstreams, webhookUpstreams, policy, pathPrefix);

		try {
			const container = await new GenericContainer(TEST_CONTAINER_IMAGES.caddy)
				.withNetwork(network)
				.withExposedPorts(hostPort ? { container: 80, host: hostPort } : 80)
				.withCopyContentToContainer([{ content: caddyConfig, target: '/etc/caddy/Caddyfile' }])
				.withWaitStrategy(Wait.forListeningPorts())
				.withLabels({
					'com.docker.compose.project': projectName,
					'com.docker.compose.service': 'caddy-lb',
					// Testcontainers does not hash copied files for reuse.
					...(pathPrefix ? { 'n8n.path-prefix': pathPrefix } : {}),
				})
				.withName(`${projectName}-caddy-lb`)
				.withReuse()
				.withLogConsumer(consumer)
				.start();

			const actualHostPort = container.getMappedPort(80);
			// Use the runtime host when prefixed so remote runners can reach baseUrl; keep localhost by default.
			const host = pathPrefix ? container.getHost() : 'localhost';

			return {
				container,
				meta: {
					hostPort: actualHostPort,
					baseUrl: `http://${host}:${actualHostPort}${pathPrefix ?? ''}`,
				},
			};
		} catch (error) {
			return throwWithLogs(error);
		}
	},
};
