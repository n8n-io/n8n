/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchDatabases, searchTables } from '../../v2/methods/listSearch';
import { getColumns } from '../../v2/methods/loadOptions';

const mockRelease = vi.fn();
const mockEnd = vi.fn().mockResolvedValue(undefined);

const createMockPool = (rows: object[]) => {
	const mockQuery = vi.fn().mockResolvedValue([rows]);
	const mockFormat = vi
		.fn()
		.mockImplementation((query: string, values: unknown[]) =>
			values.reduce<string>((q, v) => q.replace('?', String(v)), query),
		);
	const mockConnection = {
		format: mockFormat,
		query: mockQuery,
		release: mockRelease,
	};
	return {
		pool: { getConnection: vi.fn().mockResolvedValue(mockConnection), end: mockEnd },
		mockFormat,
		mockQuery,
	};
};

const locator = (value: string) => ({ __rl: true, mode: 'list', value });
const isLocator = (value: unknown): value is { value: string } =>
	typeof value === 'object' && value !== null && '__rl' in value;

const mockLoadOptionsFunctions = (
	database = 'test_db',
	parameters: Record<string, unknown> = {},
): ILoadOptionsFunctions =>
	({
		getCredentials: vi.fn().mockResolvedValue({ database }),
		getNodeParameter: vi
			.fn()
			.mockImplementation(
				(name: string, _fallback?: unknown, options?: { extractValue?: boolean }) => {
					const value = Object.hasOwn(parameters, name) ? parameters[name] : {};
					// Only extractValue turns a locator into its text, as in the editor.
					return options?.extractValue && isLocator(value) ? value.value : value;
				},
			),
	}) as unknown as ILoadOptionsFunctions;

vi.mock('../../v2/transport', () => ({ createPool: vi.fn() }));

import { createPool } from '../../v2/transport';
import type { Mock } from 'vitest';

describe('MySQL v2 / listSearch / searchTables', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockEnd.mockResolvedValue(undefined);
	});

	it('should return all tables when no filter is provided', async () => {
		const rows = [{ TABLE_NAME: 'users' }, { TABLE_NAME: 'orders' }];
		const { pool, mockFormat } = createMockPool(rows);
		(createPool as Mock).mockResolvedValue(pool);

		const result = await searchTables.call(mockLoadOptionsFunctions());

		expect(result).toEqual({
			results: [
				{ name: 'users', value: 'users' },
				{ name: 'orders', value: 'orders' },
			],
		});

		const [sql] = mockFormat.mock.calls[0];
		expect(sql).not.toContain('LIKE');
		expect(mockFormat).toHaveBeenCalledWith(
			'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = ?',
			['test_db'],
		);
	});

	it('should filter tables by name when filter is provided', async () => {
		const rows = [{ TABLE_NAME: 'users' }];
		const { pool, mockFormat } = createMockPool(rows);
		(createPool as Mock).mockResolvedValue(pool);

		const result = await searchTables.call(mockLoadOptionsFunctions(), 'user');

		expect(result).toEqual({
			results: [{ name: 'users', value: 'users' }],
		});

		const [sql, values] = mockFormat.mock.calls[0];
		expect(sql).toContain('LIKE ?');
		expect(values).toContain('%user%');
	});

	it('should list the tables of the chosen database', async () => {
		const { pool, mockFormat, mockQuery } = createMockPool([{ Tables_in_other_db: 'users' }]);
		(createPool as Mock).mockResolvedValue(pool);

		const result = await searchTables.call(
			mockLoadOptionsFunctions('test_db', { database: locator('other_db') }),
			'user',
		);

		expect(result).toEqual({ results: [{ name: 'users', value: 'users' }] });
		expect(mockFormat).toHaveBeenCalledWith('SHOW TABLES FROM `other_db` LIKE ?', ['%user%']);
		expect(mockQuery).toHaveBeenCalledWith('SHOW TABLES FROM `other_db` LIKE %user%');
	});

	it('should quote a database name with a dot as one identifier', async () => {
		const { pool, mockQuery } = createMockPool([{ 'Tables_in_my.db': 'users' }]);
		(createPool as Mock).mockResolvedValue(pool);

		await searchTables.call(mockLoadOptionsFunctions('test_db', { database: locator('my.db') }));

		expect(mockQuery).toHaveBeenCalledWith('SHOW TABLES FROM `my.db`');
	});

	it.each([
		['the credential database', {}, [{ TABLE_NAME: 'my.tbl' }]],
		['the chosen database', { database: locator('other_db') }, [{ Tables_in_other_db: 'my.tbl' }]],
	])('should return a table name with a dot as one quoted name for %s', async (_, params, rows) => {
		const { pool } = createMockPool(rows);
		(createPool as Mock).mockResolvedValue(pool);

		const result = await searchTables.call(mockLoadOptionsFunctions('test_db', params));

		expect(result).toEqual({ results: [{ name: 'my.tbl', value: '`my.tbl`' }] });
	});

	it('should return empty results when no tables match filter', async () => {
		const { pool } = createMockPool([]);
		(createPool as Mock).mockResolvedValue(pool);

		const result = await searchTables.call(mockLoadOptionsFunctions(), 'nonexistent');

		expect(result).toEqual({ results: [] });
	});

	it('should always close the pool', async () => {
		const { pool } = createMockPool([]);
		(createPool as Mock).mockResolvedValue(pool);

		await searchTables.call(mockLoadOptionsFunctions());

		expect(mockEnd).toHaveBeenCalled();
	});

	it('should close the pool even when query throws', async () => {
		const mockConnection = {
			format: (_q: string, v: unknown[]) => v,
			query: vi.fn().mockRejectedValue(new Error('DB error')),
			release: mockRelease,
		};
		const pool = { getConnection: vi.fn().mockResolvedValue(mockConnection), end: mockEnd };
		(createPool as Mock).mockResolvedValue(pool);

		await expect(searchTables.call(mockLoadOptionsFunctions())).rejects.toThrow('DB error');
		expect(mockEnd).toHaveBeenCalled();
	});
});

