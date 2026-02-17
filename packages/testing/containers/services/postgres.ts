import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedNetwork } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { Service, ServiceResult } from './types';

const HOSTNAME = 'postgres';

export interface PostgresMeta {
	database: string;
	username: string;
	password: string;
}

export type PostgresResult = ServiceResult<PostgresMeta>;

export const postgres: Service<PostgresResult> = {
	description: 'PostgreSQL database',
	shouldStart: (ctx) => ctx.usePostgres,

	async start(network: StartedNetwork, projectName: string): Promise<PostgresResult> {
		const container = await new PostgreSqlContainer(TEST_CONTAINER_IMAGES.postgres)
			.withNetwork(network)
			.withNetworkAliases(HOSTNAME)
			.withDatabase('n8n_db')
			.withUsername('n8n_user')
			.withPassword('test_password')
			.withStartupTimeout(30000)
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': HOSTNAME,
			})
			.withName(`${projectName}-${HOSTNAME}`)
			.withAddedCapabilities('NET_ADMIN') // Allows us to drop IP tables and block traffic
			.withTmpFs({ '/var/lib/postgresql': 'rw' })
			.withCommand([
				'postgres',
				'-c',
				'fsync=off',
				'-c',
				'synchronous_commit=off',
				'-c',
				'full_page_writes=off',
			])
			.withReuse()
			.start();

		return {
			container,
			meta: {
				database: container.getDatabase(),
				username: container.getUsername(),
				password: container.getPassword(),
			},
		};
	},

	env(result: PostgresResult, external?: boolean): Record<string, string> {
		return {
			DB_TYPE: 'postgresdb',
			DB_POSTGRESDB_HOST: external ? result.container.getHost() : HOSTNAME,
			DB_POSTGRESDB_PORT: external ? String(result.container.getMappedPort(5432)) : '5432',
			DB_POSTGRESDB_DATABASE: result.meta.database,
			DB_POSTGRESDB_USER: result.meta.username,
			DB_POSTGRESDB_PASSWORD: result.meta.password,
		};
	},
};
