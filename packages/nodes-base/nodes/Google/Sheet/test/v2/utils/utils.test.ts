import {
	NodeOperationError,
	type IExecuteFunctions,
	type INode,
	type ResourceMapperField,
} from 'n8n-workflow';

import { GOOGLE_SHEETS_SHEET_URL_REGEX } from '../../../../constants';
import { GoogleSheet } from '../../../v2/helpers/GoogleSheet';
import {
	addRowNumber,
	autoMapInputData,
	checkForSchemaChanges,
	getColumnName,
	getColumnNumber,
	getExistingSheetNames,
	getRangeString,
	getSheetId,
	getSpreadsheetId,
	hexToRgb,
	mapFields,
	prepareSheetData,
	removeEmptyColumns,
	removeEmptyRows,
	trimLeadingEmptyRows,
	trimToFirstEmptyRow,
} from '../../../v2/helpers/GoogleSheets.utils';

describe('Test Google Sheets, addRowNumber', () => {
	it('should add row nomber', () => {
		const data = [
			['id', 'col1', 'col2', 'col3'],
			[0, 'A', 'B', 'C'],
			[1, 'a', 'b', 'c'],
			[2, 'd', 'e', 'f'],
			[3, 'g', 'h', 'i'],
		];
		const result = addRowNumber(data, 0);

		expect(result).toBeDefined();
		expect(result).toEqual([
			['row_number', 'id', 'col1', 'col2', 'col3'],
			[2, 0, 'A', 'B', 'C'],
			[3, 1, 'a', 'b', 'c'],
			[4, 2, 'd', 'e', 'f'],
			[5, 3, 'g', 'h', 'i'],
		]);
	});
});

describe('Test Google Sheets, trimToFirstEmptyRow', () => {
	it('should trimToFirstEmptyRow without row numbers', () => {
		const data = [
			['id', 'col1', 'col2', 'col3'],
			[0, 'A', 'B', 'C'],
			['', '', '', ''],
			[2, 'd', 'e', 'f'],
			[3, 'g', 'h', 'i'],
		];

		const result = trimToFirstEmptyRow(data, false);

		expect(result).toBeDefined();
		expect(result).toEqual([
			['id', 'col1', 'col2', 'col3'],
			[0, 'A', 'B', 'C'],
		]);
	});
	it('should trimToFirstEmptyRow with row numbers', () => {
		const data = [
			['row_number', 'id', 'col1', 'col2', 'col3'],
			[2, 0, 'A', 'B', 'C'],
			[3, 1, 'a', 'b', 'c'],
			[4, '', '', '', ''],
			[5, 3, 'g', 'h', 'i'],
		];

		const result = trimToFirstEmptyRow(data);

		expect(result).toBeDefined();
		expect(result).toEqual([
			['row_number', 'id', 'col1', 'col2', 'col3'],
			[2, 0, 'A', 'B', 'C'],
			[3, 1, 'a', 'b', 'c'],
		]);
	});
});

describe('Test Google Sheets, removeEmptyRows', () => {
	it('should removeEmptyRows without row numbers', () => {
		const data = [
			['id', 'col1', 'col2', 'col3'],
			[0, 'A', 'B', 'C'],
			['', '', '', ''],
			[2, 'd', 'e', 'f'],
			['', '', '', ''],
		];

		const result = removeEmptyRows(data, false);

		expect(result).toBeDefined();
		expect(result).toEqual([
			['id', 'col1', 'col2', 'col3'],
			[0, 'A', 'B', 'C'],
			[2, 'd', 'e', 'f'],
		]);
	});
	it('should removeEmptyRows with row numbers', () => {
		const data = [
			['row_number', 'id', 'col1', 'col2', 'col3'],
			[2, 0, 'A', 'B', 'C'],
			[3, 1, 'a', 'b', 'c'],
			[4, '', '', '', ''],
			[5, 3, 'g', 'h', 'i'],
		];

		const result = removeEmptyRows(data);

		expect(result).toBeDefined();
		expect(result).toEqual([
			['row_number', 'id', 'col1', 'col2', 'col3'],
			[2, 0, 'A', 'B', 'C'],
			[3, 1, 'a', 'b', 'c'],
			[5, 3, 'g', 'h', 'i'],
		]);
	});
});

