import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { Service, ServiceResult, StartContext } from './types';

export interface CloudflaredMeta {
	publicUrl: string;
	proxyHops: number;
}

export type CloudflaredResult = ServiceResult<CloudflaredMeta>;

const METRICS_PORT = 2000;

function getTunnelTarget(ctx: StartContext): string {
	if (ctx.needsLoadBalancer) {
		return `${ctx.projectName}-caddy-lb:80`;
	}
	return `${ctx.projectName}-n8n:5678`;
}

export const cloudflared: Service<CloudflaredResult> = {
	description: 'Cloudflare Tunnel',
	dependsOn: ['loadBalancer'],

	shouldStart: (ctx) => ctx.config.services?.includes('cloudflared') ?? false,

	getOptions(ctx) {
		const proxyHops = ctx.needsLoadBalancer ? 2 : 1;
		return { tunnelTarget: getTunnelTarget(ctx), proxyHops };
	},

	env(result) {
		return {
			WEBHOOK_URL: result.meta.publicUrl,
			N8N_PROXY_HOPS: String(result.meta.proxyHops),
		};
	},

	async start(network, projectName, config?: unknown): Promise<CloudflaredResult> {
		const { tunnelTarget, proxyHops } = config as { tunnelTarget: string; proxyHops: number };
		const { consumer, throwWithLogs } = createSilentLogConsumer();

		try {
			const container = await new GenericContainer(TEST_CONTAINER_IMAGES.cloudflared)
				.withNetwork(network)
				.withNetworkAliases('cloudflared')
				.withName(`${projectName}-cloudflared`)
				.withExposedPorts(METRICS_PORT)
				.withCommand([
					'tunnel',
					'--url',
					`http://${tunnelTarget}`,
					'--metrics',
					`0.0.0.0:${METRICS_PORT}`,
					'--no-autoupdate',
				])
				.withWaitStrategy(Wait.forHttp('/quicktunnel', METRICS_PORT).forStatusCode(200))
				.withLabels({
					'com.docker.compose.project': projectName,
					'com.docker.compose.service': 'cloudflared',
				})
				.withReuse()
				.withLogConsumer(consumer)
				.start();

			const hostPort = container.getMappedPort(METRICS_PORT);
			const response = await fetch(`http://${container.getHost()}:${hostPort}/quicktunnel`);
			const data = (await response.json()) as { hostname: string };
			const publicUrl = `https://${data.hostname}`;

			return {
				container,
				meta: { publicUrl, proxyHops },
			};
		} catch (error) {
			return throwWithLogs(error);
		}
	},
};
