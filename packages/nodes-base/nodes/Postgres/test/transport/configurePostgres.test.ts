import type { IExecuteFunctions } from 'n8n-workflow';
import pgPromise from 'pg-promise';
import { mock } from 'vitest-mock-extended';

import { configurePostgres } from '../../transport';
import type { PostgresNodeCredentials } from '../../v2/helpers/interfaces';

// Skip the singleton pool manager: it registers a process listener and an interval.
vi.mock('@utils/connection-pool-manager', () => ({
	ConnectionPoolManager: {
		getInstance: () => ({
			getConnection: async ({
				fallBackHandler,
			}: {
				fallBackHandler: (abortController: AbortController) => Promise<unknown>;
			}) => await fallBackHandler(new AbortController()),
		}),
	},
}));

const credentials = {
	host: 'localhost',
	port: 5432,
	database: 'db',
	user: 'user',
	password: 'password',
	maxConnections: 1,
	allowUnauthorizedCerts: false,
	ssl: 'disable',
} as PostgresNodeCredentials;

const TIMESTAMPTZ_VALUE = '2026-10-21 06:33:06.148+00';
const DATE_VALUE = '2026-10-21';

describe('configurePostgres type parsers', () => {
	const context = mock<IExecuteFunctions>();
	// `pg` is a process-wide singleton, so this is the same state n8n's own DB connections read
	const { builtins, getTypeParser } = pgPromise({ noWarnings: true }).pg.types;
	const readGlobalParser = (oid: number) => getTypeParser(oid, 'text');

	type Pool = {
		ended: boolean;
		end: () => Promise<void>;
		options: {
			types?: {
				getTypeParser: (oid: number, format?: 'text' | 'binary') => (v: string) => unknown;
			};
		};
	};
	const pools: Pool[] = [];

	const configure = async (nodeVersion?: number) => {
		const { db } = await configurePostgres.call(context, { ...credentials }, { nodeVersion });
		const pool = db.$pool as unknown as Pool;
		pools.push(pool);
		return pool;
	};

	afterEach(async () => {
		for (const pool of pools.splice(0)) {
			if (!pool.ended) await pool.end();
		}
	});

	describe.each([2.1, 2.3, 2.6])('node version %s', (nodeVersion) => {
		it('should not change the global TIMESTAMP and TIMESTAMPTZ parsers', async () => {
			const timestamp = readGlobalParser(builtins.TIMESTAMP);
			const timestamptz = readGlobalParser(builtins.TIMESTAMPTZ);

			await configure(nodeVersion);

			expect(readGlobalParser(builtins.TIMESTAMP)).toBe(timestamp);
			expect(readGlobalParser(builtins.TIMESTAMPTZ)).toBe(timestamptz);
			// n8n's own DB connections rely on live Date objects
			expect(readGlobalParser(builtins.TIMESTAMPTZ)(TIMESTAMPTZ_VALUE)).toBeInstanceOf(Date);
		});

		it('should return timestamps as ISO strings and DATE as Date on the connection', async () => {
			const { options } = await configure(nodeVersion);

			expect(options.types?.getTypeParser(builtins.TIMESTAMPTZ, 'text')(TIMESTAMPTZ_VALUE)).toBe(
				'2026-10-21T06:33:06.148Z',
			);
			expect(options.types?.getTypeParser(builtins.DATE, 'text')(DATE_VALUE)).toBeInstanceOf(Date);
		});
	});

	describe.each([2.7, 2.8])('node version %s', (nodeVersion) => {
		it('should not change the global parsers', async () => {
			const timestamptz = readGlobalParser(builtins.TIMESTAMPTZ);
			const date = readGlobalParser(builtins.DATE);

			await configure(nodeVersion);

			expect(readGlobalParser(builtins.TIMESTAMPTZ)).toBe(timestamptz);
			expect(readGlobalParser(builtins.DATE)).toBe(date);
		});

		it('should return timestamps and DATE as strings on the connection', async () => {
			const { options } = await configure(nodeVersion);

			expect(options.types?.getTypeParser(builtins.TIMESTAMPTZ, 'text')(TIMESTAMPTZ_VALUE)).toBe(
				'2026-10-21T06:33:06.148Z',
			);
			expect(options.types?.getTypeParser(builtins.DATE, 'text')(DATE_VALUE)).toBe(DATE_VALUE);
		});
	});

	it.each([undefined, 1, 2])(
		'should leave default parsers in place for node version %s',
		async (nodeVersion) => {
			const timestamptz = readGlobalParser(builtins.TIMESTAMPTZ);

			const { options } = await configure(nodeVersion);

			expect(options.types).toBeUndefined();
			expect(readGlobalParser(builtins.TIMESTAMPTZ)).toBe(timestamptz);
		},
	);
});