describe('Test Google Sheets, trimLeadingEmptyRows', () => {
	it('should trimLeadingEmptyRows without row numbers', () => {
		const data = [
			['', '', '', ''],
			['', '', '', ''],
			[2, 'd', 'e', 'f'],
			['', '', '', ''],
		];

		const result = trimLeadingEmptyRows(data, false);

		expect(result).toBeDefined();
		expect(result).toEqual([
			[2, 'd', 'e', 'f'],
			['', '', '', ''],
		]);
	});
	it('should trimLeadingEmptyRows with row numbers', () => {
		const data = [
			[1, '', '', '', ''],
			['row_number', 'id', 'col1', 'col2', 'col3'],
			[2, 0, 'A', 'B', 'C'],
			[3, 1, 'a', 'b', 'c'],
			[5, 3, 'g', 'h', 'i'],
		];

		const result = trimLeadingEmptyRows(data, true);

		expect(result).toBeDefined();
		expect(result).toEqual([
			['row_number', 'id', 'col1', 'col2', 'col3'],
			[2, 0, 'A', 'B', 'C'],
			[3, 1, 'a', 'b', 'c'],
			[5, 3, 'g', 'h', 'i'],
		]);
	});
});

describe('Test Google Sheets, removeEmptyColumns', () => {
	it('should removeEmptyColumns without row numbers', () => {
		const data = [
			['id', 'col1', '', 'col3'],
			[0, 'A', '', 'C'],
			[1, 'a', '', 'c'],
			[2, 'd', '', 'f'],
			[3, 'g', '', 'i'],
		];

		const result = removeEmptyColumns(data);

		expect(result).toBeDefined();
		expect(result).toEqual([
			['id', 'col1', 'col3'],
			[0, 'A', 'C'],
			[1, 'a', 'c'],
			[2, 'd', 'f'],
			[3, 'g', 'i'],
		]);
	});
});

describe('Test Google Sheets, prepareSheetData', () => {
	it('should prepareSheetData without row numbers', () => {
		const data = [
			['id', 'col1', 'col2', 'col3'],
			[1, 'A', 'B', 'C'],
			['', '', '', ''],
			[2, 'd', 'e', 'f'],
			['', '', '', ''],
		];

		const result = prepareSheetData(data, { rangeDefinition: 'detectAutomatically' }, true);

		expect(result).toBeDefined();
		expect(result).toEqual({
			data: [
				['row_number', 'id', 'col1', 'col2', 'col3'],
				[2, 1, 'A', 'B', 'C'],
				[4, 2, 'd', 'e', 'f'],
			],
			firstDataRow: 1,
			headerRow: 0,
		});
	});
});

describe('Test Google Sheets, autoMapInputData', () => {
	it('should autoMapInputData', async () => {
		const node: INode = {
			id: '1',
			name: 'Postgres node',
			typeVersion: 2,
			type: 'n8n-nodes-base.postgres',
			position: [60, 760],
			parameters: {
				operation: 'executeQuery',
			},
		};

		const items = [
			{
				json: {
					id: 1,
					name: 'Jon',
					data: 'A',
				},
			},
			{
				json: {
					id: 2,
					name: 'Sam',
					data: 'B',
				},
			},
			{
				json: {
					id: 3,
					name: 'Ron',
					data: 'C',
					info: 'some info',
				},
			},
		];

		const fakeExecuteFunction = {
			getNode() {
				return node;
			},
		} as unknown as IExecuteFunctions;

		const getData = (GoogleSheet.prototype.getData = jest.fn().mockResolvedValue([[]]));

		const updateRows = (GoogleSheet.prototype.updateRows = jest.fn().mockResolvedValue(true));

		const googleSheet = new GoogleSheet('spreadsheetId', fakeExecuteFunction);

		const result = await autoMapInputData.call(
			fakeExecuteFunction,
			'foo 1',
			googleSheet,
			items,
			{},
		);

		expect(getData).toHaveBeenCalledTimes(1);
		expect(getData).toHaveBeenCalledWith('foo 1!1:1', 'FORMATTED_VALUE');

		expect(updateRows).toHaveBeenCalledTimes(2);
		expect(updateRows).toHaveBeenCalledWith('foo 1', [['id', 'name', 'data']], 'RAW', 1);
		expect(updateRows).toHaveBeenCalledWith('foo 1', [['id', 'name', 'data', 'info']], 'RAW', 1);

		expect(result).toBeDefined();
		expect(result).toEqual([
			{
				id: 1,
				name: 'Jon',
				data: 'A',
			},
			{
				id: 2,
				name: 'Sam',
				data: 'B',
			},
			{
				id: 3,
				name: 'Ron',
				data: 'C',
				info: 'some info',
			},
		]);
	});
});

