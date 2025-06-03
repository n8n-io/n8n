/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import mysql2 from 'mysql2/promise';
import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { searchTables } from '../../v1/GenericFunctions';

jest.mock('mysql2/promise');

describe('OceanBase MySQL / v1 / Generic Functions', () => {
	let mockLoadOptionsFunctions: ILoadOptionsFunctions;

	beforeEach(() => {
		jest.resetAllMocks();

		mockLoadOptionsFunctions = {
			getCredentials: jest.fn().mockResolvedValue({
				database: 'test_db',
				host: 'localhost',
				port: '2881',
			}),
		} as unknown as ILoadOptionsFunctions;
	});

	describe('searchTables', () => {
		it('should return matching tables', async () => {
			const mockRows = [{ TABLE_NAME: 'USERS' }, { TABLE_NAME: 'PRODUCTS' }];

			const mockQuery = jest.fn().mockResolvedValue([mockRows]);
			const mockEnd = jest.fn().mockResolvedValue(undefined);

			(mysql2.createConnection as jest.Mock).mockResolvedValue({
				query: mockQuery,
				end: mockEnd,
			});

			const result: INodeListSearchResult = await searchTables.call(
				mockLoadOptionsFunctions,
				'user',
			);

			expect(result).toEqual({
				results: [
					{ name: 'USERS', value: 'USERS' },
					{ name: 'PRODUCTS', value: 'PRODUCTS' },
				],
			});

			expect(mockQuery).toHaveBeenCalledWith(
				`SELECT table_name
                 FROM information_schema.tables
                 WHERE table_schema = ?
                 AND table_name LIKE ?
                 ORDER BY table_name`,
				['test_db', '%user%'],
			);

			expect(mockEnd).toHaveBeenCalled();
		});

		it('should handle empty search query', async () => {
			const mockRows: any[] = [];

			const mockQuery = jest.fn().mockResolvedValue([mockRows]);
			const mockEnd = jest.fn().mockResolvedValue(undefined);

			(mysql2.createConnection as jest.Mock).mockResolvedValue({
				query: mockQuery,
				end: mockEnd,
			});

			const result = await searchTables.call(mockLoadOptionsFunctions);

			expect(result).toEqual({ results: [] });
			expect(mockQuery).toHaveBeenCalledWith(
				`SELECT table_name
                 FROM information_schema.tables
                 WHERE table_schema = ?
                 AND table_name LIKE ?
                 ORDER BY table_name`,
				['test_db', '%%'],
			);

			expect(mockEnd).toHaveBeenCalled();
		});

		it('should handle database errors', async () => {
			const mockError = new Error('OceanBase connection failed');

			(mysql2.createConnection as jest.Mock).mockRejectedValue(mockError);

			await expect(searchTables.call(mockLoadOptionsFunctions)).rejects.toThrow(
				'OceanBase connection failed',
			);
		});
	});
});
