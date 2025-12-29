import { mock } from 'jest-mock-extended';
import get from 'lodash/get';
import {
	type IDataObject,
	type IExecuteFunctions,
	type IGetNodeParameterOptions,
	type INodeExecutionData,
	type IPairedItemData,
	NodeOperationError,
} from 'n8n-workflow';

import * as utils from '../GenericFunctions';
import { Supabase } from '../Supabase.node';

describe('Test Supabase Node', () => {
	const node = new Supabase();
	const input = [{ json: {} }];
	const mockRequestWithAuthentication = jest.fn().mockResolvedValue([]);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	const createMockExecuteFunction = (
		nodeParameters: IDataObject,
		continueOnFail: boolean = false,
	) => {
		const fakeExecuteFunction = {
			getCredentials: jest.fn().mockResolvedValue({
				host: 'https://api.supabase.io',
				serviceRole: 'service_role',
			}),
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

	it('should allow filtering on the same field multiple times', async () => {
		const supabaseApiRequest = jest
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
				and: '(created_at.gt.2025-01-02 08:03:43.952051+00,created_at.lt.2025-01-02 08:07:36.102231+00)',
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

		fakeExecuteFunction.helpers.requestWithAuthentication = jest.fn().mockRejectedValue({
			description: 'Something when wrong',
			message: 'error',
		});

		await expect(node.execute.call(fakeExecuteFunction)).rejects.toHaveProperty(
			'message',
			'error: Something when wrong',
		);
	});

	describe('getSchemaHeader function', () => {
		const mockExecuteContext = {
			getNodeParameter: jest.fn(),
		} as unknown as IExecuteFunctions;

		const mockLoadOptionsContext = {
			getNodeParameter: jest.fn(),
		} as unknown as any;

		beforeEach(() => {
			jest.clearAllMocks();
		});

		it('should return empty object when useCustomSchema is false for execute context', () => {
			(mockExecuteContext.getNodeParameter as jest.Mock).mockReturnValueOnce(false);

			const result = utils.getSchemaHeader(mockExecuteContext, 'GET', 'execute');

			expect(result).toEqual({});
			expect(mockExecuteContext.getNodeParameter).toHaveBeenCalledWith('useCustomSchema', 0, false);
		});

		it('should return empty object when useCustomSchema is false for loadOptions context', () => {
			(mockLoadOptionsContext.getNodeParameter as jest.Mock).mockReturnValueOnce(false);

			const result = utils.getSchemaHeader(mockLoadOptionsContext, 'GET', 'loadOptions');

			expect(result).toEqual({});
			expect(mockLoadOptionsContext.getNodeParameter).toHaveBeenCalledWith(
				'useCustomSchema',
				false,
			);
		});

		it('should return Accept-Profile header for GET method when useCustomSchema is true', () => {
			(mockExecuteContext.getNodeParameter as jest.Mock)
				.mockReturnValueOnce(true)
				.mockReturnValueOnce('custom_schema');

			const result = utils.getSchemaHeader(mockExecuteContext, 'GET', 'execute');

			expect(result).toEqual({ 'Accept-Profile': 'custom_schema' });
			expect(mockExecuteContext.getNodeParameter).toHaveBeenCalledWith('useCustomSchema', 0, false);
			expect(mockExecuteContext.getNodeParameter).toHaveBeenCalledWith('schema', 0, 'public');
		});

		it('should return Accept-Profile header for HEAD method when useCustomSchema is true', () => {
			(mockExecuteContext.getNodeParameter as jest.Mock)
				.mockReturnValueOnce(true)
				.mockReturnValueOnce('test_schema');

			const result = utils.getSchemaHeader(mockExecuteContext, 'HEAD', 'execute');

			expect(result).toEqual({ 'Accept-Profile': 'test_schema' });
		});

		it('should return Content-Profile header for POST method when useCustomSchema is true', () => {
			(mockExecuteContext.getNodeParameter as jest.Mock)
				.mockReturnValueOnce(true)
				.mockReturnValueOnce('custom_schema');

			const result = utils.getSchemaHeader(mockExecuteContext, 'POST', 'execute');

			expect(result).toEqual({ 'Content-Profile': 'custom_schema' });
		});

		it('should return Content-Profile header for PATCH method when useCustomSchema is true', () => {
			(mockExecuteContext.getNodeParameter as jest.Mock)
				.mockReturnValueOnce(true)
				.mockReturnValueOnce('custom_schema');

			const result = utils.getSchemaHeader(mockExecuteContext, 'PATCH', 'execute');

			expect(result).toEqual({ 'Content-Profile': 'custom_schema' });
		});

		it('should return Content-Profile header for PUT method when useCustomSchema is true', () => {
			(mockExecuteContext.getNodeParameter as jest.Mock)
				.mockReturnValueOnce(true)
				.mockReturnValueOnce('custom_schema');

			const result = utils.getSchemaHeader(mockExecuteContext, 'PUT', 'execute');

			expect(result).toEqual({ 'Content-Profile': 'custom_schema' });
		});

		it('should return Content-Profile header for DELETE method when useCustomSchema is true', () => {
			(mockExecuteContext.getNodeParameter as jest.Mock)
				.mockReturnValueOnce(true)
				.mockReturnValueOnce('custom_schema');

			const result = utils.getSchemaHeader(mockExecuteContext, 'DELETE', 'execute');

			expect(result).toEqual({ 'Content-Profile': 'custom_schema' });
		});

		it('should use different parameter calls for loadOptions context', () => {
			(mockLoadOptionsContext.getNodeParameter as jest.Mock)
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
			(mockExecuteContext.getNodeParameter as jest.Mock)
				.mockReturnValueOnce(true)
				.mockReturnValueOnce('public');

			const result = utils.getSchemaHeader(mockExecuteContext, 'GET', 'execute');

			expect(result).toEqual({ 'Accept-Profile': 'public' });
			expect(mockExecuteContext.getNodeParameter).toHaveBeenCalledWith('schema', 0, 'public');
		});
	});
});