describe('Test Google Sheets, lookupValues', () => {
	const inputData = [
		['row_number', 'id', 'num', 'text'],
		[2, 1, '111', 'bar'],
		[3, 3, 1, 'bar'],
		[4, 4, 1, 'baz'],
		[5, 5, 1, 'baz'],
		[6, 6, 66, 'foo'],
		[7, 7, 77, 'foo'],
	] as string[][];

	it('should return rows by combining filters by OR', async () => {
		const fakeExecuteFunction = {
			getNode() {
				return {};
			},
		} as unknown as IExecuteFunctions;

		const googleSheet = new GoogleSheet('spreadsheetId', fakeExecuteFunction);

		const result = await googleSheet.lookupValues({
			inputData,
			keyRowIndex: 0,
			dataStartRowIndex: 1,
			lookupValues: [
				{
					lookupColumn: 'num',
					lookupValue: '1',
				},
				{
					lookupColumn: 'text',
					lookupValue: 'foo',
				},
			],
			returnAllMatches: true,
			combineFilters: 'OR',
			nodeVersion: 4.5,
		});

		expect(result).toBeDefined();
		expect(result).toEqual([
			{
				row_number: 3,
				id: 3,
				num: 1,
				text: 'bar',
			},
			{
				row_number: 4,
				id: 4,
				num: 1,
				text: 'baz',
			},
			{
				row_number: 5,
				id: 5,
				num: 1,
				text: 'baz',
			},
			{
				row_number: 6,
				id: 6,
				num: 66,
				text: 'foo',
			},
			{
				row_number: 7,
				id: 7,
				num: 77,
				text: 'foo',
			},
		]);
	});

	it('should return rows by combining filters by AND', async () => {
		const fakeExecuteFunction = {
			getNode() {
				return {};
			},
		} as unknown as IExecuteFunctions;

		const googleSheet = new GoogleSheet('spreadsheetId', fakeExecuteFunction);

		const result = await googleSheet.lookupValues({
			inputData,
			keyRowIndex: 0,
			dataStartRowIndex: 1,
			lookupValues: [
				{
					lookupColumn: 'num',
					lookupValue: '1',
				},
				{
					lookupColumn: 'text',
					lookupValue: 'baz',
				},
			],
			returnAllMatches: true,
			combineFilters: 'AND',
			nodeVersion: 4.5,
		});

		expect(result).toBeDefined();
		expect(result).toEqual([
			{
				row_number: 4,
				id: 4,
				num: 1,
				text: 'baz',
			},
			{
				row_number: 5,
				id: 5,
				num: 1,
				text: 'baz',
			},
		]);
	});
});

describe('Test Google Sheets, checkForSchemaChanges', () => {
	it('should not to throw error', async () => {
		const node: INode = {
			id: '1',
			name: 'Google Sheets',
			typeVersion: 4.4,
			type: 'n8n-nodes-base.googleSheets',
			position: [60, 760],
			parameters: {
				operation: 'append',
			},
		};

		expect(() =>
			checkForSchemaChanges(node, ['id', 'name', 'data'], [
				{ id: 'id' },
				{ id: 'name' },
				{ id: 'data' },
			] as ResourceMapperField[]),
		).not.toThrow();
	});
	it('should throw error when columns were renamed', async () => {
		const node: INode = {
			id: '1',
			name: 'Google Sheets',
			typeVersion: 4.4,
			type: 'n8n-nodes-base.googleSheets',
			position: [60, 760],
			parameters: {
				operation: 'append',
			},
		};

		expect(() =>
			checkForSchemaChanges(node, ['id', 'name', 'data'], [
				{ id: 'id' },
				{ id: 'name' },
				{ id: 'text' },
			] as ResourceMapperField[]),
		).toThrow("Column names were updated after the node's setup");
	});

	it('should filter out empty columns  without throwing an error', async () => {
		const node: INode = {
			id: '1',
			name: 'Google Sheets',
			typeVersion: 4.4,
			type: 'n8n-nodes-base.googleSheets',
			position: [60, 760],
			parameters: {
				operation: 'append',
			},
		};

		expect(() =>
			checkForSchemaChanges(node, ['', '', 'id', 'name', 'data'], [
				{ id: 'id' },
				{ id: 'name' },
				{ id: 'data' },
			] as ResourceMapperField[]),
		).not.toThrow();
	});
});

