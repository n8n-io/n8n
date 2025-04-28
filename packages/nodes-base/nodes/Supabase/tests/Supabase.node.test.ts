import { mock } from 'jest-mock-extended';
import { get } from 'lodash';
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
				fallbackValue?: IDataObject | undefined,
				options?: IGetNodeParameterOptions | undefined,
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
});
