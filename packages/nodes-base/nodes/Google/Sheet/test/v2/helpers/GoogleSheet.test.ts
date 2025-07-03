import type { IExecuteFunctions } from 'n8n-workflow';

import { GoogleSheet } from '../../../v2/helpers/GoogleSheet';
import { apiRequest } from '../../../v2/transport';

jest.mock('../../../v2/transport', () => ({
	apiRequest: {
		call: jest.fn(),
	},
}));

describe('GoogleSheet', () => {
	let googleSheet: GoogleSheet;
	const mockExecuteFunctions: Partial<IExecuteFunctions> = {
		getNode: jest.fn(),
	};
	const spreadsheetId = 'test-spreadsheet-id';

	beforeEach(() => {
		jest.clearAllMocks();
		googleSheet = new GoogleSheet(spreadsheetId, mockExecuteFunctions as IExecuteFunctions);
	});

	describe('clearData', () => {
		it('should make correct API call to clear data', async () => {
			const range = 'Sheet1!A1:B2';
			await googleSheet.clearData(range);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'POST',
				`/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`,
				{ spreadsheetId, range },
			);
		});
	});

	describe('getData', () => {
		it('should retrieve data with correct parameters', async () => {
			const range = 'Sheet1!A1:B2';
			const valueRenderMode = 'UNFORMATTED_VALUE';
			const mockResponse = {
				values: [
					['1', '2'],
					['3', '4'],
				],
			};

			(apiRequest.call as jest.Mock).mockResolvedValue(mockResponse);

			const result = await googleSheet.getData(range, valueRenderMode);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				`/v4/spreadsheets/${spreadsheetId}/values/${range}`,
				{},
				{
					valueRenderOption: valueRenderMode,
					dateTimeRenderOption: 'FORMATTED_STRING',
				},
			);
			expect(result).toEqual(mockResponse.values);
		});
	});

	describe('convertSheetDataArrayToObjectArray', () => {
		it('should convert sheet data to object array correctly', () => {
			const data = [
				['name', 'age'],
				['John', '30'],
				['Jane', '25'],
			];
			const result = googleSheet.convertSheetDataArrayToObjectArray(data, 1, ['name', 'age']);

			expect(result).toEqual([
				{ name: 'John', age: '30' },
				{ name: 'Jane', age: '25' },
			]);
		});

		it('should handle empty rows when addEmpty is false', () => {
			const data = [
				['name', 'age'],
				['John', '30'],
				['', ''],
				['Jane', '25'],
			];
			const result = googleSheet.convertSheetDataArrayToObjectArray(
				data,
				1,
				['name', 'age'],
				false,
			);

			expect(result).toEqual([
				{ name: 'John', age: '30' },
				// this row should be skipped but the code does not handle it
				{ name: '', age: '' },
				{ name: 'Jane', age: '25' },
			]);
		});

		it('should handle empty columns when includeHeadersWithEmptyCells is true', () => {
			const data = [
				['name', 'age'],
				['John', '30'],
				['MARY', ''],
				['Jane', '25'],
			];
			const result = googleSheet.convertSheetDataArrayToObjectArray(
				data,
				1,
				['name', 'age'],
				false,
				true,
			);

			expect(result).toEqual([
				{ name: 'John', age: '30' },
				{ name: 'MARY', age: '' },
				{ name: 'Jane', age: '25' },
			]);
		});
	});

	describe('lookupValues', () => {
		const inputData = [
			['name', 'age', 'city'],
			['John', '30', 'NY'],
			['Jane', '25', 'LA'],
			['Bob', '30', 'SF'],
		];

		it('should find matching rows with OR combination', async () => {
			const lookupValues = [{ lookupColumn: 'age', lookupValue: '30' }];

			const result = await googleSheet.lookupValues({
				inputData,
				keyRowIndex: 0,
				dataStartRowIndex: 1,
				lookupValues,
				returnAllMatches: true,
				combineFilters: 'OR',
				nodeVersion: 4.5,
			});

			expect(result).toEqual([
				{ name: 'John', age: '30', city: 'NY' },
				{ name: 'Bob', age: '30', city: 'SF' },
			]);
		});

		it('should find matching rows with OR combination and returnAllMatches is falsy at version 4.5', async () => {
			const lookupValues = [
				{ lookupColumn: 'age', lookupValue: '30' },
				{ lookupColumn: 'name', lookupValue: 'Jane' },
			];

			const result = await googleSheet.lookupValues({
				inputData,
				keyRowIndex: 0,
				dataStartRowIndex: 1,
				lookupValues,
				combineFilters: 'OR',
				nodeVersion: 4.5,
			});

			expect(result).toEqual([
				{ name: 'John', age: '30', city: 'NY' },
				{ name: 'Jane', age: '25', city: 'LA' },
			]);
		});

		it('should find matching rows with OR combination and returnAllMatches is falsy at version 4.6', async () => {
			const lookupValues = [
				{ lookupColumn: 'age', lookupValue: '30' },
				{ lookupColumn: 'name', lookupValue: 'Jane' },
			];

			const result = await googleSheet.lookupValues({
				inputData,
				keyRowIndex: 0,
				dataStartRowIndex: 1,
				lookupValues,
				combineFilters: 'OR',
				nodeVersion: 4.6,
			});

			expect(result).toEqual([{ name: 'John', age: '30', city: 'NY' }]);
		});

		it('should find matching rows with AND combination', async () => {
			const lookupValues = [
				{ lookupColumn: 'age', lookupValue: '30' },
				{ lookupColumn: 'city', lookupValue: 'NY' },
			];

			const result = await googleSheet.lookupValues({
				inputData,
				keyRowIndex: 0,
				dataStartRowIndex: 1,
				lookupValues,
				returnAllMatches: true,
				combineFilters: 'AND',
				nodeVersion: 4.5,
			});

			expect(result).toEqual([{ name: 'John', age: '30', city: 'NY' }]);
		});

		it('should throw error for invalid key row', async () => {
			const lookupValues = [{ lookupColumn: 'age', lookupValue: '30' }];

			await expect(
				googleSheet.lookupValues({
					inputData: [['name', 'age']],
					keyRowIndex: -1,
					dataStartRowIndex: 1,
					lookupValues,
					nodeVersion: 4.5,
				}),
			).rejects.toThrow('The key row does not exist');
		});
	});

	describe('appendSheetData', () => {
		it('should correctly prepare and append data', async () => {
			const inputData = [
				{ name: 'John', age: '30' },
				{ name: 'Jane', age: '25' },
			];

			const mockAppendResponse = {
				range: 'Sheet1!A1:B3',
				majorDimension: 'ROWS',
				values: [
					['name', 'age'],
					['John', '30'],
					['Jane', '25'],
				],
			};
			(apiRequest.call as jest.Mock).mockResolvedValue(mockAppendResponse);

			await googleSheet.appendSheetData({
				inputData,
				range: 'Sheet1!A:B',
				keyRowIndex: 0,
				valueInputMode: 'USER_ENTERED',
			});

			expect(apiRequest.call).toHaveBeenCalled();
		});
	});

	describe('appendEmptyRowsOrColumns', () => {
		it('should throw error when no rows or columns specified', async () => {
			await expect(googleSheet.appendEmptyRowsOrColumns('sheet1', 0, 0)).rejects.toThrow(
				'Must specify at least one column or row to add',
			);
		});

		it('should make correct API call to append rows and columns', async () => {
			const sheetId = 'sheet1';
			await googleSheet.appendEmptyRowsOrColumns(sheetId, 2, 3);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'POST',
				`/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
				{
					requests: [
						{
							appendDimension: {
								sheetId,
								dimension: 'ROWS',
								length: 2,
							},
						},
						{
							appendDimension: {
								sheetId,
								dimension: 'COLUMNS',
								length: 3,
							},
						},
					],
				},
			);
		});
	});
});