describe('Test Google Sheets, getSpreadsheetId', () => {
	let mockNode: INode;

	beforeEach(() => {
		mockNode = { name: 'Google Sheets' } as INode;
		jest.clearAllMocks();
	});

	it('should throw an error if value is empty', () => {
		expect(() => getSpreadsheetId(mockNode, 'url', '')).toThrow(NodeOperationError);
	});

	it('should return the ID from a valid URL', () => {
		const url =
			'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
		const result = getSpreadsheetId(mockNode, 'url', url);
		expect(result).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
	});

	it('should return an empty string for an invalid URL', () => {
		const url = 'https://docs.google.com/spreadsheets/d/';
		const result = getSpreadsheetId(mockNode, 'url', url);
		expect(result).toBe('');
	});

	it('should return the value for documentIdType byId or byList', () => {
		const value = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
		expect(getSpreadsheetId(mockNode, 'id', value)).toBe(value);
		expect(getSpreadsheetId(mockNode, 'list', value)).toBe(value);
	});
});

describe('Test Google Sheets, Google Sheets Sheet URL Regex', () => {
	const regex = new RegExp(GOOGLE_SHEETS_SHEET_URL_REGEX);

	it('should match a valid Google Sheets URL', () => {
		const urls = [
			'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0',
			'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=123456',
			'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?gid=654321#gid=654321',
		];
		for (const url of urls) {
			expect(regex.test(url)).toBe(true);
		}
	});

	it('should not match an invalid Google Sheets URL', () => {
		const url = 'https://docs.google.com/spreadsheets/d/';
		expect(regex.test(url)).toBe(false);
	});

	it('should not match a URL that does not match the pattern', () => {
		const url =
			'https://example.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
		expect(regex.test(url)).toBe(false);
	});

	it('should extract the gid from a valid Google Sheets URL', () => {
		const urls = [
			'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=12345',
			'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?gid=12345#gid=12345',
		];
		for (const url of urls) {
			const match = url.match(regex);
			expect(match).not.toBeNull();
			expect(match?.[1]).toBe('12345');
		}
	});
});

describe('Test Google Sheets, getColumnNumber', () => {
	it('should return the correct number for single-letter columns', () => {
		expect(getColumnNumber('A')).toBe(1);
		expect(getColumnNumber('Z')).toBe(26);
	});

	it('should return the correct number for multi-letter columns', () => {
		expect(getColumnNumber('AA')).toBe(27);
		expect(getColumnNumber('AZ')).toBe(52);
		expect(getColumnNumber('BA')).toBe(53);
		expect(getColumnNumber('ZZ')).toBe(702);
		expect(getColumnNumber('AAA')).toBe(703);
	});
});

describe('Test Google Sheets, hexToRgb', () => {
	it('should correctly convert a full hex code to RGB', () => {
		expect(hexToRgb('#0033FF')).toEqual({ red: 0, green: 51, blue: 255 });
		expect(hexToRgb('#FF5733')).toEqual({ red: 255, green: 87, blue: 51 });
	});

	it('should correctly convert a shorthand hex code to RGB', () => {
		expect(hexToRgb('#03F')).toEqual({ red: 0, green: 51, blue: 255 });
		expect(hexToRgb('#F00')).toEqual({ red: 255, green: 0, blue: 0 });
	});

	it('should return null for invalid hex codes', () => {
		expect(hexToRgb('#XYZ123')).toBeNull(); // Invalid characters
		expect(hexToRgb('#12345')).toBeNull(); // Incorrect length
		expect(hexToRgb('')).toBeNull(); // Empty input
		expect(hexToRgb('#')).toBeNull(); // Just a hash
	});
});

describe('Test Google Sheets, getRangeString', () => {
	it('should return the range in A1 notation when "specifyRangeA1" is set', () => {
		const result = getRangeString('Sheet1', { rangeDefinition: 'specifyRangeA1', range: 'A1:B2' });
		expect(result).toBe('Sheet1!A1:B2');
	});

	it('should return only the sheet name if no range is specified', () => {
		const result = getRangeString('Sheet1', { rangeDefinition: 'specifyRangeA1', range: '' });
		expect(result).toBe('Sheet1');
	});

	it('should return only the sheet name if rangeDefinition is not "specifyRangeA1"', () => {
		const result = getRangeString('Sheet1', { rangeDefinition: 'detectAutomatically' });
		expect(result).toBe('Sheet1');
	});
});

describe('Test Google Sheets, getExistingSheetNames', () => {
	const mockGoogleSheetInstance: Partial<GoogleSheet> = {
		spreadsheetGetSheets: jest.fn(),
	};
	it('should return an array of sheet names', async () => {
		mockGoogleSheetInstance.spreadsheetGetSheets = jest.fn().mockResolvedValue({
			sheets: [{ properties: { title: 'Sheet1' } }, { properties: { title: 'Sheet2' } }],
		});
		const result = await getExistingSheetNames(mockGoogleSheetInstance as GoogleSheet);
		expect(result).toEqual(['Sheet1', 'Sheet2']);
	});

	it('should return an empty array if no sheets are present', async () => {
		mockGoogleSheetInstance.spreadsheetGetSheets = jest.fn().mockResolvedValue({ sheets: [] });
		const result = await getExistingSheetNames(mockGoogleSheetInstance as GoogleSheet);
		expect(result).toEqual([]);
	});

	it('should handle a case where sheets are undefined', async () => {
		mockGoogleSheetInstance.spreadsheetGetSheets = jest.fn().mockResolvedValue({});
		const result = await getExistingSheetNames(mockGoogleSheetInstance as GoogleSheet);
		expect(result).toEqual([]);
	});
});

