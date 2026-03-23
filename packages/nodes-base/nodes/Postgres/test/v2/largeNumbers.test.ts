import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, Logger } from 'n8n-workflow';
import pgPromise from 'pg-promise';

import { ConnectionPoolManager } from '@utils/connection-pool-manager';
import { configurePostgres } from '../../transport';
import type { PostgresNodeCredentials, PostgresNodeOptions } from '../../v2/helpers/interfaces';

describe('Postgres Large Numbers Output Bug (NODE-4619)', () => {
	let mockLogger: Logger;
	let mockExecuteFunctions: IExecuteFunctions;
	let poolManager: ConnectionPoolManager;

	const credentials: PostgresNodeCredentials = {
		host: 'localhost',
		port: 5432,
		database: 'test',
		user: 'test',
		password: 'test',
		ssl: 'disable',
		maxConnections: 10,
	};

	beforeEach(() => {
		mockLogger = mock<Logger>();
		mockExecuteFunctions = mock<IExecuteFunctions>({
			logger: mockLogger,
			helpers: {
				getSSHClient: jest.fn(),
			},
		});

		// Reset the connection pool manager
		poolManager = ConnectionPoolManager.getInstance(mockLogger);
		poolManager.purgeConnections();
	});

	afterEach(() => {
		poolManager.purgeConnections();
	});

	it('should reuse same connection pool when only largeNumbersOutput changes (BUG)', async () => {
		// First call with largeNumbersOutput: 'text' (default)
		const options1: PostgresNodeOptions = {
			nodeVersion: 2.1,
			largeNumbersOutput: 'text',
		};

		const conn1 = await configurePostgres.call(
			mockExecuteFunctions,
			credentials,
			options1,
		);

		// Second call with largeNumbersOutput: 'numbers'
		const options2: PostgresNodeOptions = {
			nodeVersion: 2.1,
			largeNumbersOutput: 'numbers',
		};

		const conn2 = await configurePostgres.call(
			mockExecuteFunctions,
			credentials,
			options2,
		);

		// BUG: These should be different connections because largeNumbersOutput is different
		// but they're the same connection because largeNumbersOutput is not part of the cache key
		expect(conn1.db).not.toBe(conn2.db); // This will FAIL - they're the same connection
		expect(conn1.pgp).not.toBe(conn2.pgp); // This will FAIL - they're the same pgp instance
	});

	it('should configure BigInt type parser based on largeNumbersOutput option', async () => {
		const pgp1 = pgPromise({ noWarnings: true });
		const pgp2 = pgPromise({ noWarnings: true });

		// First connection with largeNumbersOutput: 'text'
		const options1: PostgresNodeOptions = {
			nodeVersion: 2.1,
			largeNumbersOutput: 'text',
		};

		await configurePostgres.call(mockExecuteFunctions, credentials, options1);

		// Check that BigInt (OID 20) is NOT parsed as number
		// Default behavior returns strings for BigInt
		const bigIntValue1 = pgp1.pg.types.getTypeParser(20)('9223372036854775807');
		expect(typeof bigIntValue1).toBe('string'); // Default behavior

		// Second connection with largeNumbersOutput: 'numbers'
		const options2: PostgresNodeOptions = {
			nodeVersion: 2.1,
			largeNumbersOutput: 'numbers',
		};

		await configurePostgres.call(mockExecuteFunctions, credentials, options2);

		// BUG: BigInt should now be parsed as number, but because the connection
		// pool is reused, the type parser was never set
		const bigIntValue2 = pgp2.pg.types.getTypeParser(20)('9223372036854775807');
		expect(typeof bigIntValue2).toBe('number'); // This will FAIL - still returns string
	});

	it('should return numbers when largeNumbersOutput is set to numbers', async () => {
		// This test demonstrates the expected behavior
		const pgp = pgPromise({ noWarnings: true });

		// Manually set the type parser (this is what should happen in fallbackHandler)
		pgp.pg.types.setTypeParser(20, (value: string) => parseInt(value, 10));
		pgp.pg.types.setTypeParser(1700, (value: string) => parseFloat(value));

		// Test BigInt (OID 20)
		const bigIntValue = pgp.pg.types.getTypeParser(20)('9223372036854775807');
		expect(typeof bigIntValue).toBe('number');
		expect(bigIntValue).toBe(9223372036854775807);

		// Test NUMERIC (OID 1700)
		const numericValue = pgp.pg.types.getTypeParser(1700)('123.456');
		expect(typeof numericValue).toBe('number');
		expect(numericValue).toBe(123.456);
	});
});
