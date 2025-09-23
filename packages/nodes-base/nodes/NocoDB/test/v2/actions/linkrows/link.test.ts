/* eslint-disable unused-imports/no-unused-imports */
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/linkrows/link';
import { apiRequest, apiRequestAllItems } from '../../../../v2/transport';

jest.mock('../../../../v2/transport/index', () => {
	const originalModule = jest.requireActual('../../../../v2/transport/index');
	return {
		...originalModule,
		apiRequest: { call: jest.fn() },
		apiRequestAllItems: { call: jest.fn() },
	};
});

describe('NocoDB Linkrows Link Node', () => {
	let mockApiRequest: { call: jest.Mock };
	let mockThis: IExecuteFunctions;

	beforeEach(() => {
		mockApiRequest = apiRequest as unknown as { call: jest.Mock };
		mockApiRequest.call.mockClear();

		mockThis = {
			getInputData: () => [
				{
					json: {},
					pairedItem: { item: 0 },
					binary: {},
				},
			],
			getNodeParameter: (name: string, index: number, defaultValue?: any, options?: any) => {
				if (name === 'projectId') {
					return 'base1';
				}
				if (name === 'table') {
					return 'table1';
				}
				if (name === 'linkFieldName') {
					return 'linkField1';
				}
				if (name === 'id') {
					return 'row1';
				}
				if (name === 'linkId') {
					if (options?.extractValue) {
						return ['linkedRow1'];
					}
					return 'linkedRow1';
				}
				return defaultValue;
			},
			continueOnFail: () => false,
			helpers: {
				returnJsonArray: jest.fn((data) => data),
			},
			getNode: () => ({ name: 'NocoDB', type: 'nocoDb', id: '1', parameters: {} }) as INode,
		} as unknown as IExecuteFunctions;
	});

	// Test Case 1: Successful linking of a single row
	it('should successfully link a single row', async () => {
		mockApiRequest.call.mockResolvedValueOnce({ success: true });

		const result = await execute.call(mockThis);

		expect(mockApiRequest.call).toHaveBeenCalledWith(
			mockThis,
			'POST',
			'/api/v3/data/base1/table1/links/linkField1/row1',
			[{ id: 'linkedRow1' }],
			{},
		);
		expect(result).toEqual([[{ success: true }]]);
	});

	// Test Case 2: Successful linking of multiple rows
	it('should successfully link multiple rows', async () => {
		mockThis.getNodeParameter = (
			name: string,
			index: number,
			defaultValue?: any,
			options?: any,
		) => {
			if (name === 'projectId') return 'base1';
			if (name === 'table') return 'table1';
			if (name === 'linkFieldName') return 'linkField1';
			if (name === 'id') return 'row1';
			if (name === 'linkId') {
				if (options?.extractValue) {
					return ['linkedRow1', 'linkedRow2'];
				}
				return ['linkedRow1', 'linkedRow2'];
			}
			return defaultValue;
		};
		mockApiRequest.call.mockResolvedValueOnce({ success: true });

		const result = await execute.call(mockThis);

		expect(mockApiRequest.call).toHaveBeenCalledWith(
			mockThis,
			'POST',
			'/api/v3/data/base1/table1/links/linkField1/row1',
			[{ id: 'linkedRow1' }, { id: 'linkedRow2' }],
			{},
		);
		expect(result).toEqual([[{ success: true }]]);
	});

	// Test Case 3: Error handling (continueOnFail = true)
	it('should handle API errors gracefully when continueOnFail is true', async () => {
		mockApiRequest.call.mockRejectedValueOnce(new Error('API Error'));
		mockThis.continueOnFail = () => true;

		const result = await execute.call(mockThis);

		expect(mockApiRequest.call).toHaveBeenCalledTimes(1);
		expect(result[0][0]).toHaveProperty('error');
		expect(result[0][0].error).toContain('API Error');
	});

	// Test Case 4: Error handling (continueOnFail = false)
	it('should throw NodeApiError when continueOnFail is false and API call fails', async () => {
		mockApiRequest.call.mockRejectedValueOnce(new Error('API Error'));
		mockThis.continueOnFail = () => false;

		await expect(execute.call(mockThis)).rejects.toThrow('API Error');
	});

	// Test Case 5: Empty linkId
	it('should throw an error if linkId is empty', async () => {
		mockThis.getNodeParameter = (
			name: string,
			index: number,
			defaultValue?: any,
			options?: any,
		) => {
			if (name === 'projectId') return 'base1';
			if (name === 'table') return 'table1';
			if (name === 'linkFieldName') return 'linkField1';
			if (name === 'id') return 'row1';
			if (name === 'linkId') {
				if (options?.extractValue) {
					return [];
				}
				return [];
			}
			return defaultValue;
		};

		await expect(execute.call(mockThis)).rejects.toThrow('Linked Row ID Value cannot be empty');
	});

	// Test Case 6: linkId from expression (array of objects)
	it('should correctly process linkId as an array of objects from expression', async () => {
		mockThis.getNodeParameter = (
			name: string,
			index: number,
			defaultValue?: any,
			options?: any,
		) => {
			if (name === 'projectId') return 'base1';
			if (name === 'table') return 'table1';
			if (name === 'linkFieldName') return 'linkField1';
			if (name === 'id') return 'row1';
			if (name === 'linkId') {
				return [[{ id: 'exprRow1' }, { id: 'exprRow2' }]];
			}
			return defaultValue;
		};
		mockApiRequest.call.mockResolvedValueOnce({ success: true });

		const result = await execute.call(mockThis);

		expect(mockApiRequest.call).toHaveBeenCalledWith(
			mockThis,
			'POST',
			'/api/v3/data/base1/table1/links/linkField1/row1',
			[{ id: 'exprRow1' }, { id: 'exprRow2' }],
			{},
		);
		expect(result).toEqual([[{ success: true }]]);
	});

	// Test Case 7: linkId from expression (array of strings/numbers)
	it('should correctly process linkId as an array of strings/numbers from expression', async () => {
		mockThis.getNodeParameter = (
			name: string,
			index: number,
			defaultValue?: any,
			options?: any,
		) => {
			if (name === 'projectId') return 'base1';
			if (name === 'table') return 'table1';
			if (name === 'linkFieldName') return 'linkField1';
			if (name === 'id') return 'row1';
			if (name === 'linkId') {
				if (options?.extractValue) {
					return [['exprRowA', 123]];
				}
				return [['exprRowA', 123]];
			}
			return defaultValue;
		};
		mockApiRequest.call.mockResolvedValueOnce({ success: true });

		const result = await execute.call(mockThis);

		expect(mockApiRequest.call).toHaveBeenCalledWith(
			mockThis,
			'POST',
			'/api/v3/data/base1/table1/links/linkField1/row1',
			[{ id: 'exprRowA' }, { id: 123 }],
			{},
		);
		expect(result).toEqual([[{ success: true }]]);
	});
});
