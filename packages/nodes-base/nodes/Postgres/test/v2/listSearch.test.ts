import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type * as _importType0 from '../../transport';
import { LIST_SCHEMAS_QUERY, LIST_TABLES_QUERY } from '../../v2/helpers/queries';
import { schemaSearch, tableSearch } from '../../v2/methods/listSearch';

const { dbAny } = vi.hoisted(() => ({ dbAny: vi.fn() }));

vi.mock('../../transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../transport');
	return {
		...originalModule,
		configurePostgres: vi.fn(async () => ({ db: { any: dbAny } })),
	};
});

describe('PostgresV2, listSearch', () => {
	let loadOptionsFunctions: ILoadOptionsFunctions;

	beforeEach(() => {
		loadOptionsFunctions = mock<ILoadOptionsFunctions>();
		loadOptionsFunctions.getCredentials = vi.fn(async () => ({})) as never;
		loadOptionsFunctions.getNode = vi.fn(() => mock<INode>({ typeVersion: 2.8 }));
		loadOptionsFunctions.getNodeParameter = vi.fn(() => 'public') as never;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should return only name and value pairs for schemas', async () => {
		dbAny.mockResolvedValue([{ schema_name: 'public' }, { schema_name: 'billing' }]);

		const result = await schemaSearch.call(loadOptionsFunctions);

		expect(dbAny).toHaveBeenCalledWith(LIST_SCHEMAS_QUERY);
		expect(result).toEqual({
			results: ['public', 'billing'].map((schema) => ({ name: schema, value: schema })),
		});
	});

	// The query also selects table_type for the List Tables operation; the picker must ignore it
	it('should return only name and value pairs for tables, whatever extra columns the query selects', async () => {
		dbAny.mockResolvedValue([
			{ table_name: 'orders', table_type: 'BASE TABLE' },
			{ table_name: 'active_orders', table_type: 'VIEW' },
		]);

		const result = await tableSearch.call(loadOptionsFunctions);

		expect(dbAny).toHaveBeenCalledWith(LIST_TABLES_QUERY, ['public']);
		expect(result).toEqual({
			results: ['orders', 'active_orders'].map((table) => ({ name: table, value: table })),
		});
	});
});
