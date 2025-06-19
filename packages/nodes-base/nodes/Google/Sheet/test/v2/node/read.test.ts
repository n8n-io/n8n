import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../v2/actions/sheet/read.operation';
import type { GoogleSheet } from '../../../v2/helpers/GoogleSheet';

describe('Google Sheet - Read', () => {
	let mockExecuteFunctions: Partial<IExecuteFunctions>;
	let mockSheet: Partial<GoogleSheet>;

	beforeEach(() => {
		mockExecuteFunctions = {
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNode: jest.fn().mockReturnValue({ typeVersion: 4.5 }),
			getNodeParameter: jest.fn((param) => {
				const mockParams: { [key: string]: unknown } = {
					options: {},
					'filtersUI.values': [],
					combineFilters: 'AND',
				};
				return mockParams[param];
			}),
		} as Partial<IExecuteFunctions>;

		mockSheet = {
			getData: jest.fn().mockResolvedValue([
				['Header1', 'Header2'],
				['Value1', 'Value2'],
			]),
			lookupValues: jest.fn().mockResolvedValue([{ Header1: 'Value1', Header2: 'Value2' }]),
			structureArrayDataByColumn: jest
				.fn()
				.mockReturnValue([{ Header1: 'Value1', Header2: 'Value2' }]),
		};
	});

	test('should return structured sheet data when no filters are applied', async () => {
		const result = await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			mockSheet as GoogleSheet,
			'Sheet1',
		);
		expect(mockSheet.getData).toHaveBeenCalled();
		expect(mockSheet.structureArrayDataByColumn).toHaveBeenCalled();
		expect(result).toEqual([
			{
				json: { Header1: 'Value1', Header2: 'Value2' },
				pairedItem: { item: 0 },
			},
		]);
	});

	test('should call lookupValues when filters are provided', async () => {
		mockExecuteFunctions.getNodeParameter = jest.fn((param) => {
			if (param === 'filtersUI.values') return [{ lookupColumn: 'Header1', lookupValue: 'Value1' }];
			return '';
		}) as unknown as IExecuteFunctions['getNodeParameter'];

		const result = await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			mockSheet as GoogleSheet,
			'Sheet1',
		);
		expect(mockSheet.lookupValues).toHaveBeenCalled();
		expect(result).toEqual([
			{
				json: { Header1: 'Value1', Header2: 'Value2' },
				pairedItem: { item: 0 },
			},
		]);
	});

	test('should return an empty array when sheet data is empty', async () => {
		mockSheet.getData = jest.fn().mockResolvedValue([]);
		const result = await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			mockSheet as GoogleSheet,
			'Sheet1',
		);
		expect(result).toEqual([]);
	});
});
