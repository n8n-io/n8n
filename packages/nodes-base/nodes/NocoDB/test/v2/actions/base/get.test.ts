import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/base/get';
import { apiRequest } from '../../../../v2/transport';

jest.mock('../../../../v2/transport/index', () => {
	const originalModule = jest.requireActual('../../../../v2/transport/index');
	return {
		...originalModule,
		apiRequest: { call: jest.fn() },
	};
});

describe('NocoDB  base get action', () => {
	let mockExecuteFunctions: IExecuteFunctions;
	let mockNode: INode;

	beforeEach(() => {
		mockNode = {
			parameters: {},
			id: 'node1',
			name: 'NocoDB',
			type: 'nocoDb',
			typeVersion: 1,
			position: [0, 0],
			credentials: {},
		};

		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getInputData: jest.fn(() => [{ json: {} }]),
			continueOnFail: jest.fn(() => false),
			helpers: {
				returnJsonArray: jest.fn((data) => [data]),
			},
			getNode: jest.fn(() => mockNode),
		} as unknown as IExecuteFunctions;
		(apiRequest.call as jest.Mock).mockClear();
	});

	describe('execute', () => {
		it('should return data for a base and its tables', async () => {
			const mockBaseId = 'testBaseId';
			const mockBaseResponse = { id: mockBaseId, title: 'Test Base' };
			const mockTablesListResponse = { list: [{ id: 'table1' }, { id: 'table2' }] };
			const mockTable1Response = { id: 'table1', title: 'Table 1' };
			const mockTable2Response = { id: 'table2', title: 'Table 2' };

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(mockBaseId);
			(apiRequest.call as jest.Mock)
				.mockResolvedValueOnce(mockBaseResponse) // For base data
				.mockResolvedValueOnce(mockTablesListResponse) // For tables list
				.mockResolvedValueOnce(mockTable1Response) // For table1 details
				.mockResolvedValueOnce(mockTable2Response); // For table2 details

			const result = await execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'projectId',
				0,
				undefined,
				{
					extractValue: true,
				},
			);
			expect(apiRequest.call).toHaveBeenCalledTimes(4);
			expect(apiRequest.call).toHaveBeenCalledWith(
				expect.anything(),
				'GET',
				`/api/v3/meta/bases/${mockBaseId}`,
				{},
				{},
			);
			expect(apiRequest.call).toHaveBeenCalledWith(
				expect.anything(),
				'GET',
				`/api/v3/meta/bases/${mockBaseId}/tables`,
				{},
				{},
			);
			expect(apiRequest.call).toHaveBeenCalledWith(
				expect.anything(),
				'GET',
				`/api/v3/meta/bases/${mockBaseId}/tables/table1`,
				{},
				{},
			);
			expect(apiRequest.call).toHaveBeenCalledWith(
				expect.anything(),
				'GET',
				`/api/v3/meta/bases/${mockBaseId}/tables/table2`,
				{},
				{},
			);
			expect(result).toEqual([
				[
					[
						{
							id: mockBaseId,
							title: 'Test Base',
							tables: [
								{ id: 'table1', title: 'Table 1' },
								{ id: 'table2', title: 'Table 2' },
							],
						},
					],
				],
			]);
		});

		it('should handle error and continue on fail', async () => {
			const mockBaseId = 'testBaseId';
			const errorMessage = 'Test error message';

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(mockBaseId);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);
			(apiRequest.call as jest.Mock).mockRejectedValue(new Error(errorMessage));

			const result = await execute.call(mockExecuteFunctions);

			expect(result).toEqual([[[{ error: `Error: ${errorMessage}` }]]]);
		});

		it('should throw NodeApiError when continueOnFail is false', async () => {
			const mockBaseId = 'testBaseId';
			const errorMessage = 'Test error message';
			const mockError = new Error(errorMessage);

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(mockBaseId);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);
			(apiRequest.call as jest.Mock).mockRejectedValue(mockError);

			await expect(execute.call(mockExecuteFunctions)).rejects.toThrow('Test error message');
		});
	});
});
