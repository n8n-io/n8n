import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedNetwork } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import { ENGINE_DATABASE } from './engine';
import { PostgresHelper, type PostgresResult } from './postgres';
import type { HelperContext, Service, StartContext } from './types';

const HOSTNAME = 'engine-postgres';
const USERNAME = 'engine_user';
const PASSWORD = 'engine_test_password';

export const enginePostgres: Service<PostgresResult> = {
	description: 'Engine PostgreSQL database',
	shouldStart: (ctx) => ctx.config.engine === 'container',

	async start(
		network: StartedNetwork,
		projectName: string,
		_options?: unknown,
		ctx?: StartContext,
	) {
		const { consumer, throwWithLogs } = createSilentLogConsumer();
		try {
			const container = await new PostgreSqlContainer(TEST_CONTAINER_IMAGES.postgres)
				.withNetwork(network)
				.withNetworkAliases(HOSTNAME)
				.withDatabase(ENGINE_DATABASE)
				.withUsername(USERNAME)
				.withPassword(PASSWORD)
				.withStartupTimeout(60000)
				.withLabels({
					'com.docker.compose.project': projectName,
					'com.docker.compose.service': HOSTNAME,
				})
				.withName(`${projectName}-${HOSTNAME}`)
				.withTmpFs({ '/var/lib/postgresql': 'rw' })
				.withCommand([
					'postgres',
					'-c',
					'fsync=off',
					'-c',
					'synchronous_commit=off',
					'-c',
					'full_page_writes=off',
					'-c',
					'max_connections=200',
					'-c',
					'shared_preload_libraries=pg_stat_statements',
					'-c',
					'pg_stat_statements.track=all',
					'-c',
					'pg_stat_statements.track_planning=on',
					'-c',
					'track_io_timing=on',
				])
				.withReuse()
				.withLogConsumer(consumer)
				.start();
			ctx?.registerContainer?.(container);
			await container.exec([
				'psql',
				'-U',
				USERNAME,
				'-d',
				ENGINE_DATABASE,
				'-c',
				'CREATE EXTENSION IF NOT EXISTS pg_stat_statements;',
			]);
			return {
				container,
				meta: { database: ENGINE_DATABASE, username: USERNAME, password: PASSWORD },
			};
		} catch (error: unknown) {
			return throwWithLogs(error);
		}
	},

	env(result: PostgresResult, external?: boolean) {
		const host = external ? result.container.getHost() : HOSTNAME;
		const port = external ? result.container.getMappedPort(5432) : 5432;
		return {
			N8N_ENGINE_DATABASE_URL: `postgres://${USERNAME}:${PASSWORD}@${host}:${port}/${ENGINE_DATABASE}`,
		};
	},
};

export function createEnginePostgresHelper(ctx: HelperContext): PostgresHelper | undefined {
	const result = ctx.serviceResults.enginePostgres as PostgresResult | undefined;
	if (!result) return undefined;
	return new PostgresHelper(result.container, result.meta);
}

declare module './types' {
	interface ServiceHelpers {
		enginePostgres?: PostgresHelper;
	}
}
