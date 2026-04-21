import { RedisContainer } from '@testcontainers/redis';
import type { StartedNetwork } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { Service, ServiceResult } from './types';

const HOSTNAME = 'redis';

export interface RedisMeta {
	host: string;
	port: number;
}

export type RedisResult = ServiceResult<RedisMeta>;

export const redis: Service<RedisResult> = {
	description: 'Redis',
	shouldStart: (ctx) => ctx.isQueueMode,

	async start(network: StartedNetwork, projectName: string): Promise<RedisResult> {
		const container = await new RedisContainer(TEST_CONTAINER_IMAGES.redis)
			.withNetwork(network)
			.withNetworkAliases(HOSTNAME)
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': HOSTNAME,
			})
			.withName(`${projectName}-${HOSTNAME}`)
			.withReuse()
			.start();

		return {
			container,
			meta: {
				host: HOSTNAME,
				port: 6379,
			},
		};
	},

	env(result: RedisResult, external?: boolean): Record<string, string> {
		const host = external ? result.container.getHost() : HOSTNAME;
		const port = external ? String(result.container.getMappedPort(6379)) : '6379';
		return {
			// In container mode, EXECUTIONS_MODE is set by the stack based on worker count.
			// In external/local mode, redis implies the user wants queue mode.
			...(external ? { EXECUTIONS_MODE: 'queue' } : {}),
			QUEUE_BULL_REDIS_HOST: host,
			QUEUE_BULL_REDIS_PORT: port,
			N8N_CACHE_ENABLED: 'true',
			N8N_CACHE_BACKEND: 'redis',
			N8N_CACHE_REDIS_HOST: host,
			N8N_CACHE_REDIS_PORT: port,
		};
	},
};
