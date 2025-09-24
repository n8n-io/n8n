import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/rows/update.operation';
import { apiRequest, apiRequestAllItems } from '../../../../v2/transport';

jest.mock('../../../../v2/transport/index', () => {
	const originalModule = jest.requireActual('../../../../v2/transport/index');
	return {
		...originalModule,
		apiRequest: { call: jest.fn() },
		apiRequestAllItems: { call: jest.fn() },
	};
});

describe('NocoDB Rows Update Action', () => {
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
			if (paramName === 'id') return '1';
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
		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
			'id',
			0,
			undefined,
			expect.anything(),
		);
		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('dataToSend', 0);
		expect(apiRequest.call).toHaveBeenCalledWith(
			expect.anything(),
			'PATCH',
			`/api/v3/data/${mockBase}/${mockTable}/records`,
			[
				{
					id: '1',
					fields: mockColumnsToInsert,
				},
			],
			{},
		);
		expect(result).toEqual([[[mockResponseData]]]);
	});

	it('should create a row with defineBelow and fieldsMapper', async () => {
		const mockBase = 'base1';
		const mockTable = 'table1';
		const mockFieldsMapper = {
			schema: [{ id: 'Title' }],
			value: {
				Title: 'Hello world',
			},
		};
		const mockColumnsToInsert = {
			Title: 'Hello world',
		};
		const mockResponseData = {
			id: 1,
			fields: mockColumnsToInsert,
		};

		(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
			if (paramName === 'projectId') return mockBase;
			if (paramName === 'table') return mockTable;
			if (paramName === 'dataToSend') return 'defineBelow';
			if (paramName === 'fieldsMapper') return mockFieldsMapper;
			if (paramName === 'id') return '1';
			return undefined;
		});
		(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue([
			{
				json: {},
			},
		]);
		(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation((data) => data);
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
		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
			'id',
			0,
			undefined,
			expect.anything(),
		);
		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('dataToSend', 0);
		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
			'fieldsMapper',
			0,
			expect.anything(),
		);
		expect(apiRequest.call).toHaveBeenCalledWith(
			expect.anything(),
			'PATCH',
			`/api/v3/data/${mockBase}/${mockTable}/records`,
			[
				{
					id: '1',
					fields: mockColumnsToInsert,
				},
			],
			{},
		);
		expect(result).toEqual([[mockResponseData]]);
	});
});
