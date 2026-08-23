import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/rows/delete.operation';
import { apiRequest, apiRequestAllItems } from '../../../../v2/transport';
import type { Mock } from 'vitest';
import type * as _importType0 from '../../../../v2/transport/index';

vi.mock('../../../../v2/transport/index', async () => {
	const originalModule = await vi.importActual<typeof _importType0>(
		'../../../../v2/transport/index',
	);
	return {
		...originalModule,
		apiRequest: { call: vi.fn() },
		apiRequestAllItems: { call: vi.fn() },
	};
});

describe('NocoDB Rows Delete Action', () => {
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNodeParameter: vi.fn(),
			getInputData: vi.fn(() => [{ json: {} }]),
			continueOnFail: vi.fn(() => false),
			helpers: {
				returnJsonArray: vi.fn((data) => (Array.isArray(data) ? data : [data])),
				constructExecutionMetaData: vi.fn((items) => items),
			},
			getNode: vi.fn(() => {}),
		} as unknown as IExecuteFunctions;
		(apiRequest.call as Mock).mockClear();
		(apiRequestAllItems.call as Mock).mockClear();
	});

	it('should delete a row', async () => {
		const mockBase = 'base1';
		const mockTable = 'table1';
		const mockResponseData = {
			id: 1,
		};

		(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((paramName: string) => {
			if (paramName === 'projectId') return mockBase;
			if (paramName === 'table') return mockTable;
			if (paramName === 'id') return '1';
			return undefined;
		});
		(mockExecuteFunctions.getInputData as Mock).mockReturnValue([
			{
				json: {},
			},
		]);
		(apiRequest.call as Mock).mockResolvedValue({ records: [mockResponseData] });

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
		expect(result).toEqual([[mockResponseData]]);
	});
});
