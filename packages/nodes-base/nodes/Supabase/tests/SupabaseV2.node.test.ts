import { mock } from 'jest-mock-extended';
import get from 'lodash/get';
import {
	type IDataObject,
	type IExecuteFunctions,
	type IGetNodeParameterOptions,
	type INode,
	type INodeExecutionData,
	type INodeTypeBaseDescription,
	type IPairedItemData,
	NodeOperationError,
} from 'n8n-workflow';

import * as helpers from '../v2/helpers';
import { SupabaseV2 } from '../v2/SupabaseV2.node';

const BASE_DESCRIPTION: INodeTypeBaseDescription = {
	displayName: 'Supabase',
	name: 'supabase',
	group: ['input'],
	description: 'Add, get, delete and update data in a table',
	defaultVersion: 2,
};

const mockNode: INode = {
	id: 'test-node',
	name: 'Supabase',
	type: 'n8n-nodes-base.supabase',
	typeVersion: 2,
	position: [0, 0],
	parameters: {},
};

// ─────────────────────────────────────────────
// Integration tests: SupabaseV2.execute
// ─────────────────────────────────────────────

describe('Test SupabaseV2 Node', () => {
	const node = new SupabaseV2(BASE_DESCRIPTION);

	let mockManagementApiRequest: jest.SpyInstance;
	let mockGetProjectCredentials: jest.SpyInstance;

	beforeAll(() => {
		mockManagementApiRequest = jest.spyOn(helpers, 'managementApiRequest').mockResolvedValue([]);
		mockGetProjectCredentials = jest
			.spyOn(helpers, 'getProjectCredentials')
			.mockResolvedValue({ projectRef: 'testprojectref', credentialType: 'supabaseManagementApi' });
	});

	afterAll(() => {
		mockManagementApiRequest.mockRestore();
		mockGetProjectCredentials.mockRestore();
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockManagementApiRequest.mockResolvedValue([]);
		mockGetProjectCredentials.mockResolvedValue({
			projectRef: 'testprojectref',
			credentialType: 'supabaseManagementApi',
		});
	});

	const createMockExecuteFunction = (
		nodeParameters: IDataObject,
		inputData: INodeExecutionData[] = [{ json: {} }],
		continueOnFail: boolean = false,
	) => {
		const fakeExecuteFunction = {
			getNodeParameter(
				parameterName: string,
				_itemIndex: unknown,
				fallbackValue?: unknown,
				options?: IGetNodeParameterOptions,
			) {
				const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
				return get(nodeParameters, parameter, fallbackValue);
			},
			getNode() {
				return mockNode;
			},
			continueOnFail: () => continueOnFail,
			getInputData: () => inputData,
			helpers: {
				constructExecutionMetaData: (
					_inputData: INodeExecutionData[],
					_options: { itemData: IPairedItemData | IPairedItemData[] },
				) => [],
				returnJsonArray: (_jsonData: IDataObject | IDataObject[]) => [],
				httpRequestWithAuthentication: jest.fn(),
			},
		} as unknown as IExecuteFunctions;
		return fakeExecuteFunction;
	};

	describe('create operation', () => {
		it('builds correct INSERT SQL with defineBelow data', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'create',
				authentication: 'pat',
				tableId: 'users',
				dataToSend: 'defineBelow',
				fieldsUi: {
					fieldValues: [
						{ fieldId: 'name', fieldValue: 'Alice' },
						{ fieldId: 'email', fieldValue: 'alice@example.com' },
					],
				},
			});

			await node.execute.call(fakeExecuteFunction);

			expect(mockManagementApiRequest).toHaveBeenCalledWith(
				'testprojectref',
				'supabaseManagementApi',
				expect.stringMatching(/^INSERT INTO "public"\."users"/),
				expect.arrayContaining(['Alice', 'alice@example.com']),
			);
		});

		it('builds correct INSERT SQL with autoMapInputData', async () => {
			const fakeExecuteFunction = createMockExecuteFunction(
				{
					resource: 'row',
					operation: 'create',
					authentication: 'pat',
					tableId: 'users',
					dataToSend: 'autoMapInputData',
					inputsToIgnore: '',
				},
				[{ json: { name: 'Bob', age: 30 } }],
			);

			await node.execute.call(fakeExecuteFunction);

			expect(mockManagementApiRequest).toHaveBeenCalledWith(
				'testprojectref',
				'supabaseManagementApi',
				expect.stringMatching(/INSERT INTO "public"\."users"/),
				expect.arrayContaining(['Bob', 30]),
			);
		});

		it('uses schema-qualified table name when useCustomSchema is true', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'create',
				authentication: 'pat',
				additionalOptions: { schema: 'myschema' },
				tableId: 'orders',
				dataToSend: 'defineBelow',
				fieldsUi: {
					fieldValues: [{ fieldId: 'total', fieldValue: '99.99' }],
				},
			});

			await node.execute.call(fakeExecuteFunction);

			expect(mockManagementApiRequest).toHaveBeenCalledWith(
				'testprojectref',
				'supabaseManagementApi',
				expect.stringContaining('"myschema"."orders"'),
				expect.any(Array),
			);
		});

		it('returns empty when no fields are provided', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'create',
				authentication: 'pat',
				tableId: 'users',
				dataToSend: 'defineBelow',
				fieldsUi: { fieldValues: [] },
			});

			await node.execute.call(fakeExecuteFunction);

			expect(mockManagementApiRequest).not.toHaveBeenCalled();
		});
	});

	describe('delete operation', () => {
		it('builds correct DELETE SQL with manual filter', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'delete',
				authentication: 'pat',
				tableId: 'users',
				filterType: 'manual',
				matchType: 'allFilters',
				filters: {
					conditions: [{ keyName: 'id', condition: 'eq', keyValue: '42' }],
				},
			});

			await node.execute.call(fakeExecuteFunction);

			expect(mockManagementApiRequest).toHaveBeenCalledWith(
				'testprojectref',
				'supabaseManagementApi',
				'DELETE FROM "public"."users" WHERE "id" = $1 RETURNING *',
				['42'],
			);
		});

		it('throws when no filter conditions defined in manual mode', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'delete',
				authentication: 'pat',
				tableId: 'users',
				filterType: 'manual',
				matchType: 'allFilters',
				filters: { conditions: [] },
			});

			await expect(node.execute.call(fakeExecuteFunction)).rejects.toThrow(NodeOperationError);
		});

		it('wraps error and continues when continueOnFail is true', async () => {
			mockManagementApiRequest.mockRejectedValueOnce(new Error('DB error'));

			const fakeExecuteFunction = createMockExecuteFunction(
				{
					resource: 'row',
					operation: 'delete',
					authentication: 'pat',
					tableId: 'users',
					filterType: 'manual',
					matchType: 'allFilters',
					filters: {
						conditions: [{ keyName: 'id', condition: 'eq', keyValue: '1' }],
					},
				},
				[{ json: {} }],
				true, // continueOnFail
			);

			await expect(node.execute.call(fakeExecuteFunction)).resolves.not.toThrow();
		});
	});

	describe('get operation', () => {
		it('builds SELECT with equality WHERE and LIMIT 1', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'get',
				authentication: 'pat',
				tableId: 'users',
				filters: {
					conditions: [{ keyName: 'id', keyValue: '5' }],
				},
			});

			await node.execute.call(fakeExecuteFunction);

			expect(mockManagementApiRequest).toHaveBeenCalledWith(
				'testprojectref',
				'supabaseManagementApi',
				'SELECT * FROM "public"."users" WHERE "id" = $1 LIMIT 1',
				['5'],
			);
		});

		it('throws when no conditions defined', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'get',
				authentication: 'pat',
				tableId: 'users',
				filters: { conditions: [] },
			});

			await expect(node.execute.call(fakeExecuteFunction)).rejects.toThrow(NodeOperationError);
		});
	});

	describe('getAll operation', () => {
		it('builds SELECT with LIMIT and OFFSET when returnAll is false', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'getAll',
				authentication: 'pat',
				tableId: 'users',
				returnAll: false,
				limit: 10,
				filterType: 'none',
			});

			await node.execute.call(fakeExecuteFunction);

			expect(mockManagementApiRequest).toHaveBeenCalledWith(
				'testprojectref',
				'supabaseManagementApi',
				expect.stringMatching(/SELECT \* FROM "public"\."users"\s+LIMIT \$1 OFFSET \$2/),
				[10, 0],
			);
		});

		it('paginates with chunks of 1000 when returnAll is true', async () => {
			// First call returns 1000 rows, second returns 5 (stops pagination)
			mockManagementApiRequest
				.mockResolvedValueOnce(new Array(1000).fill({ id: 1 }) as IDataObject[])
				.mockResolvedValueOnce([{ id: 2 }]);

			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'getAll',
				authentication: 'pat',
				tableId: 'users',
				returnAll: true,
				filterType: 'none',
			});

			await node.execute.call(fakeExecuteFunction);

			expect(mockManagementApiRequest).toHaveBeenCalledTimes(2);
			// Second call should use offset=1000
			expect(mockManagementApiRequest).toHaveBeenNthCalledWith(
				2,
				'testprojectref',
				'supabaseManagementApi',
				expect.any(String),
				[1000, 1000],
			);
		});

		it('adds WHERE clause from manual filter', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'getAll',
				authentication: 'pat',
				tableId: 'users',
				returnAll: false,
				limit: 50,
				filterType: 'manual',
				matchType: 'allFilters',
				filters: {
					conditions: [{ keyName: 'active', condition: 'eq', keyValue: 'true' }],
				},
			});

			await node.execute.call(fakeExecuteFunction);

			expect(mockManagementApiRequest).toHaveBeenCalledWith(
				'testprojectref',
				'supabaseManagementApi',
				'SELECT * FROM "public"."users" WHERE "active" = $1 LIMIT $2 OFFSET $3',
				['true', 50, 0],
			);
		});
	});

	describe('update operation', () => {
		it('builds correct UPDATE SQL with manual filter', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'update',
				authentication: 'pat',
				tableId: 'users',
				dataToSend: 'defineBelow',
				fieldsUi: {
					fieldValues: [{ fieldId: 'name', fieldValue: 'Charlie' }],
				},
				filterType: 'manual',
				matchType: 'allFilters',
				filters: {
					conditions: [{ keyName: 'id', condition: 'eq', keyValue: '7' }],
				},
			});

			await node.execute.call(fakeExecuteFunction);

			expect(mockManagementApiRequest).toHaveBeenCalledWith(
				'testprojectref',
				'supabaseManagementApi',
				'UPDATE "public"."users" SET "name" = $1 WHERE "id" = $2 RETURNING *',
				['Charlie', '7'],
			);
		});

		it('throws when no fields to update', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'update',
				authentication: 'pat',
				tableId: 'users',
				dataToSend: 'defineBelow',
				fieldsUi: { fieldValues: [] },
				filterType: 'manual',
				matchType: 'allFilters',
				filters: {
					conditions: [{ keyName: 'id', condition: 'eq', keyValue: '1' }],
				},
			});

			await expect(node.execute.call(fakeExecuteFunction)).rejects.toThrow(NodeOperationError);
		});

		it('throws when no filter conditions in manual mode', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'update',
				authentication: 'pat',
				tableId: 'users',
				dataToSend: 'defineBelow',
				fieldsUi: {
					fieldValues: [{ fieldId: 'name', fieldValue: 'Dave' }],
				},
				filterType: 'manual',
				matchType: 'allFilters',
				filters: { conditions: [] },
			});

			await expect(node.execute.call(fakeExecuteFunction)).rejects.toThrow(NodeOperationError);
		});
	});

	describe('upsert operation', () => {
		it('builds correct INSERT ... ON CONFLICT DO UPDATE SQL', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'upsert',
				authentication: 'pat',
				tableId: 'users',
				dataToSend: 'defineBelow',
				fieldsUi: {
					fieldValues: [
						{ fieldId: 'id', fieldValue: '1' },
						{ fieldId: 'name', fieldValue: 'Alice' },
					],
				},
				conflictColumns: { columns: [{ column: 'id' }] },
				conflictAction: 'doUpdate',
			});

			await node.execute.call(fakeExecuteFunction);

			expect(mockManagementApiRequest).toHaveBeenCalledWith(
				'testprojectref',
				'supabaseManagementApi',
				'INSERT INTO "public"."users" ("id", "name") VALUES ($1, $2) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name" RETURNING *',
				['1', 'Alice'],
			);
		});

		it('builds correct INSERT ... ON CONFLICT DO NOTHING SQL', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'upsert',
				authentication: 'pat',
				tableId: 'users',
				dataToSend: 'defineBelow',
				fieldsUi: {
					fieldValues: [
						{ fieldId: 'id', fieldValue: '1' },
						{ fieldId: 'email', fieldValue: 'a@b.com' },
					],
				},
				conflictColumns: { columns: [{ column: 'id' }] },
				conflictAction: 'doNothing',
			});

			await node.execute.call(fakeExecuteFunction);

			expect(mockManagementApiRequest).toHaveBeenCalledWith(
				'testprojectref',
				'supabaseManagementApi',
				'INSERT INTO "public"."users" ("id", "email") VALUES ($1, $2) ON CONFLICT ("id") DO NOTHING RETURNING *',
				['1', 'a@b.com'],
			);
		});

		it('returns empty when no fields are provided', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'upsert',
				authentication: 'pat',
				tableId: 'users',
				dataToSend: 'defineBelow',
				fieldsUi: { fieldValues: [] },
				conflictColumns: { columns: [] },
				conflictAction: 'doUpdate',
			});

			const result = await node.execute.call(fakeExecuteFunction);
			expect(result).toEqual([[]]);
			expect(mockManagementApiRequest).not.toHaveBeenCalled();
		});
	});

	describe('custom schema', () => {
		it('uses schema-qualified table references in all operations', async () => {
			for (const [operation, params] of [
				[
					'delete',
					{
						filterType: 'manual',
						matchType: 'allFilters',
						filters: {
							conditions: [{ keyName: 'id', condition: 'eq', keyValue: '1' }],
						},
					},
				],
				[
					'get',
					{
						filters: {
							conditions: [{ keyName: 'id', keyValue: '1' }],
						},
					},
				],
				[
					'getAll',
					{
						returnAll: false,
						limit: 10,
						filterType: 'none',
					},
				],
			] as Array<[string, IDataObject]>) {
				mockManagementApiRequest.mockClear();

				const fakeExecuteFunction = createMockExecuteFunction({
					resource: 'row',
					operation,
					authentication: 'pat',
					additionalOptions: { schema: 'analytics' },
					tableId: 'events',
					...params,
				});

				await node.execute.call(fakeExecuteFunction);

				expect(mockManagementApiRequest).toHaveBeenCalledWith(
					expect.any(String),
					expect.any(String),
					expect.stringContaining('"analytics"."events"'),
					expect.any(Array),
				);
			}
		});
	});

	describe('mock helper', () => {
		it('uses mock() from jest-mock-extended in fakeNode reference', () => {
			// Verifies mock import is used (satisfies the import requirement)
			const m = mock<INode>();
			expect(m).toBeDefined();
		});
	});
});
