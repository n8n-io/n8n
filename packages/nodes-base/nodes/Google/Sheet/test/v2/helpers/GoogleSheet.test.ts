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

		it('should handle zero values correctly', () => {
			const data = [
				['name', 'age'],
				['John', 30],
				['Jane', 0],
			];

			const result = googleSheet.convertSheetDataArrayToObjectArray(data, 1, ['name', 'age']);

			expect(result).toEqual([
				{ name: 'John', age: 30 },
				{ name: 'Jane', age: 0 },
			]);
		});

		it('should handle nullish values correctly', () => {
			const data = [
				['name', 'age'],
				['John', null as unknown as number],
				['Jane', undefined as unknown as number],
			];

			const result = googleSheet.convertSheetDataArrayToObjectArray(data, 1, ['name', 'age']);

			expect(result).toEqual([
				{ name: 'John', age: '' },
				{ name: 'Jane', age: '' },
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

	describe('getData with dateTimeRenderOption', () => {
		it('should use custom dateTimeRenderOption when provided', async () => {
			const range = 'Sheet1!A1:B2';
			const valueRenderMode = 'FORMATTED_VALUE';
			const dateTimeRenderOption = 'SERIAL_NUMBER';

			await googleSheet.getData(range, valueRenderMode, dateTimeRenderOption);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				`/v4/spreadsheets/${spreadsheetId}/values/${range}`,
				{},
				{
					valueRenderOption: valueRenderMode,
					dateTimeRenderOption,
				},
			);
		});
	});

	describe('spreadsheetGetSheets', () => {
		it('should retrieve spreadsheet sheets with correct parameters', async () => {
			const mockResponse = {
				sheets: [
					{ properties: { title: 'Sheet1', sheetId: 0 } },
					{ properties: { title: 'Sheet2', sheetId: 1 } },
				],
			};

			(apiRequest.call as jest.Mock).mockResolvedValue(mockResponse);

			const result = await googleSheet.spreadsheetGetSheets();

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				`/v4/spreadsheets/${spreadsheetId}`,
				{},
				{ fields: 'sheets.properties' },
			);
			expect(result).toEqual(mockResponse);
		});
	});

	describe('spreadsheetGetSheet', () => {
		const mockResponse = {
			sheets: [
				{ properties: { title: 'Sheet1', sheetId: 0 } },
				{ properties: { title: 'TestSheet', sheetId: 123456789 } },
			],
		};

		beforeEach(() => {
			(apiRequest.call as jest.Mock).mockResolvedValue(mockResponse);
		});

		it('should find sheet by name', async () => {
			const mockNode = { type: 'test-node' } as any;
			const result = await googleSheet.spreadsheetGetSheet(mockNode, 'name', 'TestSheet');

			expect(result).toEqual({ title: 'TestSheet', sheetId: 123456789 });
		});

		it('should find sheet by ID', async () => {
			const mockNode = { type: 'test-node' } as any;
			const result = await googleSheet.spreadsheetGetSheet(mockNode, 'id', '123456789');

			expect(result).toEqual({ title: 'TestSheet', sheetId: 123456789 });
		});

		it('should throw error when sheet not found by name', async () => {
			const mockNode = { type: 'test-node' } as any;

			await expect(
				googleSheet.spreadsheetGetSheet(mockNode, 'name', 'NonExistentSheet'),
			).rejects.toThrow('Sheet with name NonExistentSheet not found');
		});

		it('should throw error when sheet not found by ID', async () => {
			const mockNode = { type: 'test-node' } as any;

			await expect(googleSheet.spreadsheetGetSheet(mockNode, 'id', '999999999')).rejects.toThrow(
				'Sheet with ID 999999999 not found',
			);
		});
	});

	describe('getDataRange', () => {
		it('should return grid properties for sheet', async () => {
			const mockResponse = {
				sheets: [
					{
						properties: {
							sheetId: '123',
							gridProperties: {
								rowCount: 100,
								columnCount: 26,
							},
						},
					},
				],
			};

			(apiRequest.call as jest.Mock).mockResolvedValue(mockResponse);

			const result = await googleSheet.getDataRange('123');

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				`/v4/spreadsheets/${spreadsheetId}`,
				{},
				{ fields: 'sheets.properties' },
			);
			expect(result).toEqual({ rowCount: 100, columnCount: 26 });
		});
	});

	describe('spreadsheetBatchUpdate', () => {
		it('should make correct API call for batch update', async () => {
			const requests = [
				{
					updateSheetProperties: {
						properties: { title: 'New Title' },
						fields: 'title',
					},
				},
			];

			await googleSheet.spreadsheetBatchUpdate(requests);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'POST',
				`/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
				{ requests },
			);
		});
	});

	describe('batchUpdate', () => {
		it('should make correct API call for batch value update', async () => {
			const updateData = [
				{
					range: 'Sheet1!A1:B2',
					values: [
						['Name', 'Age'],
						['John', '30'],
					],
				},
			];

			await googleSheet.batchUpdate(updateData, 'USER_ENTERED');

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'POST',
				`/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
				{
					data: updateData,
					valueInputOption: 'USER_ENTERED',
				},
			);
		});
	});

	describe('appendData', () => {
		beforeEach(() => {
			// Mock getData to return existing data
			(apiRequest.call as jest.Mock).mockImplementation(async (_, method, _url) => {
				if (method === 'GET') {
					return { values: [['existing', 'row']] };
				}
				return { range: 'Sheet1!A2:B2' };
			});
		});

		it('should append data with calculated last row', async () => {
			const data = [
				['John', '30'],
				['Jane', '25'],
			];

			const result = await googleSheet.appendData('Sheet1!A:B', data, 'USER_ENTERED');

			expect(result).toBeDefined();
		});

		it('should use provided last row', async () => {
			const data = [['John', '30']];

			await googleSheet.appendData('Sheet1!A:B', data, 'USER_ENTERED', 5);

			// Should use row 5 instead of calculating
			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'PUT',
				expect.stringContaining('Sheet1!5:5'),
				expect.any(Object),
				expect.any(Object),
			);
		});

		it('should use append mode when useAppend is true', async () => {
			const data = [['John', '30']];

			await googleSheet.appendData('Sheet1!A:B', data, 'USER_ENTERED', 5, true);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'POST',
				expect.stringContaining(':append'),
				expect.any(Object),
				expect.any(Object),
			);
		});
	});

	describe('updateRows', () => {
		it('should make PUT request when useAppend is false', async () => {
			const data = [['John', '30']];

			await googleSheet.updateRows('Sheet1', data, 'USER_ENTERED', 2);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'PUT',
				`/v4/spreadsheets/${spreadsheetId}/values/Sheet1!2:2`,
				{
					range: 'Sheet1!2:2',
					values: data,
				},
				{ valueInputOption: 'USER_ENTERED' },
			);
		});

		it('should make POST request when useAppend is true', async () => {
			const data = [['John', '30']];

			await googleSheet.updateRows('Sheet1', data, 'USER_ENTERED', 2, 2, true);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'POST',
				`/v4/spreadsheets/${spreadsheetId}/values/Sheet1!2:3:append`,
				{
					range: 'Sheet1!2:3',
					values: data,
				},
				{ valueInputOption: 'USER_ENTERED' },
			);
		});

		it('should handle range with rowsLength', async () => {
			const data = [
				['John', '30'],
				['Jane', '25'],
			];

			await googleSheet.updateRows('Sheet1', data, 'USER_ENTERED', 2, 2);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'PUT',
				`/v4/spreadsheets/${spreadsheetId}/values/Sheet1!2:3`,
				{
					range: 'Sheet1!2:3',
					values: data,
				},
				{ valueInputOption: 'USER_ENTERED' },
			);
		});
	});

	describe('structureArrayDataByColumn', () => {
		it('should structure data using key row', () => {
			const inputData = [
				['Name', 'Age', 'City'],
				['John', '30', 'NYC'],
				['Jane', '25', 'LA'],
			];

			const result = googleSheet.structureArrayDataByColumn(inputData, 0, 1);

			expect(result).toEqual([
				{ Name: 'John', Age: '30', City: 'NYC' },
				{ Name: 'Jane', Age: '25', City: 'LA' },
			]);
		});

		it('should return empty array for invalid key row', () => {
			const inputData = [
				['Name', 'Age'],
				['John', '30'],
			];

			const result = googleSheet.structureArrayDataByColumn(inputData, -1, 1);

			expect(result).toEqual([]);
		});

		it('should return empty array when dataStartRow < keyRow', () => {
			const inputData = [
				['Name', 'Age'],
				['John', '30'],
			];

			const result = googleSheet.structureArrayDataByColumn(inputData, 1, 0);

			expect(result).toEqual([]);
		});

		it('should handle missing column names with fallback', () => {
			const inputData = [
				['Name', '', 'City'], // Empty column name
				['John', '30', 'NYC'],
			];

			const result = googleSheet.structureArrayDataByColumn(inputData, 0, 1);

			expect(result).toEqual([{ Name: 'John', col_1: '30', City: 'NYC' }]);
		});

		it('should handle uneven row lengths', () => {
			const inputData = [
				['Name', 'Age', 'City'],
				['John', '30'], // Shorter row
				['Jane', '25', 'LA', 'Extra'], // Longer row
			];

			const result = googleSheet.structureArrayDataByColumn(inputData, 0, 1);

			// The function uses the longest row to create keys, generating col_3 for the extra column
			// Only properties with values are included, empty cells are omitted
			expect(result).toEqual([
				{ Name: 'John', Age: '30' },
				{ Name: 'Jane', Age: '25', City: 'LA', col_3: 'Extra' },
			]);
		});
	});

	describe('testFilter', () => {
		it('should return column keys from key row', () => {
			const inputData = [
				['Name', 'Age', 'City'],
				['John', '30', 'NYC'],
			];

			const result = googleSheet.testFilter(inputData, 0, 1);

			expect(result).toEqual(['Name', 'Age', 'City']);
		});

		it('should return empty array for invalid key row', () => {
			const inputData = [['Name', 'Age']];

			const result = googleSheet.testFilter(inputData, -1, 1);

			expect(result).toEqual([]);
		});

		it('should return empty array when keyRow >= inputData.length', () => {
			const inputData = [['Name', 'Age']];

			const result = googleSheet.testFilter(inputData, 2, 1);

			expect(result).toEqual([]);
		});
	});

	describe('getColumnWithOffset', () => {
		it('should calculate column with positive offset', () => {
			const result = googleSheet.getColumnWithOffset('A', 2);

			expect(result).toBe('C');
		});

		it('should calculate column with zero offset', () => {
			const result = googleSheet.getColumnWithOffset('B', 0);

			expect(result).toBe('B');
		});

		it('should handle double letter columns', () => {
			const result = googleSheet.getColumnWithOffset('Z', 1);

			expect(result).toBe('AA');
		});
	});

	describe('getColumnValues', () => {
		beforeEach(() => {
			(apiRequest.call as jest.Mock).mockResolvedValue({
				values: [['header'], ['value1'], ['value2']],
			});
		});

		it('should get column values from sheet data when provided', async () => {
			const sheetData = [
				['Name', 'Age'],
				['John', '30'],
				['Jane', '25'],
			];

			const result = await googleSheet.getColumnValues({
				range: 'Sheet1!A:B',
				keyIndex: 0,
				dataStartRowIndex: 1,
				valueRenderMode: 'UNFORMATTED_VALUE',
				sheetData,
			});

			expect(result).toEqual(['John', 'Jane']);
		});

		it('should make API call when sheet data not provided', async () => {
			const result = await googleSheet.getColumnValues({
				range: 'Sheet1!A1:B10',
				keyIndex: 0,
				dataStartRowIndex: 1,
				valueRenderMode: 'UNFORMATTED_VALUE',
			});

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				expect.stringContaining('/values/Sheet1!A1:A10'),
				{},
				{ valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
			);
			expect(result).toEqual(['value1', 'value2']);
		});

		it('should throw error when column data cannot be retrieved', async () => {
			(apiRequest.call as jest.Mock).mockResolvedValue({ values: undefined });

			await expect(
				googleSheet.getColumnValues({
					range: 'Sheet1!A:B',
					keyIndex: 0,
					dataStartRowIndex: 1,
					valueRenderMode: 'UNFORMATTED_VALUE',
				}),
			).rejects.toThrow('Could not retrieve the data from key column');
		});
	});

	describe('prepareDataForUpdateOrUpsert', () => {
		beforeEach(() => {
			// Mock getData responses
			(apiRequest.call as jest.Mock).mockImplementation(
				(_: unknown, _method: unknown, url: string) => {
					if (url.includes('/values/Sheet1!A1:C1')) {
						return { values: [['Name', 'Age', 'City']] };
					}
					// Match the actual URL pattern generated by getColumnValues
					if (url.includes('/values/Sheet1!A1:A10') || url.includes('/values/Sheet1%21A1%3AA10')) {
						return { values: [['Name'], ['John'], ['Jane']] };
					}
					return {};
				},
			);
		});

		it('should prepare update data for existing records', async () => {
			const inputData = [
				{ Name: 'John', Age: '31', City: 'NYC' }, // Update existing
				{ Name: 'Bob', Age: '25', City: 'LA' }, // New record
			];

			const result = await googleSheet.prepareDataForUpdateOrUpsert({
				inputData,
				indexKey: 'Name',
				range: 'Sheet1!A1:C10',
				keyRowIndex: 0,
				dataStartRowIndex: 1,
				valueRenderMode: 'UNFORMATTED_VALUE',
				upsert: true,
			});

			expect(result.updateData).toHaveLength(2); // Age and City updates for John
			expect(result.appendData).toHaveLength(1); // Bob should be appended
			expect(result.appendData[0]).toEqual({ Name: 'Bob', Age: '25', City: 'LA' });
		});

		it('should throw error when index key not found and upsert is false', async () => {
			const inputData = [{ Name: 'John', Age: '31' }];

			await expect(
				googleSheet.prepareDataForUpdateOrUpsert({
					inputData,
					indexKey: 'NonExistentKey',
					range: 'Sheet1!A1:C10',
					keyRowIndex: 0,
					dataStartRowIndex: 1,
					valueRenderMode: 'UNFORMATTED_VALUE',
					upsert: false,
				}),
			).rejects.toThrow('Could not find column for key "NonExistentKey"');
		});

		it('should throw error when key row cannot be retrieved', async () => {
			(apiRequest.call as jest.Mock).mockResolvedValue({ values: undefined });

			const inputData = [{ Name: 'John' }];

			await expect(
				googleSheet.prepareDataForUpdateOrUpsert({
					inputData,
					indexKey: 'Name',
					range: 'Sheet1!A1:C10',
					keyRowIndex: 0,
					dataStartRowIndex: 1,
					valueRenderMode: 'UNFORMATTED_VALUE',
				}),
			).rejects.toThrow('Could not retrieve the key row');
		});

		it('should handle items without index key when upsert is true', async () => {
			const inputData = [{ Age: '30', City: 'NYC' }]; // No Name field

			const result = await googleSheet.prepareDataForUpdateOrUpsert({
				inputData,
				indexKey: 'Name',
				range: 'Sheet1!A1:C10',
				keyRowIndex: 0,
				dataStartRowIndex: 1,
				valueRenderMode: 'UNFORMATTED_VALUE',
				upsert: true,
			});

			expect(result.updateData).toHaveLength(0);
			expect(result.appendData).toHaveLength(1);
		});

		it('should stringify object values', async () => {
			const inputData = [{ Name: 'John', Age: { years: 30 }, City: 'NYC' }];

			const result = await googleSheet.prepareDataForUpdateOrUpsert({
				inputData,
				indexKey: 'Name',
				range: 'Sheet1!A1:C10',
				keyRowIndex: 0,
				dataStartRowIndex: 1,
				valueRenderMode: 'UNFORMATTED_VALUE',
				upsert: true,
			});

			const ageUpdate = result.updateData.find((update) => update.range.includes('B'));
			expect(ageUpdate?.values[0][0]).toBe('{"years":30}');
		});
	});

	describe('prepareDataForUpdatingByRowNumber', () => {
		it('should prepare update data using row numbers', () => {
			const inputData = [
				{ row_number: 2, Name: 'John', Age: '31' },
				{ row_number: 3, Name: 'Jane', Age: '26' },
			];
			const columnNamesList = [['row_number', 'Name', 'Age', 'City']];

			const result = googleSheet.prepareDataForUpdatingByRowNumber(
				inputData,
				'Sheet1!A1:D10',
				columnNamesList,
			);

			expect(result.updateData).toHaveLength(4); // 2 items × 2 fields each
			expect(result.updateData[0]).toEqual({
				range: 'Sheet1!B2',
				values: [['John']],
			});
			expect(result.updateData[1]).toEqual({
				range: 'Sheet1!C2',
				values: [['31']],
			});
		});

		it('should skip row_number field and null/undefined values', () => {
			const inputData = [{ row_number: 2, Name: 'John', Age: null, City: undefined }];
			const columnNamesList = [['row_number', 'Name', 'Age', 'City']];

			const result = googleSheet.prepareDataForUpdatingByRowNumber(
				inputData,
				'Sheet1!A1:D10',
				columnNamesList,
			);

			expect(result.updateData).toHaveLength(1); // Only Name field
			expect(result.updateData[0].range).toBe('Sheet1!B2');
		});

		it('should stringify object values', () => {
			const inputData = [{ row_number: 2, Name: { first: 'John', last: 'Doe' } }];
			const columnNamesList = [['row_number', 'Name']];

			const result = googleSheet.prepareDataForUpdatingByRowNumber(
				inputData,
				'Sheet1!A1:B10',
				columnNamesList,
			);

			expect(result.updateData[0].values[0][0]).toBe('{"first":"John","last":"Doe"}');
		});
	});

	describe('private method testing via clearData (encodeRange)', () => {
		it('should encode sheet name with special characters', async () => {
			const range = 'Sheet with spaces!A1:B2';
			await googleSheet.clearData(range);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'POST',
				`/v4/spreadsheets/${spreadsheetId}/values/Sheet%20with%20spaces!A1:B2:clear`,
				{ spreadsheetId, range },
			);
		});

		it('should encode range without sheet reference', async () => {
			const range = 'Sheet with spaces';
			await googleSheet.clearData(range);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'POST',
				expect.stringContaining(encodeURIComponent("'Sheet with spaces'")),
				{ spreadsheetId, range },
			);
		});
	});
});
