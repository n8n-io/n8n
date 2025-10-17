import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/rows/delete.operation';
import { apiRequest, apiRequestAllItems } from '../../../../v2/transport';

jest.mock('../../../../v2/transport/index', () => {
	const originalModule = jest.requireActual('../../../../v2/transport/index');
	return {
		...originalModule,
		apiRequest: { call: jest.fn() },
		apiRequestAllItems: { call: jest.fn() },
	};
});

describe('NocoDB Rows Delete Action', () => {
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

	it('should delete a row', async () => {
		const mockBase = 'base1';
		const mockTable = 'table1';
		const mockResponseData = {
			id: 1,
		};

		(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
			if (paramName === 'projectId') return mockBase;
			if (paramName === 'table') return mockTable;
			if (paramName === 'id') return '1';
			return undefined;
		});
		(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue([
			{
				json: {},
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
		expect(apiRequest.call).toHaveBeenCalledWith(
			expect.anything(),
			'DELETE',
			`/api/v3/data/${mockBase}/${mockTable}/records`,
			[
				{
					id: '1',
				},
			],
			{},
		);
		expect(result).toEqual([[[mockResponseData]]]);
	});
});