describe('MySQL v2 / listSearch / searchDatabases', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockEnd.mockResolvedValue(undefined);
	});

	it('should list the databases that match the filter', async () => {
		const { pool, mockFormat, mockQuery } = createMockPool([{ 'Database (%shop%)': 'shop_eu' }]);
		(createPool as Mock).mockResolvedValue(pool);

		const result = await searchDatabases.call(mockLoadOptionsFunctions(), 'shop');

		expect(result).toEqual({ results: [{ name: 'shop_eu', value: 'shop_eu' }] });
		expect(mockFormat).toHaveBeenCalledWith('SHOW DATABASES LIKE ?', ['%shop%']);
		expect(mockQuery).toHaveBeenCalledWith('SHOW DATABASES LIKE %shop%');
		expect(mockEnd).toHaveBeenCalled();
	});

	it('should close the pool even when query throws', async () => {
		const mockConnection = {
			format: (q: string) => q,
			query: vi.fn().mockRejectedValue(new Error('DB error')),
			release: mockRelease,
		};
		const pool = { getConnection: vi.fn().mockResolvedValue(mockConnection), end: mockEnd };
		(createPool as Mock).mockResolvedValue(pool);

		await expect(searchDatabases.call(mockLoadOptionsFunctions())).rejects.toThrow('DB error');
		expect(mockConnection.query).toHaveBeenCalledWith('SHOW DATABASES');
		expect(mockEnd).toHaveBeenCalled();
	});
});

describe('MySQL v2 / loadOptions / getColumns', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockEnd.mockResolvedValue(undefined);
	});

	it.each([
		{ database: 'other_db', expected: 'SHOW COLUMNS FROM `users` FROM `other_db`' },
		{ database: '', expected: 'SHOW COLUMNS FROM `users` FROM `test_db`' },
	])('should run "$expected" for the database "$database"', async ({ database, expected }) => {
		const { pool, mockQuery } = createMockPool([{ Field: 'id', Type: 'int', Null: 'NO' }]);
		(createPool as Mock).mockResolvedValue(pool);

		const result = await getColumns.call(
			mockLoadOptionsFunctions('test_db', { table: locator('users'), database: locator(database) }),
		);

		expect(mockQuery).toHaveBeenCalledWith(expected);
		expect(result.map(({ value }) => value)).toEqual(['id']);
	});
});
