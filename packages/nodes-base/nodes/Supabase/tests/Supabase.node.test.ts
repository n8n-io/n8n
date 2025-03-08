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

	// Input for create tests
	const input = [{ json: { email: 'test@example.com', phone: '+1234567890' } }];

	const createMockExecuteFunction = (
		nodeParameters: IDataObject,
		continueOnFail: boolean = false,
	) => {
		const fakeExecuteFunction = {
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
				constructExecutionMetaData: (
					inputData: INodeExecutionData[],
					_options: { itemData: IPairedItemData | IPairedItemData[] },
				) => inputData,
				returnJsonArray: (jsonData: IDataObject | IDataObject[]) =>
					Array.isArray(jsonData) ? jsonData.map((data) => ({ json: data })) : [{ json: jsonData }],
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
	});

	describe('Create Operation', () => {
		it('should create a row and return data when returnData is true', async () => {
			const supabaseApiRequest = jest
				.spyOn(utils, 'supabaseApiRequest')
				.mockResolvedValue([{ email: 'test@example.com', phone: '+1234567890' }]);

			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'create',
				tableId: 'signups',
				dataToSend: 'autoMapInputData',
				inputsToIgnore: '',
				returnData: true,
			});

			const result = await node.execute.call(fakeExecuteFunction);

			expect(supabaseApiRequest).toHaveBeenCalledWith(
				'POST',
				'/signups',
				[{ email: 'test@example.com', phone: '+1234567890' }],
				{},
				undefined,
				{},
				true,
			);
			expect(result[0][0].json).toEqual({
				email: 'test@example.com',
				phone: '+1234567890',
			});
		});

		it('should create a row without returning data when returnData is false', async () => {
			const supabaseApiRequest = jest.spyOn(utils, 'supabaseApiRequest').mockResolvedValue({});

			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'create',
				tableId: 'signups',
				dataToSend: 'autoMapInputData',
				inputsToIgnore: '',
				returnData: false,
			});

			const result = await node.execute.call(fakeExecuteFunction);

			expect(supabaseApiRequest).toHaveBeenCalledWith(
				'POST',
				'/signups',
				[{ email: 'test@example.com', phone: '+1234567890' }],
				{},
				undefined,
				{},
				false,
			);
			expect(result[0][0].json).toEqual({
				success: true,
				message: 'Row inserted',
			});
		});

		it('should coerce non-boolean returnData to boolean and proceed', async () => {
			const supabaseApiRequest = jest
				.spyOn(utils, 'supabaseApiRequest')
				.mockResolvedValue([{ email: 'test@example.com', phone: '+1234567890' }]);

			const fakeExecuteFunction = createMockExecuteFunction({
				resource: 'row',
				operation: 'create',
				tableId: 'signups',
				dataToSend: 'autoMapInputData',
				inputsToIgnore: '',
				returnData: 'hello', // Non-boolean expression result
			});

			const result = await node.execute.call(fakeExecuteFunction);

			// 'hello' is truthy, so expect returnData to be treated as true
			expect(supabaseApiRequest).toHaveBeenCalledWith(
				'POST',
				'/signups',
				[{ email: 'test@example.com', phone: '+1234567890' }],
				{},
				undefined,
				{},
				'hello', // Passed as-is, but coerced to true in JS
			);
			expect(result[0][0].json).toEqual({
				email: 'test@example.com',
				phone: '+1234567890',
			});
		});
	});
});
