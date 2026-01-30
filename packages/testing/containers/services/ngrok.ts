import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { Service, ServiceResult, StartContext } from './types';

export interface NgrokMeta {
	publicUrl: string;
	proxyHops: number;
}

export type NgrokResult = ServiceResult<NgrokMeta>;

const API_PORT = 4040;

function getTunnelTarget(ctx: StartContext): string {
	if (ctx.needsLoadBalancer) {
		return `${ctx.projectName}-caddy-lb:80`;
	}
	return `${ctx.projectName}-n8n:5678`;
}

export const ngrok: Service<NgrokResult> = {
	description: 'ngrok Tunnel',
	dependsOn: ['loadBalancer'],

	shouldStart: (ctx) => ctx.config.services?.includes('ngrok') ?? false,

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

	async start(network, projectName, config?: unknown): Promise<NgrokResult> {
		const { tunnelTarget, proxyHops } = config as { tunnelTarget: string; proxyHops: number };
		const { consumer, throwWithLogs } = createSilentLogConsumer();

		const authToken = process.env.NGROK_AUTHTOKEN;
		if (!authToken) {
			throw new Error(
				'NGROK_AUTHTOKEN environment variable is required. ' +
					'Get a free token at https://dashboard.ngrok.com/get-started/your-authtoken',
			);
		}

		try {
			const container = await new GenericContainer(TEST_CONTAINER_IMAGES.ngrok)
				.withNetwork(network)
				.withNetworkAliases('ngrok')
				.withName(`${projectName}-ngrok`)
				.withExposedPorts(API_PORT)
				.withEnvironment({
					NGROK_AUTHTOKEN: authToken,
				})
				.withCommand(['http', `http://${tunnelTarget}`, '--log', 'stdout'])
				.withWaitStrategy(Wait.forLogMessage(/started tunnel/i))
				.withLabels({
					'com.docker.compose.project': projectName,
					'com.docker.compose.service': 'ngrok',
				})
				.withReuse()
				.withLogConsumer(consumer)
				.start();

			const hostPort = container.getMappedPort(API_PORT);
			const host = container.getHost();

			// ngrok API returns tunnel info at /api/tunnels
			const response = await fetch(`http://${host}:${hostPort}/api/tunnels`);
			const data = (await response.json()) as {
				tunnels: Array<{ public_url: string; proto: string }>;
			};

			// Find the https tunnel
			const httpsTunnel = data.tunnels.find((t) => t.proto === 'https');
			const publicUrl = httpsTunnel?.public_url ?? data.tunnels[0]?.public_url;

			if (!publicUrl) {
				throw new Error('Failed to get ngrok public URL from API');
			}

			return {
				container,
				meta: { publicUrl, proxyHops },
			};
		} catch (error) {
			return throwWithLogs(error);
		}
	},
};