describe('Test Google Sheets, mapFields', () => {
	const fakeExecuteFunction: Partial<IExecuteFunctions> = {};

	beforeEach(() => {
		fakeExecuteFunction.getNode = jest.fn();
		fakeExecuteFunction.getNodeParameter = jest.fn();
	});

	it('should map fields for node version < 4', () => {
		fakeExecuteFunction.getNode = jest.fn().mockReturnValue({ typeVersion: 3 });
		fakeExecuteFunction.getNodeParameter = jest.fn().mockImplementation((_, i) => [
			{ fieldId: 'field1', fieldValue: `value${i}` },
			{ fieldId: 'field2', fieldValue: `value${i * 2}` },
		]);

		const result = mapFields.call(fakeExecuteFunction as IExecuteFunctions, 2);
		expect(result).toEqual([
			{ field1: 'value0', field2: 'value0' },
			{ field1: 'value1', field2: 'value2' },
		]);
		expect(fakeExecuteFunction.getNodeParameter).toHaveBeenCalledTimes(2);
		expect(fakeExecuteFunction.getNodeParameter).toHaveBeenCalledWith(
			'fieldsUi.fieldValues',
			0,
			[],
		);
	});

	it('should map columns for node version >= 4', () => {
		fakeExecuteFunction.getNode = jest.fn().mockReturnValue({ typeVersion: 4 });
		fakeExecuteFunction.getNodeParameter = jest.fn().mockImplementation((_, i) => ({
			column1: `value${i}`,
			column2: `value${i * 2}`,
		}));

		const result = mapFields.call(fakeExecuteFunction as IExecuteFunctions, 2);
		expect(result).toEqual([
			{ column1: 'value0', column2: 'value0' },
			{ column1: 'value1', column2: 'value2' },
		]);
		expect(fakeExecuteFunction.getNodeParameter).toHaveBeenCalledTimes(2);
		expect(fakeExecuteFunction.getNodeParameter).toHaveBeenCalledWith('columns.value', 0);
	});

	it('should throw an error if no values are added in version >= 4', () => {
		fakeExecuteFunction.getNode = jest.fn().mockReturnValue({ typeVersion: 4 });
		fakeExecuteFunction.getNodeParameter = jest.fn().mockReturnValue({});

		expect(() => mapFields.call(fakeExecuteFunction as IExecuteFunctions, 1)).toThrow(
			"At least one value has to be added under 'Values to Send'",
		);
	});

	it('should return an empty array when inputSize is 0', () => {
		const result = mapFields.call(fakeExecuteFunction as IExecuteFunctions, 0);
		expect(result).toEqual([]);
	});
});

describe('Test Google Sheets, getSheetId', () => {
	it('should return 0 when value is "gid=0"', () => {
		expect(getSheetId('gid=0')).toBe(0);
	});

	it('should return a parsed integer when value is a numeric string', () => {
		expect(getSheetId('123')).toBe(123);
		expect(getSheetId('456')).toBe(456);
	});

	it('should return NaN for non-numeric strings', () => {
		expect(getSheetId('abc')).toBeNaN();
		expect(getSheetId('gid=abc')).toBeNaN();
	});
});

describe('Test Google Sheets, getColumnName', () => {
	it('should return "A" for column number 1', () => {
		expect(getColumnName(1)).toBe('A');
	});

	it('should return "Z" for column number 26', () => {
		expect(getColumnName(26)).toBe('Z');
	});

	it('should return "AA" for column number 27', () => {
		expect(getColumnName(27)).toBe('AA');
	});

	it('should return "AZ" for column number 52', () => {
		expect(getColumnName(52)).toBe('AZ');
	});

	it('should return "BA" for column number 53', () => {
		expect(getColumnName(53)).toBe('BA');
	});

	it('should return "ZZ" for column number 702', () => {
		expect(getColumnName(702)).toBe('ZZ');
	});

	it('should return "AAA" for column number 703', () => {
		expect(getColumnName(703)).toBe('AAA');
	});
});
