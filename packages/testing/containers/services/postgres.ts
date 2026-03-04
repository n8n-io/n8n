import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedNetwork } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { PostgresProfile, Service, ServiceResult, StartContext } from './types';

const HOSTNAME = 'postgres';

export interface PostgresMeta {
	database: string;
	username: string;
	password: string;
}

export type PostgresResult = ServiceResult<PostgresMeta>;

const POSTGRES_PROFILES: Record<string, Record<string, string>> = {
	fast: {
		fsync: 'off',
		synchronous_commit: 'off',
		full_page_writes: 'off',
	},
	production: {
		fsync: 'on',
		synchronous_commit: 'on',
		full_page_writes: 'on',
		shared_buffers: '256MB',
		work_mem: '16MB',
		max_connections: '100',
	},
};

function resolvePostgresFlags(profile: PostgresProfile): Record<string, string> {
	if (typeof profile === 'string') {
		return POSTGRES_PROFILES[profile] ?? POSTGRES_PROFILES.fast;
	}
	return profile;
}

function buildCommand(flags: Record<string, string>): string[] {
	const args = ['postgres'];
	for (const [key, value] of Object.entries(flags)) {
		args.push('-c', `${key}=${value}`);
	}
	return args;
}

export interface PostgresConfig {
	profile: PostgresProfile;
}

export const postgres: Service<PostgresResult> = {
	description: 'PostgreSQL database',
	shouldStart: (ctx) => ctx.usePostgres,

	getOptions(ctx: StartContext): PostgresConfig {
		return { profile: ctx.config.postgresProfile ?? 'fast' };
	},

	async start(
		network: StartedNetwork,
		projectName: string,
		options?: unknown,
	): Promise<PostgresResult> {
		const { profile = 'fast' } = (options as PostgresConfig) ?? {};
		const flags = resolvePostgresFlags(profile);
		const useTmpFs = profile === 'fast';

		let builder = new PostgreSqlContainer(TEST_CONTAINER_IMAGES.postgres)
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
			.withCommand(buildCommand(flags))
			.withReuse();

		if (useTmpFs) {
			builder = builder.withTmpFs({ '/var/lib/postgresql': 'rw' });
		}

		const container = await builder.start();

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
