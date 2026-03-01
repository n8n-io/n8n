import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../v2/actions/sheet/remove.operation';
import type { GoogleSheet } from '../../../v2/helpers/GoogleSheet';
import { apiRequest } from '../../../v2/transport';

jest.mock('../../../v2/transport', () => ({
	apiRequest: jest.fn(),
}));

describe('Google Sheet - Remove', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});
	const mockExecuteFunctions = {
		getInputData: jest.fn(),
		getNodeParameter: jest.fn(),
		helpers: {
			constructExecutionMetaData: jest.fn(),
		},
	} as unknown as Partial<IExecuteFunctions>;

	const sheet = {} as Partial<GoogleSheet>;
	const sheetName = 'spreadsheet123||sheet456';

	test('should process a single item', async () => {
		const items = [{ json: {} }];
		((mockExecuteFunctions as IExecuteFunctions).getInputData as jest.Mock).mockReturnValue(items);

		const apiResponse = { replies: [{ some: 'data' }], foo: 'bar' };
		(apiRequest as jest.Mock).mockResolvedValue(apiResponse);

		const constructedData = [{ json: { foo: 'bar', index: 0 } }];
		(
			(mockExecuteFunctions as IExecuteFunctions).helpers.constructExecutionMetaData as jest.Mock
		).mockReturnValue(constructedData);

		const result = await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			sheet as GoogleSheet,
			sheetName,
		);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith('POST', '/v4/spreadsheets/spreadsheet123:batchUpdate', {
			requests: [
				{
					deleteSheet: {
						sheetId: 'sheet456',
					},
				},
			],
		});

		expect(result).toEqual(constructedData);
	});

	test('should process multiple items', async () => {
		const items = [{ json: {} }, { json: {} }];
		((mockExecuteFunctions as IExecuteFunctions).getInputData as jest.Mock).mockReturnValue(items);

		const apiResponses = [
			{ replies: [{ some: 'data1' }], foo: 'bar1' },
			{ replies: [{ some: 'data2' }], foo: 'bar2' },
		];
		(apiRequest as jest.Mock)
			.mockResolvedValueOnce(apiResponses[0])
			.mockResolvedValueOnce(apiResponses[1]);

		const constructedDataItem0 = [{ json: { foo: 'bar1', index: 0 } }];
		const constructedDataItem1 = [{ json: { foo: 'bar2', index: 1 } }];
		((mockExecuteFunctions as IExecuteFunctions).helpers.constructExecutionMetaData as jest.Mock)
			.mockReturnValueOnce(constructedDataItem0)
			.mockReturnValueOnce(constructedDataItem1);

		const result = await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			sheet as GoogleSheet,
			sheetName,
		);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'POST',
			'/v4/spreadsheets/spreadsheet123:batchUpdate',
			{
				requests: [
					{
						deleteSheet: {
							sheetId: 'sheet456',
						},
					},
				],
			},
		);
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'POST',
			'/v4/spreadsheets/spreadsheet123:batchUpdate',
			{
				requests: [
					{
						deleteSheet: {
							sheetId: 'sheet456',
						},
					},
				],
			},
		);
		expect(result).toEqual([...constructedDataItem0, ...constructedDataItem1]);
	});
});
