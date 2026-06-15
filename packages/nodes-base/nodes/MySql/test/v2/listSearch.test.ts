/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchTables } from '../../v2/methods/listSearch';

const mockRelease = jest.fn();
const mockEnd = jest.fn().mockResolvedValue(undefined);

const createMockPool = (rows: object[]) => {
	const mockQuery = jest.fn().mockResolvedValue([rows]);
	const mockFormat = jest
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
		pool: { getConnection: jest.fn().mockResolvedValue(mockConnection), end: mockEnd },
		mockFormat,
		mockQuery,
	};
};

const mockLoadOptionsFunctions = (database = 'test_db'): ILoadOptionsFunctions =>
	({
		getCredentials: jest.fn().mockResolvedValue({ database }),
		getNodeParameter: jest.fn().mockReturnValue({}),
	}) as unknown as ILoadOptionsFunctions;

jest.mock('../../v2/transport', () => ({ createPool: jest.fn() }));

import { createPool } from '../../v2/transport';

describe('MySQL v2 / listSearch / searchTables', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockEnd.mockResolvedValue(undefined);
	});

	it('should return all tables when no filter is provided', async () => {
		const rows = [{ TABLE_NAME: 'users' }, { TABLE_NAME: 'orders' }];
		const { pool, mockFormat } = createMockPool(rows);
		(createPool as jest.Mock).mockResolvedValue(pool);

		const result = await searchTables.call(mockLoadOptionsFunctions());

		expect(result).toEqual({
			results: [
				{ name: 'users', value: 'users' },
				{ name: 'orders', value: 'orders' },
			],
		});

		const [sql] = mockFormat.mock.calls[0];
		expect(sql).not.toContain('LIKE');
	});

	it('should filter tables by name when filter is provided', async () => {
		const rows = [{ TABLE_NAME: 'users' }];
		const { pool, mockFormat } = createMockPool(rows);
		(createPool as jest.Mock).mockResolvedValue(pool);

		const result = await searchTables.call(mockLoadOptionsFunctions(), 'user');

		expect(result).toEqual({
			results: [{ name: 'users', value: 'users' }],
		});

		const [sql, values] = mockFormat.mock.calls[0];
		expect(sql).toContain('LIKE ?');
		expect(values).toContain('%user%');
	});

	it('should return empty results when no tables match filter', async () => {
		const { pool } = createMockPool([]);
		(createPool as jest.Mock).mockResolvedValue(pool);

		const result = await searchTables.call(mockLoadOptionsFunctions(), 'nonexistent');

		expect(result).toEqual({ results: [] });
	});

	it('should always close the pool', async () => {
		const { pool } = createMockPool([]);
		(createPool as jest.Mock).mockResolvedValue(pool);

		await searchTables.call(mockLoadOptionsFunctions());

		expect(mockEnd).toHaveBeenCalled();
	});

	it('should close the pool even when query throws', async () => {
		const mockConnection = {
			format: (_q: string, v: unknown[]) => v,
			query: jest.fn().mockRejectedValue(new Error('DB error')),
			release: mockRelease,
		};
		const pool = { getConnection: jest.fn().mockResolvedValue(mockConnection), end: mockEnd };
		(createPool as jest.Mock).mockResolvedValue(pool);

		await expect(searchTables.call(mockLoadOptionsFunctions())).rejects.toThrow('DB error');
		expect(mockEnd).toHaveBeenCalled();
	});
});
