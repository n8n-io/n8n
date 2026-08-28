import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

vi.mock('../../v2/GenericFunctions', async () => {
	const actual = await vi.importActual<typeof _importType0>('../../v2/GenericFunctions');
	return {
		...actual,
		seaTableApiRequest: vi.fn(),
		getBaseCollaborators: vi.fn(),
	};
});

import * as GenericFunctions from '../../v2/GenericFunctions';
import { execute as executeGet } from '../../v2/actions/row/get.operation';
import { execute as executeSearch } from '../../v2/actions/row/search.operation';
import type { Mock } from 'vitest';
import type * as _importType0 from '../../v2/GenericFunctions';

const mockedApiRequest = GenericFunctions.seaTableApiRequest as Mock;
const mockedGetCollaborators = GenericFunctions.getBaseCollaborators as Mock;

const buildMockContext = (params: Record<string, unknown>): IExecuteFunctions => {
	return {
		getNodeParameter: vi.fn().mockImplementation((...args: unknown[]) => {
			const name = args[0] as string;
			return params[name] ?? {};
		}),
		helpers: {
			returnJsonArray: vi.fn().mockReturnValue([]),
		},
	} as unknown as IExecuteFunctions;
};

const getCapturedSql = (): string => {
	const [, , , body] = mockedApiRequest.mock.calls[0] as [unknown, string, string, IDataObject];
	return body.sql as string;
};

describe('SeaTable > v2 > row operations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedApiRequest.mockResolvedValue({ results: [], metadata: [] });
		mockedGetCollaborators.mockResolvedValue([]);
	});

	describe('search operation', () => {
		it('should handle special characters in search term for exact match', async () => {
			const ctx = buildMockContext({
				tableName: 'Employees',
				searchColumn: 'name',
				searchTerm: 'O"Brien',
				options: { wildcard: false },
			});

			await executeSearch.call(ctx, 0);

			expect(getCapturedSql()).toBe('SELECT * FROM `Employees` WHERE `name` = "O\\"Brien"');
		});

		it('should handle special characters in search term for wildcard match', async () => {
			const ctx = buildMockContext({
				tableName: 'Employees',
				searchColumn: 'name',
				searchTerm: '"quoted"',
				options: { wildcard: true },
			});

			await executeSearch.call(ctx, 0);

			expect(getCapturedSql()).toBe('SELECT * FROM `Employees` WHERE `name` LIKE "%\\"quoted\\"%"');
		});

		it('should handle backticks in table and column names', async () => {
			const ctx = buildMockContext({
				tableName: 'Q1`Results',
				searchColumn: 'product`name',
				searchTerm: 'test',
				options: { wildcard: false },
			});

			await executeSearch.call(ctx, 0);

			expect(getCapturedSql()).toBe('SELECT * FROM `Q1``Results` WHERE `product``name` = "test"');
		});

		it('should handle backticks in table and column names for case-insensitive search', async () => {
			const ctx = buildMockContext({
				tableName: 'Q1`Results',
				searchColumn: 'product`name',
				searchTerm: 'test',
				options: { wildcard: true, insensitive: true },
			});

			await executeSearch.call(ctx, 0);

			expect(getCapturedSql()).toBe(
				'SELECT * FROM `Q1``Results` WHERE lower(`product``name`) LIKE "%test%"',
			);
		});

		it('should handle backslashes in search term', async () => {
			const ctx = buildMockContext({
				tableName: 'Employees',
				searchColumn: 'path',
				searchTerm: 'C:\\Users\\file',
				options: { wildcard: false },
			});

			await executeSearch.call(ctx, 0);

			expect(getCapturedSql()).toBe(
				'SELECT * FROM `Employees` WHERE `path` = "C:\\\\Users\\\\file"',
			);
		});
	});

	describe('get operation', () => {
		it('should handle apostrophes in row identifier', async () => {
			const ctx = buildMockContext({
				tableName: 'Employees',
				rowId: "user's-record",
				options: {},
			});

			await executeGet.call(ctx, 0);

			expect(getCapturedSql()).toBe("SELECT * FROM `Employees` WHERE _id = 'user\\'s-record'");
		});

		it('should handle backticks in table name', async () => {
			const ctx = buildMockContext({
				tableName: 'My`Table',
				rowId: 'abc-123',
				options: {},
			});

			await executeGet.call(ctx, 0);

			expect(getCapturedSql()).toBe("SELECT * FROM `My``Table` WHERE _id = 'abc-123'");
		});
	});
});
