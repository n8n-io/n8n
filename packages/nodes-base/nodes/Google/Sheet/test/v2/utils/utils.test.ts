import {
	NodeOperationError,
	type IExecuteFunctions,
	type INode,
	type ResourceMapperField,
} from 'n8n-workflow';

import { GoogleSheet } from '../../../v2/helpers/GoogleSheet';
import {
	addRowNumber,
	autoMapInputData,
	checkForSchemaChanges,
	getSpreadsheetId,
	prepareSheetData,
	removeEmptyColumns,
	removeEmptyRows,
	trimLeadingEmptyRows,
	trimToFirstEmptyRow,
} from '../../../v2/helpers/GoogleSheets.utils';

import { GOOGLE_SHEETS_SHEET_URL_REGEX } from '../../../../constants';

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
