import { searchTables } from '../../v2/methods/listSearch';
const mockRelease = vi.fn();
const mockEnd = vi.fn().mockResolvedValue(undefined);
const createMockPool = (rows) => {
    const mockQuery = vi.fn().mockResolvedValue([rows]);
    const mockFormat = vi
        .fn()
        .mockImplementation((query, values) => values.reduce((q, v) => q.replace('?', String(v)), query));
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
const mockLoadOptionsFunctions = (database = 'test_db') => ({
    getCredentials: vi.fn().mockResolvedValue({ database }),
    getNodeParameter: vi.fn().mockReturnValue({}),
});
vi.mock('../../v2/transport', () => ({ createPool: vi.fn() }));
import { createPool } from '../../v2/transport';
describe('MySQL v2 / listSearch / searchTables', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockEnd.mockResolvedValue(undefined);
    });
    it('should return all tables when no filter is provided', async () => {
        const rows = [{ TABLE_NAME: 'users' }, { TABLE_NAME: 'orders' }];
        const { pool, mockFormat } = createMockPool(rows);
        createPool.mockResolvedValue(pool);
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
        createPool.mockResolvedValue(pool);
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
        createPool.mockResolvedValue(pool);
        const result = await searchTables.call(mockLoadOptionsFunctions(), 'nonexistent');
        expect(result).toEqual({ results: [] });
    });
    it('should always close the pool', async () => {
        const { pool } = createMockPool([]);
        createPool.mockResolvedValue(pool);
        await searchTables.call(mockLoadOptionsFunctions());
        expect(mockEnd).toHaveBeenCalled();
    });
    it('should close the pool even when query throws', async () => {
        const mockConnection = {
            format: (_q, v) => v,
            query: vi.fn().mockRejectedValue(new Error('DB error')),
            release: mockRelease,
        };
        const pool = { getConnection: vi.fn().mockResolvedValue(mockConnection), end: mockEnd };
        createPool.mockResolvedValue(pool);
        await expect(searchTables.call(mockLoadOptionsFunctions())).rejects.toThrow('DB error');
        expect(mockEnd).toHaveBeenCalled();
    });
});
//# sourceMappingURL=listSearch.test.js.map