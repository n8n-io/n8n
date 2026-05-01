import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedNetwork, StartedTestContainer } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { HelperContext, Service, ServiceResult } from './types';

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
		const { consumer, throwWithLogs } = createSilentLogConsumer();
		const builder = new PostgreSqlContainer(TEST_CONTAINER_IMAGES.postgres)
			.withNetwork(network)
			.withNetworkAliases(HOSTNAME)
			.withDatabase('n8n_db')
			.withUsername('n8n_user')
			.withPassword('test_password')
			.withStartupTimeout(60000)
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
				'-c',
				'max_connections=200',
				// pg_stat_statements lets benchmarks attribute tx/s to specific queries
				// (n8n vs autovacuum vs postgres-exporter). Adds <1% overhead in normal use.
				'-c',
				'shared_preload_libraries=pg_stat_statements',
				'-c',
				'pg_stat_statements.track=all',
				'-c',
				'pg_stat_statements.max=10000',
			])
			.withReuse()
			.withLogConsumer(consumer);

		try {
			const container = await builder.start();

			// Create pg_stat_statements extension in the n8n database. shared_preload_libraries
			// loads the C library, but CREATE EXTENSION is what makes the view queryable.
			// Idempotent — safe across container reuse.
			await container.exec([
				'psql',
				'-U',
				container.getUsername(),
				'-d',
				container.getDatabase(),
				'-c',
				'CREATE EXTENSION IF NOT EXISTS pg_stat_statements;',
			]);

			return {
				container,
				meta: {
					database: container.getDatabase(),
					username: container.getUsername(),
					password: container.getPassword(),
				},
			};
		} catch (error: unknown) {
			return throwWithLogs(error);
		}
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

/**
 * Lets benchmarks introspect Postgres state during/after a run via `psql`
 * inside the container. Useful for `pg_stat_statements` query attribution,
 * autovacuum visibility, and active-connection breakdowns.
 */
export class PostgresHelper {
	constructor(
		private readonly container: StartedTestContainer,
		private readonly meta: PostgresMeta,
	) {}

	/** Run an arbitrary SQL statement and return the raw psql output. */
	async exec(sql: string): Promise<string> {
		const result = await this.container.exec([
			'psql',
			'-U',
			this.meta.username,
			'-d',
			this.meta.database,
			'-A', // unaligned output
			'-t', // tuples only (no headers)
			'-F',
			'\t', // tab-separated
			'-c',
			sql,
		]);
		return result.output;
	}

	/** Reset pg_stat_statements counters — call before measuring. */
	async resetStatStatements(): Promise<void> {
		await this.exec('SELECT pg_stat_statements_reset();');
	}

	/**
	 * Query the top N most-called statements since the last reset.
	 * Returns rows ordered by call count descending.
	 */
	async topStatements(
		limit = 15,
	): Promise<Array<{ calls: number; meanMs: number; totalMs: number; query: string }>> {
		const output = await this.exec(`
			SELECT calls, ROUND(mean_exec_time::numeric, 2), ROUND(total_exec_time::numeric, 2),
			       LEFT(REGEXP_REPLACE(query, '\\s+', ' ', 'g'), 120)
			FROM pg_stat_statements
			ORDER BY calls DESC
			LIMIT ${limit};
		`);
		return output
			.trim()
			.split('\n')
			.filter((line) => line.length > 0)
			.map((line) => {
				const [callsStr, meanStr, totalStr, ...queryParts] = line.split('\t');
				return {
					calls: parseInt(callsStr ?? '0', 10),
					meanMs: parseFloat(meanStr ?? '0'),
					totalMs: parseFloat(totalStr ?? '0'),
					query: queryParts.join('\t'),
				};
			});
	}
}

export function createPostgresHelper(ctx: HelperContext): PostgresHelper {
	const result = ctx.serviceResults.postgres as PostgresResult | undefined;
	if (!result) {
		throw new Error('Postgres service not found in context');
	}
	return new PostgresHelper(result.container, result.meta);
}

declare module './types' {
	interface ServiceHelpers {
		postgres: PostgresHelper;
	}
}
