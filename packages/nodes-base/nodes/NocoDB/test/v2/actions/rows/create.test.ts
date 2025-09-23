import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/rows/create';
import { apiRequest, apiRequestAllItems } from '../../../../v2/transport';

jest.mock('../../../../v2/transport/index', () => {
	const originalModule = jest.requireActual('../../../../v2/transport/index');
	return {
		...originalModule,
		apiRequest: { call: jest.fn() },
		apiRequestAllItems: { call: jest.fn() },
	};
});

describe('NocoDB Rows Create Action', () => {
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getInputData: jest.fn(() => [{ json: {} }]),
			continueOnFail: jest.fn(() => false),
			helpers: {
				returnJsonArray: jest.fn((data) => [data]),
			},
			getNode: jest.fn(() => {}),
		} as unknown as IExecuteFunctions;
		(apiRequest.call as jest.Mock).mockClear();
		(apiRequestAllItems.call as jest.Mock).mockClear();
	});

	it('should create a row with autoMapInputData', async () => {
		const mockBase = 'base1';
		const mockTable = 'table1';
		const mockColumnsToInsert = {
			column1: 'value1',
			column2: 'value2',
		};
		const mockResponseData = {
			id: 1,
			fields: mockColumnsToInsert,
		};

		(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
			if (paramName === 'projectId') return mockBase;
			if (paramName === 'table') return mockTable;
			if (paramName === 'dataToSend') return 'autoMapInputData';
			if (paramName === 'inputsToIgnore') return '';
			return undefined;
		});
		(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue([
			{
				json: {
					fields: mockColumnsToInsert,
				},
			},
		]);
		(apiRequest.call as jest.Mock).mockResolvedValue({ records: [mockResponseData] });

		const result = await execute.call(mockExecuteFunctions);

		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
			'projectId',
			0,
			undefined,
			expect.anything(),
		);
		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
			'table',
			0,
			undefined,
			expect.anything(),
		);
		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('dataToSend', 0);
		expect(apiRequest.call).toHaveBeenCalledWith(
			expect.anything(),
			'POST',
			`/api/v3/data/${mockBase}/${mockTable}/records`,
			[
				{
					fields: mockColumnsToInsert,
				},
			],
			{},
		);
		expect(result).toEqual([[[mockResponseData]]]);
	});
});
