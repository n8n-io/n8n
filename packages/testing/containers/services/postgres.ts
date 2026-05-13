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
				'-c',
				'shared_preload_libraries=pg_stat_statements',
				'-c',
				'pg_stat_statements.track=all',
				'-c',
				'pg_stat_statements.max=10000',
				// Track plan time so query CPU includes planner overhead (often >50%
				// for TypeORM's parameterized-but-not-prepared statements).
				'-c',
				'pg_stat_statements.track_planning=on',
				'-c',
				'track_io_timing=on',
			])
			.withReuse()
			.withLogConsumer(consumer);

		try {
			const container = await builder.start();

			// shared_preload_libraries loads the C library; CREATE EXTENSION makes
			// the view queryable. Idempotent — safe across container reuse.
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

/** Runs introspection SQL via `psql` inside the container. */
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

	/** Top N statements ordered by call count descending. */
	async topStatements(limit = 15): Promise<
		Array<{
			calls: number;
			meanMs: number;
			totalExecMs: number;
			totalPlanMs: number;
			totalMs: number;
			query: string;
		}>
	> {
		const output = await this.exec(`
			SELECT calls,
			       ROUND(mean_exec_time::numeric, 2),
			       ROUND(total_exec_time::numeric, 2),
			       ROUND(COALESCE(total_plan_time, 0)::numeric, 2),
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
				const [callsStr, meanStr, execStr, planStr, ...queryParts] = line.split('\t');
				const totalExecMs = parseFloat(execStr ?? '0');
				const totalPlanMs = parseFloat(planStr ?? '0');
				return {
					calls: parseInt(callsStr ?? '0', 10),
					meanMs: parseFloat(meanStr ?? '0'),
					totalExecMs,
					totalPlanMs,
					totalMs: totalExecMs + totalPlanMs,
					query: queryParts.join('\t'),
				};
			});
	}

	/** Plan + exec time summed across ALL statements since the last reset. */
	async totalStatementsCost(): Promise<{
		totalCalls: number;
		totalExecMs: number;
		totalPlanMs: number;
		statementCount: number;
	}> {
		const output = await this.exec(`
			SELECT COALESCE(SUM(calls), 0)::bigint,
			       ROUND(COALESCE(SUM(total_exec_time), 0)::numeric, 2),
			       ROUND(COALESCE(SUM(total_plan_time), 0)::numeric, 2),
			       COUNT(*)::bigint
			FROM pg_stat_statements;
		`);
		const [callsStr, execStr, planStr, countStr] = output.trim().split('\n')[0]?.split('\t') ?? [];
		return {
			totalCalls: parseInt(callsStr ?? '0', 10),
			totalExecMs: parseFloat(execStr ?? '0'),
			totalPlanMs: parseFloat(planStr ?? '0'),
			statementCount: parseInt(countStr ?? '0', 10),
		};
	}

	/** Cumulative `pg_stat_wal` counters (PG 14+). Caller computes deltas. */
	async pgStatWal(): Promise<{ walRecords: number; walBytes: number; walFpi: number } | null> {
		try {
			const output = await this.exec(`
				SELECT COALESCE(wal_records, 0)::bigint,
				       COALESCE(wal_bytes, 0)::bigint,
				       COALESCE(wal_fpi, 0)::bigint
				FROM pg_stat_wal;
			`);
			const [recordsStr, bytesStr, fpiStr] = output.trim().split('\n')[0]?.split('\t') ?? [];
			return {
				walRecords: parseInt(recordsStr ?? '0', 10),
				walBytes: parseInt(bytesStr ?? '0', 10),
				walFpi: parseInt(fpiStr ?? '0', 10),
			};
		} catch {
			return null;
		}
	}

	/** `pg_stat_io` aggregated by backend type (PG 16+; empty on older). */
	async pgStatIo(): Promise<
		Array<{ backendType: string; reads: number; writes: number; extends: number }>
	> {
		try {
			const output = await this.exec(`
				SELECT backend_type,
				       COALESCE(SUM(reads), 0)::bigint,
				       COALESCE(SUM(writes), 0)::bigint,
				       COALESCE(SUM(extends), 0)::bigint
				FROM pg_stat_io
				GROUP BY backend_type
				ORDER BY backend_type;
			`);
			return output
				.trim()
				.split('\n')
				.filter((line) => line.length > 0)
				.map((line) => {
					const [backendType, readsStr, writesStr, extendsStr] = line.split('\t');
					return {
						backendType: backendType ?? 'unknown',
						reads: parseInt(readsStr ?? '0', 10),
						writes: parseInt(writesStr ?? '0', 10),
						extends: parseInt(extendsStr ?? '0', 10),
					};
				});
		} catch {
			// PG < 16 doesn't have pg_stat_io. Caller can fall back to bgwriter / database stats.
			return [];
		}
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
