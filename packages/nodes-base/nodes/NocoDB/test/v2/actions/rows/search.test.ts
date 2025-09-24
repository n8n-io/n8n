import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/rows/search.operation';
import { apiRequest, apiRequestAllItems } from '../../../../v2/transport';

jest.mock('../../../../v2/transport/index', () => {
	const originalModule = jest.requireActual('../../../../v2/transport/index');
	return {
		...originalModule,
		apiRequest: { call: jest.fn() },
		apiRequestAllItems: { call: jest.fn() },
	};
});

describe('NocoDB Rows Search Action', () => {
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

	describe('v4', () => {
		it('should make a basic search request with where and fields', async () => {
			// Mocking getNodeParameter for v4
			mockExecuteFunctions.getNodeParameter = jest
				.fn()
				.mockImplementation((name: string, index: number) => {
					if (name === 'version') return 4;
					if (name === 'projectId') return 'base1';
					if (name === 'table') return 'table1';
					if (name === 'returnAll') return false;
					if (name === 'limit') return 50;
					if (name === 'options') {
						return {
							where: '(name,eq,test)',
							fields: ['fieldA', 'fieldB'],
						};
					}
					return undefined;
				});

			// Mocking apiRequest.call
			(apiRequest.call as jest.Mock).mockResolvedValue({
				records: [{ id: 1, name: 'testA' }],
			});

			const expectedResponse = [{ id: 1, name: 'testA' }];

			const result = await execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('version', 0);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'projectId',
				0,
				undefined,
				{
					extractValue: true,
				},
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('table', 0, undefined, {
				extractValue: true,
			});
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('returnAll', 0);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('limit', 0);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				'/api/v3/data/base1/table1/records',
				{},
				{
					where: '(name,eq,test)',
					fields: 'fieldA,fieldB',
					limit: 50,
				},
			);
			expect(result).toEqual([[expectedResponse]]);
		});

		it('should make a search request with only fields option', async () => {
			// Mocking getNodeParameter for v4 with only fields
			mockExecuteFunctions.getNodeParameter = jest
				.fn()
				.mockImplementation((name: string, index: number) => {
					if (name === 'version') return 4;
					if (name === 'projectId') return 'base1';
					if (name === 'table') return 'table1';
					if (name === 'returnAll') return false;
					if (name === 'limit') return 50;
					if (name === 'options') {
						return {
							fields: ['fieldC', 'fieldD'],
						};
					}
					return undefined;
				});

			// Mocking apiRequest.call
			(apiRequest.call as jest.Mock).mockResolvedValue({
				records: [{ id: 1, fieldC: 'valueC' }],
			});

			const expectedResponse = [{ id: 1, fieldC: 'valueC' }];

			const result = await execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('version', 0);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'projectId',
				0,
				undefined,
				{
					extractValue: true,
				},
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('table', 0, undefined, {
				extractValue: true,
			});
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('returnAll', 0);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('limit', 0);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				'/api/v3/data/base1/table1/records',
				{},
				{
					fields: 'fieldC,fieldD',
					limit: 50,
				},
			);
			expect(result).toEqual([[expectedResponse]]);
		});
	});

	describe('returnAll', () => {
		it('should make a search request with returnAll set to true', async () => {
			// Mocking getNodeParameter for returnAll
			mockExecuteFunctions.getNodeParameter = jest
				.fn()
				.mockImplementation((name: string, index: number) => {
					if (name === 'version') return 3;
					if (name === 'projectId') return 'base1';
					if (name === 'table') return 'table1';
					if (name === 'returnAll') return true;
					if (name === 'options') {
						return {};
					}
					return undefined;
				});

			// Mocking apiRequestAllItems.call
			(apiRequestAllItems.call as jest.Mock).mockResolvedValue([
				{ id: 1, name: 'test1' },
				{ id: 2, name: 'test2' },
			]);

			const expectedResponse = [
				{ id: 1, name: 'test1' },
				{ id: 2, name: 'test2' },
			];

			const result = await execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('version', 0);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'projectId',
				0,
				undefined,
				{
					extractValue: true,
				},
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('table', 0, undefined, {
				extractValue: true,
			});
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('returnAll', 0);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});

			expect(apiRequestAllItems.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				'/api/v3/data/base1/table1/records',
				{},
				{},
			);
			expect(result).toEqual([[expectedResponse]]);
		});
	});
});
