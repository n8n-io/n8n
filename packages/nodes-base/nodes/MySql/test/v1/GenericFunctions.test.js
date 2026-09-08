/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import mysql2 from 'mysql2/promise';
import { searchTables } from '../../v1/GenericFunctions';
vi.mock('mysql2/promise');
describe('MySQL / v1 / Generic Functions', () => {
    let mockLoadOptionsFunctions;
    beforeEach(() => {
        vi.resetAllMocks();
        mockLoadOptionsFunctions = {
            getCredentials: vi.fn().mockResolvedValue({
                database: 'test_db',
            }),
        };
    });
    describe('searchTables', () => {
        it('should return matching tables', async () => {
            const mockRows = [{ table_name: 'users' }, { table_name: 'products' }];
            const mockQuery = vi.fn().mockResolvedValue([mockRows]);
            const mockEnd = vi.fn().mockResolvedValue(undefined);
            mysql2.createConnection.mockResolvedValue({
                query: mockQuery,
                end: mockEnd,
            });
            const result = await searchTables.call(mockLoadOptionsFunctions, 'user');
            expect(result).toEqual({
                results: [
                    { name: 'users', value: 'users' },
                    { name: 'products', value: 'products' },
                ],
            });
            expect(mockQuery).toHaveBeenCalledWith(`SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = ?
AND table_name LIKE ?
ORDER  BY table_name`, ['test_db', '%user%']);
            expect(mockEnd).toHaveBeenCalled();
        });
        it('should handle empty search query', async () => {
            const mockRows = [];
            const mockQuery = vi.fn().mockResolvedValue([mockRows]);
            const mockEnd = vi.fn().mockResolvedValue(undefined);
            mysql2.createConnection.mockResolvedValue({
                query: mockQuery,
                end: mockEnd,
            });
            const result = await searchTables.call(mockLoadOptionsFunctions);
            expect(result).toEqual({ results: [] });
            expect(mockQuery).toHaveBeenCalledWith(`SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = ?
AND table_name LIKE ?
ORDER  BY table_name`, ['test_db', '%%']);
            expect(mockEnd).toHaveBeenCalled();
        });
        it('should handle database errors', async () => {
            const mockError = new Error('Database connection failed');
            mysql2.createConnection.mockRejectedValue(mockError);
            await expect(searchTables.call(mockLoadOptionsFunctions)).rejects.toThrow('Database connection failed');
        });
    });
});
//# sourceMappingURL=GenericFunctions.test.js.map