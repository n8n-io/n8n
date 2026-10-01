import get from 'lodash/get';
import {
	type ILoadOptionsFunctions,
	type IDataObject,
	type IExecuteFunctions,
	type IGetNodeParameterOptions,
	type INodeExecutionData,
	type IPairedItemData,
	NodeOperationError,
	UserError,
} from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import * as utils from '../GenericFunctions';
import { Supabase } from '../Supabase.node';

describe('Test Supabase Node', () => {
	const node = new Supabase();
	const input = [{ json: {} }];
	const mockRequestWithAuthentication = vi.fn().mockResolvedValue([]);
	const mockGetCredentials = vi.fn().mockResolvedValue({
		host: 'https://api.supabase.io',
		serviceRole: 'service_role',
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createMockExecuteFunction = (
		nodeParameters: IDataObject,
		continueOnFail: boolean = false,
	) => {
		const fakeExecuteFunction = {
			getCredentials: mockGetCredentials,
			getNodeParameter(
				parameterName: string,
				itemIndex: number,
				fallbackValue?: IDataObject,
				options?: IGetNodeParameterOptions,
			) {
				const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
				const parameterValue = get(nodeParameters, parameter, fallbackValue);
				if ((parameterValue as IDataObject)?.nodeOperationError) {
					throw new NodeOperationError(mock(), 'Get Options Error', { itemIndex });
				}
				return parameterValue;
			},
			getNode() {
				return node;
			},
			continueOnFail: () => continueOnFail,
			getInputData: () => input,
			helpers: {
				requestWithAuthentication: mockRequestWithAuthentication,
				constructExecutionMetaData: (
					_inputData: INodeExecutionData[],
					_options: { itemData: IPairedItemData | IPairedItemData[] },
				) => [],
				returnJsonArray: (_jsonData: IDataObject | IDataObject[]) => [],
			},
		} as unknown as IExecuteFunctions;
		return fakeExecuteFunction;
	};

	// getNodeParameter is only ever asked for these two names on the loadOptions path
	const createMockLoadOptionsFunction = (
		schema?: string,
		getCredentials: typeof mockGetCredentials = mockGetCredentials,
	) => {
		const context = mockDeep<ILoadOptionsFunctions>({
			getCredentials,
			helpers: {
				requestWithAuthentication: mockRequestWithAuthentication,
			},
		});
		context.getNodeParameter.mockImplementation((name: string) =>
			name === 'useCustomSchema' ? schema !== undefined : schema,
		);
		return context;
	};

	describe('filter query builders', () => {
		it('should leave plain filter components unchanged', () => {
			expect(utils.buildOrQuery({ keyName: 'active', condition: 'is', keyValue: 'null' })).toBe(
				'active.is.null',
			);
			expect(
				utils.buildOrQuery({
					keyName: 'description',
					condition: 'fullText',
					searchFunction: 'fts',
					keyValue: 'search terms',
				}),
			).toBe('description.fts.search terms');
		});

		it('should quote components containing reserved characters', () => {
			expect(
				utils.buildOrQuery({
					keyName: 'profile.name',
					condition: 'eq',
					keyValue: 'Doe,Jane',
				}),
			).toBe('"profile.name".eq."Doe,Jane"');
		});

		it('should escape quotes and backslashes in quoted components', () => {
			expect(utils.buildOrQuery({ keyName: 'name', condition: 'eq', keyValue: 'a"b\\c' })).toBe(
				'name.eq."a\\"b\\\\c"',
			);
		});

		it('should quote query parameter names but not values', () => {
			expect(
				utils.buildQuery(new Map(), {
					keyName: 'profile.name',
					condition: 'eq',
					keyValue: 'Doe,Jane',
				}),
			).toEqual(new Map([['"profile.name"', 'eq.Doe,Jane']]));
			expect(
				utils.buildGetQuery(new Map(), { keyName: 'profile.name', keyValue: 'Doe,Jane' }),
			).toEqual(new Map([['"profile.name"', 'eq.Doe,Jane']]));
		});

		it.each(['&', '?', '='])('should quote query parameter names containing %s', (character) => {
			const keyName = `column${character}name`;
			const expectedKey = `"${keyName}"`;

			expect(utils.buildQuery(new Map(), { keyName, condition: 'eq', keyValue: 'value' })).toEqual(
				new Map([[expectedKey, 'eq.value']]),
			);
			expect(utils.buildGetQuery(new Map(), { keyName, keyValue: 'value' })).toEqual(
				new Map([[expectedKey, 'eq.value']]),
			);
		});

		it.each([
			{
				filter: { keyName: 'name', condition: 'contains', keyValue: 'Jane' },
				errorType: 'filter condition',
			},
			{
				filter: {
					keyName: 'name',
					condition: 'fullText',
					searchFunction: 'plain',
					keyValue: 'Jane',
				},
				errorType: 'search function',
			},
		])('should reject an unsupported $errorType', ({ filter, errorType }) => {
			expect(() => utils.buildOrQuery(filter)).toThrow(`Unsupported ${errorType}`);
		});
	});

	describe('filter string parameters', () => {
		it('should substitute $1 with a quoted value when it contains reserved characters', () => {
			const resolved = utils.applyFilterStringParameters('or=(email.eq.$1)', [
				{ value: 'nobody@x.com,id.gt.0' },
			]);

			expect(decodeURIComponent(resolved)).toBe('or=(email.eq."nobody@x.com,id.gt.0")');
		});

		it('should leave a plain substituted value unquoted', () => {
			expect(utils.applyFilterStringParameters('id.eq.$1', [{ value: '42' }])).toBe('id.eq.42');
		});

		it('should substitute multiple parameters by position', () => {
			const resolved = utils.applyFilterStringParameters('or=(a.eq.$1,b.eq.$2)', [
				{ value: 'x,y' },
				{ value: 'z' },
			]);

			expect(decodeURIComponent(resolved)).toBe('or=(a.eq."x,y",b.eq.z)');
		});

		it('should throw when the filter string references a parameter that was not provided', () => {
			expect(() => utils.applyFilterStringParameters('email.eq.$2', [{ value: 'x' }])).toThrow(
				'Filters (String) references parameter $2',
			);
		});

		it('should leave the filter string untouched when no parameters are provided, even with a literal $N in it', () => {
			expect(utils.applyFilterStringParameters('price.eq.$50', [])).toBe('price.eq.$50');
		});

		it('should escape & and = in a substituted value so it cannot open a new top-level query parameter', () => {
			const resolved = utils.applyFilterStringParameters('or=(email.eq.$1)', [
				{ value: 'x@y.com&select=*' },
			]);

			expect(Array.from(new URLSearchParams(resolved).keys())).toEqual(['or']);
		});

		it.each(['getAll', 'delete', 'update'])(
			'should escape an injected parameter value for %s so it cannot append an extra condition',
			async (operation) => {
				const supabaseApiRequest = vi.spyOn(utils, 'supabaseApiRequest').mockResolvedValue([]);

				const fakeExecuteFunction = createMockExecuteFunction({
					resource: 'row',
					operation,
					returnAll: true,
					filterType: 'string',
					filterString: 'or=(email.eq.$1)',
					filterStringParameters: { values: [{ value: 'nobody@x.com,id.gt.0' }] },
					tableId: 'my_table',
					dataToSend: 'defineBelow',
					fieldsUi: { fieldValues: [] },
				});

				await node.execute.call(fakeExecuteFunction);

				// the substituted value is percent-encoded (decodeURI alone leaves
				// reserved-character escapes like %40/%2C untouched); the receiving
				// server decodes it the same way before parsing the filter.
				const endpointArg = supabaseApiRequest.mock.calls[0][1] as string;
				expect(decodeURIComponent(endpointArg)).toBe(
					'/my_table?or=(email.eq."nobody@x.com,id.gt.0")',
				);

				supabaseApiRequest.mockRestore();
			},
		);

		it.each(['getAll', 'delete', 'update'])(
			"should not swallow a $N parameter mismatch under continueOnFail for %s, matching manual mode's unconditional validation errors",
			async (operation) => {
				const fakeExecuteFunction = createMockExecuteFunction(
					{
						resource: 'row',
						operation,
						returnAll: true,
						filterType: 'string',
						filterString: 'email.eq.$2',
						filterStringParameters: { values: [{ value: 'x' }] },
						tableId: 'my_table',
						dataToSend: 'defineBelow',
						fieldsUi: { fieldValues: [] },
					},
					true,
				);

				await expect(node.execute.call(fakeExecuteFunction)).rejects.toThrow(
					'Filters (String) references parameter $2',
				);
			},
		);
	});

	describe('getAll pagination', () => {
		it('should make exactly one request when limit is less than 1000', async () => {
			const supabaseApiRequest = vi
				.spyOn(utils, 'supabaseApiRequest')
				.mockResolvedValueOnce(Array.from({ length: 50 }, (_, i) => ({ id: i })));

			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'getAll',
				returnAll: false,
				limit: 50,
				tableId: 'my_table',
				filterType: 'none',
				orderBy: '',
			});

			await node.execute.call(fakeExecuteFunction);

			expect(supabaseApiRequest).toHaveBeenCalledTimes(1);

			supabaseApiRequest.mockRestore();
		});

		it('should make exactly one request when limit equals 1000', async () => {
			const supabaseApiRequest = vi
				.spyOn(utils, 'supabaseApiRequest')
				.mockResolvedValueOnce(Array.from({ length: 1000 }, (_, i) => ({ id: i })));

			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'getAll',
				returnAll: false,
				limit: 1000,
				tableId: 'my_table',
				filterType: 'none',
				orderBy: '',
			});

			await node.execute.call(fakeExecuteFunction);

			expect(supabaseApiRequest).toHaveBeenCalledTimes(1);

			supabaseApiRequest.mockRestore();
		});

		it('should paginate and request only remaining rows on the last page when limit > 1000', async () => {
			const capturedQs: IDataObject[] = [];
			const supabaseApiRequest = vi
				.spyOn(utils, 'supabaseApiRequest')
				.mockImplementation(async (_method, _endpoint, _body, qs) => {
					capturedQs.push({ ...qs });
					return capturedQs.length === 1
						? Array.from({ length: 1000 }, (_, i) => ({ id: i }))
						: Array.from({ length: 500 }, (_, i) => ({ id: i + 1000 }));
				});

			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'getAll',
				returnAll: false,
				limit: 1500,
				tableId: 'my_table',
				filterType: 'none',
				orderBy: '',
			});

			await node.execute.call(fakeExecuteFunction);

			expect(supabaseApiRequest).toHaveBeenCalledTimes(2);
			expect(capturedQs[0]).toMatchObject({ limit: 1000 });
			expect(capturedQs[0]).not.toHaveProperty('offset');
			expect(capturedQs[1]).toMatchObject({ limit: 500, offset: 1000 });

			supabaseApiRequest.mockRestore();
		});

		it('should include order parameter in the request when orderBy is set', async () => {
			const supabaseApiRequest = vi.spyOn(utils, 'supabaseApiRequest').mockResolvedValueOnce([]);

			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'getAll',
				returnAll: true,
				tableId: 'my_table',
				filterType: 'none',
				orderBy: 'id',
			});

			await node.execute.call(fakeExecuteFunction);

			expect(supabaseApiRequest).toHaveBeenCalledWith(
				'GET',
				'/my_table',
				{},
				expect.objectContaining({ order: 'id' }),
				undefined,
				{},
			);

			supabaseApiRequest.mockRestore();
		});
	});

	it('should allow filtering on the same field multiple times', async () => {
		const supabaseApiRequest = vi
			.spyOn(utils, 'supabaseApiRequest')
			.mockImplementation(async () => {
				return [];
			});

		const fakeExecuteFunction = createMockExecuteFunction({
			resource: 'row',
			operation: 'getAll',
			returnAll: true,
			filterType: 'manual',
			matchType: 'allFilters',
			tableId: 'my_table',
			filters: {
				conditions: [
					{
						condition: 'gt',
						keyName: 'created_at',
						keyValue: '2025-01-02 08:03:43.952051+00',
					},
					{
						condition: 'lt',
						keyName: 'created_at',
						keyValue: '2025-01-02 08:07:36.102231+00',
					},
				],
			},
		});

		await node.execute.call(fakeExecuteFunction);

		expect(supabaseApiRequest).toHaveBeenCalledWith(
			'GET',
			'/my_table',
			{},
			{
				and: '(created_at.gt."2025-01-02 08:03:43.952051+00",created_at.lt."2025-01-02 08:07:36.102231+00")',
				offset: 0,
			},
			undefined,
			{},
		);

		supabaseApiRequest.mockRestore();
	});

	it('should not set schema headers if no custom schema is used', async () => {
		const fakeExecuteFunction = createMockExecuteFunction({
			resource: 'row',
			operation: 'getAll',
			returnAll: true,
			useCustomSchema: false,
			schema: 'public',
			tableId: 'my_table',
		});

		await node.execute.call(fakeExecuteFunction);

		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'supabaseApi',
			expect.objectContaining({
				method: 'GET',
				headers: expect.objectContaining({
					Prefer: 'return=representation',
				}),
				uri: 'https://api.supabase.io/rest/v1/my_table',
			}),
		);
	});

	it('should set the schema headers for GET calls if custom schema is used', async () => {
		const fakeExecuteFunction = createMockExecuteFunction({
			resource: 'row',
			operation: 'getAll',
			returnAll: true,
			useCustomSchema: true,
			schema: 'custom_schema',
			tableId: 'my_table',
		});

		await node.execute.call(fakeExecuteFunction);

		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'supabaseApi',
			expect.objectContaining({
				method: 'GET',
				headers: expect.objectContaining({
					'Accept-Profile': 'custom_schema',
					Prefer: 'return=representation',
				}),
				uri: 'https://api.supabase.io/rest/v1/my_table',
			}),
		);
	});

	it('should set the schema headers for POST calls if custom schema is used', async () => {
		const fakeExecuteFunction = createMockExecuteFunction({
			resource: 'row',
			operation: 'create',
			returnAll: true,
			useCustomSchema: true,
			schema: 'custom_schema',
			tableId: 'my_table',
			dataToSend: 'defineBelow',
			fieldsUi: {
				fieldValues: [],
			},
		});

		await node.execute.call(fakeExecuteFunction);

		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'supabaseApi',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					'Content-Profile': 'custom_schema',
					Prefer: 'return=representation',
				}),
				uri: 'https://api.supabase.io/rest/v1/my_table',
			}),
		);
	});

	it('should show descriptive message when error is caught', async () => {
		const fakeExecuteFunction = createMockExecuteFunction({
			resource: 'row',
			operation: 'create',
			returnAll: true,
			useCustomSchema: true,
			schema: '',
			tableId: 'my_table',
			dataToSend: 'defineBelow',
			fieldsUi: {
				fieldValues: [],
			},
		});

		fakeExecuteFunction.helpers.requestWithAuthentication = vi.fn().mockRejectedValue({
			description: 'Something when wrong',
			message: 'error',
		});

		await expect(node.execute.call(fakeExecuteFunction)).rejects.toHaveProperty(
			'message',
			'error: Something when wrong',
		);
	});

	describe('table name path segment', () => {
		const encodedNames = [
			['a/b', '/a%2Fb'],
			['a\\b', '/a%5Cb'],
			['a?b=c', '/a%3Fb%3Dc'],
			['a#b', '/a%23b'],
			['../a', '/..%2Fa'],
			['my table', '/my%20table'],
		];

		it.each(encodedNames)(
			'should send the table name %s as a single path segment',
			async (tableId, expectedEndpoint) => {
				const supabaseApiRequest = vi.spyOn(utils, 'supabaseApiRequest').mockResolvedValueOnce([]);
				const fakeExecuteFunction = createMockExecuteFunction({
					resource: 'row',
					operation: 'getAll',
					returnAll: false,
					limit: 50,
					tableId,
					filterType: 'none',
					orderBy: '',
				});

				await node.execute.call(fakeExecuteFunction);

				expect(supabaseApiRequest).toHaveBeenCalledWith(
					'GET',
					expectedEndpoint,
					expect.anything(),
					expect.anything(),
					undefined,
					expect.anything(),
				);
				supabaseApiRequest.mockRestore();
			},
		);

		const operations: Array<[string, IDataObject]> = [
			['create', { dataToSend: 'defineBelow', fieldsUi: { fieldValues: [] } }],
			['delete', { filterType: 'none' }],
			['get', { filters: { conditions: [{ keyName: 'id', keyValue: '1' }] } }],
			['update', { filterType: 'none', dataToSend: 'defineBelow', fieldsUi: { fieldValues: [] } }],
		];

		it.each(operations)(
			'should encode the table name on the %s operation',
			async (operation, parameters) => {
				const supabaseApiRequest = vi.spyOn(utils, 'supabaseApiRequest').mockResolvedValue([]);
				const fakeExecuteFunction = createMockExecuteFunction({
					resource: 'row',
					operation,
					tableId: 'a/b',
					...parameters,
				});

				await node.execute.call(fakeExecuteFunction);

				expect(supabaseApiRequest.mock.calls[0][1]).toBe('/a%2Fb');
				supabaseApiRequest.mockRestore();
			},
		);

		it.each(['', '.', '..'])(
			'should reject the table name "%s" before any request is made',
			async (tableId) => {
				const supabaseApiRequest = vi.spyOn(utils, 'supabaseApiRequest');
				const fakeExecuteFunction = createMockExecuteFunction({
					resource: 'row',
					operation: 'getAll',
					returnAll: false,
					limit: 50,
					tableId,
					filterType: 'none',
					orderBy: '',
				});

				await expect(node.execute.call(fakeExecuteFunction)).rejects.toThrow(UserError);
				expect(supabaseApiRequest).not.toHaveBeenCalled();
				supabaseApiRequest.mockRestore();
			},
		);
	});

	describe('getSchemaHeader function', () => {
		const mockExecuteContext = {
			getNodeParameter: vi.fn(),
		} as unknown as IExecuteFunctions;

		const mockLoadOptionsContext = {
			getNodeParameter: vi.fn(),
		} as unknown as any;

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should return empty object when useCustomSchema is false for execute context', () => {
			(mockExecuteContext.getNodeParameter as Mock).mockReturnValueOnce(false);

			const result = utils.getSchemaHeader(mockExecuteContext, 'GET', 'execute');

			expect(result).toEqual({});
			expect(mockExecuteContext.getNodeParameter).toHaveBeenCalledWith('useCustomSchema', 0, false);
		});

		it('should return empty object when useCustomSchema is false for loadOptions context', () => {
			(mockLoadOptionsContext.getNodeParameter as Mock).mockReturnValueOnce(false);

			const result = utils.getSchemaHeader(mockLoadOptionsContext, 'GET', 'loadOptions');

			expect(result).toEqual({});
			expect(mockLoadOptionsContext.getNodeParameter).toHaveBeenCalledWith(
				'useCustomSchema',
				false,
			);
		});

		it('should return Accept-Profile header for GET method when useCustomSchema is true', () => {
			(mockExecuteContext.getNodeParameter as Mock)
				.mockReturnValueOnce(true)
				.mockReturnValueOnce('custom_schema');

			const result = utils.getSchemaHeader(mockExecuteContext, 'GET', 'execute');

			expect(result).toEqual({ 'Accept-Profile': 'custom_schema' });
			expect(mockExecuteContext.getNodeParameter).toHaveBeenCalledWith('useCustomSchema', 0, false);
			expect(mockExecuteContext.getNodeParameter).toHaveBeenCalledWith('schema', 0, 'public');
		});

		it('should return Accept-Profile header for HEAD method when useCustomSchema is true', () => {
			(mockExecuteContext.getNodeParameter as Mock)
				.mockReturnValueOnce(true)
				.mockReturnValueOnce('test_schema');

			const result = utils.getSchemaHeader(mockExecuteContext, 'HEAD', 'execute');

			expect(result).toEqual({ 'Accept-Profile': 'test_schema' });
		});

		it('should return Content-Profile header for POST method when useCustomSchema is true', () => {
			(mockExecuteContext.getNodeParameter as Mock)
				.mockReturnValueOnce(true)
				.mockReturnValueOnce('custom_schema');

			const result = utils.getSchemaHeader(mockExecuteContext, 'POST', 'execute');

			expect(result).toEqual({ 'Content-Profile': 'custom_schema' });
		});

		it('should return Content-Profile header for PATCH method when useCustomSchema is true', () => {
			(mockExecuteContext.getNodeParameter as Mock)
				.mockReturnValueOnce(true)
				.mockReturnValueOnce('custom_schema');

			const result = utils.getSchemaHeader(mockExecuteContext, 'PATCH', 'execute');

			expect(result).toEqual({ 'Content-Profile': 'custom_schema' });
		});

		it('should return Content-Profile header for PUT method when useCustomSchema is true', () => {
			(mockExecuteContext.getNodeParameter as Mock)
				.mockReturnValueOnce(true)
				.mockReturnValueOnce('custom_schema');

			const result = utils.getSchemaHeader(mockExecuteContext, 'PUT', 'execute');

			expect(result).toEqual({ 'Content-Profile': 'custom_schema' });
		});

		it('should return Content-Profile header for DELETE method when useCustomSchema is true', () => {
			(mockExecuteContext.getNodeParameter as Mock)
				.mockReturnValueOnce(true)
				.mockReturnValueOnce('custom_schema');

			const result = utils.getSchemaHeader(mockExecuteContext, 'DELETE', 'execute');

			expect(result).toEqual({ 'Content-Profile': 'custom_schema' });
		});

		it('should use different parameter calls for loadOptions context', () => {
			(mockLoadOptionsContext.getNodeParameter as Mock)
				.mockReturnValueOnce(true)
				.mockReturnValueOnce('load_options_schema');

			const result = utils.getSchemaHeader(mockLoadOptionsContext, 'GET', 'loadOptions');

			expect(result).toEqual({ 'Accept-Profile': 'load_options_schema' });
			expect(mockLoadOptionsContext.getNodeParameter).toHaveBeenCalledWith(
				'useCustomSchema',
				false,
			);
			expect(mockLoadOptionsContext.getNodeParameter).toHaveBeenCalledWith('schema', 'public');
		});

		it('should default to public schema when schema parameter is not provided', () => {
			(mockExecuteContext.getNodeParameter as Mock)
				.mockReturnValueOnce(true)
				.mockReturnValueOnce('public');

			const result = utils.getSchemaHeader(mockExecuteContext, 'GET', 'execute');

			expect(result).toEqual({ 'Accept-Profile': 'public' });
			expect(mockExecuteContext.getNodeParameter).toHaveBeenCalledWith('schema', 0, 'public');
		});
	});

	describe('loadOptions', () => {
		describe('getTables', () => {
			it('should return the tables and skip RPCs', async () => {
				const mockLoadOptionsFunctions = createMockLoadOptionsFunction();
				mockRequestWithAuthentication.mockResolvedValue({
					paths: {
						'/': {
							get: {},
						},
						'/table': {
							get: {},
						},
						'/rpc/some': {
							get: {},
						},
					},
				});

				const tables = await node.methods.loadOptions.getTables.call(mockLoadOptionsFunctions);

				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				expect(tables).toEqual([{ name: 'table', value: 'table' }]);
			});
		});

		describe('getTableColumns', () => {
			it('should return table columns with their types', async () => {
				const mockLoadOptionsFunctions = createMockLoadOptionsFunction();
				mockLoadOptionsFunctions.getCurrentNodeParameter.mockReturnValue('users');
				mockRequestWithAuthentication.mockResolvedValue({
					definitions: {
						users: {
							properties: {
								id: { type: 'integer' },
								email: { type: 'string' },
							},
						},
					},
				});

				const columns =
					await node.methods.loadOptions.getTableColumns.call(mockLoadOptionsFunctions);

				expect(columns).toEqual([
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased, n8n-nodes-base/node-param-display-name-miscased-id
					{ name: 'id - (integer)', value: 'id' },
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					{ name: 'email - (string)', value: 'email' },
				]);
			});

			it('should return empty array when table definition has no properties', async () => {
				const mockLoadOptionsFunctions = createMockLoadOptionsFunction();
				mockLoadOptionsFunctions.getCurrentNodeParameter.mockReturnValue('users');
				mockRequestWithAuthentication.mockResolvedValue({
					definitions: {
						users: {},
					},
				});

				const columns =
					await node.methods.loadOptions.getTableColumns.call(mockLoadOptionsFunctions);

				expect(columns).toEqual([]);
			});

			it('should fetch the schema document once for concurrent calls sharing a schema', async () => {
				const createColumnsContext = (schema?: string) => {
					const context = createMockLoadOptionsFunction(schema);
					context.getCurrentNodeParameter.mockReturnValue('users');
					return context;
				};

				mockRequestWithAuthentication.mockResolvedValue({
					definitions: {
						users: {
							properties: {
								id: { type: 'integer' },
								email: { type: 'string' },
							},
						},
					},
				});

				const publicSchemaColumns = await Promise.all(
					Array.from(
						{ length: 25 },
						async () => await node.methods.loadOptions.getTableColumns.call(createColumnsContext()),
					),
				);

				for (const columns of publicSchemaColumns) {
					expect(columns).toEqual([
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased, n8n-nodes-base/node-param-display-name-miscased-id
						{ name: 'id - (integer)', value: 'id' },
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						{ name: 'email - (string)', value: 'email' },
					]);
				}
				expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);

				await Promise.all(
					Array.from(
						{ length: 5 },
						async () =>
							await node.methods.loadOptions.getTableColumns.call(
								createColumnsContext('analytics'),
							),
					),
				);

				expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(2);
			});

			it('should not share a request between callers whose credentials differ', async () => {
				const createColumnsContext = (serviceRole: string) => {
					const context = createMockLoadOptionsFunction(
						undefined,
						vi.fn().mockResolvedValue({ host: 'https://api.supabase.io', serviceRole }),
					);
					context.getCurrentNodeParameter.mockReturnValue('users');
					return context;
				};
				mockRequestWithAuthentication.mockResolvedValue({ definitions: { users: {} } });

				await Promise.all([
					node.methods.loadOptions.getTableColumns.call(createColumnsContext('role-a')),
					node.methods.loadOptions.getTableColumns.call(createColumnsContext('role-b')),
				]);

				expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(2);
			});

			it('should issue a fresh request after a shared request fails', async () => {
				const createColumnsContext = () => {
					const context = createMockLoadOptionsFunction();
					context.getCurrentNodeParameter.mockReturnValue('users');
					return context;
				};
				mockRequestWithAuthentication.mockRejectedValueOnce(new Error('schema unavailable'));

				await expect(
					Promise.all([
						node.methods.loadOptions.getTableColumns.call(createColumnsContext()),
						node.methods.loadOptions.getTableColumns.call(createColumnsContext()),
					]),
				).rejects.toThrow();
				expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);

				mockRequestWithAuthentication.mockResolvedValue({ definitions: { users: {} } });
				await node.methods.loadOptions.getTableColumns.call(createColumnsContext());

				expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(2);
			});
		});
	});
});
