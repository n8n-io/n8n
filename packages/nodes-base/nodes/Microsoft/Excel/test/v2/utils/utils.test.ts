import { mock } from 'jest-mock-extended';
import get from 'lodash/get';
import { constructExecutionMetaData } from 'n8n-core';
import type { IDataObject, IExecuteFunctions, IGetNodeParameterOptions, INode } from 'n8n-workflow';

import {
	checkRange,
	findAppendRange,
	nextExcelColumn,
	parseAddress,
	prepareOutput,
	updateByAutoMaping,
	updateByDefinedValues,
} from '../../../v2/helpers/utils';

const node: INode = {
	id: '1',
	name: 'Microsoft Excel 365',
	typeVersion: 2,
	type: 'n8n-nodes-base.microsoftExcel',
	position: [60, 760],
	parameters: {},
};

const fakeExecute = (nodeParameters: IDataObject[]) => {
	const fakeExecuteFunction = {
		getInputData() {
			return [{ json: {} }];
		},
		getNodeParameter(
			parameterName: string,
			itemIndex: number,
			fallbackValue?: IDataObject,
			options?: IGetNodeParameterOptions,
		) {
			const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
			return get(nodeParameters[itemIndex], parameter, fallbackValue);
		},
	} as unknown as IExecuteFunctions;
	return fakeExecuteFunction;
};

const responseData = {
	address: 'Sheet4!A1:D4',
	addressLocal: 'Sheet4!A1:D4',
	columnCount: 4,
	cellCount: 16,
	columnHidden: false,
	rowHidden: false,
	numberFormat: [
		['General', 'General', 'General', 'General'],
		['General', 'General', 'General', 'General'],
		['General', 'General', 'General', 'General'],
		['General', 'General', 'General', 'General'],
	],
	columnIndex: 0,
	text: [
		['id', 'name', 'age', 'data'],
		['1', 'Sam', '33', 'data 1'],
		['2', 'Jon', '44', 'data 2'],
		['3', 'Ron', '55', 'data 3'],
	],
	formulas: [
		['id', 'name', 'age', 'data'],
		[1, 'Sam', 33, 'data 1'],
		[2, 'Jon', 44, 'data 2'],
		[3, 'Ron', 55, 'data 3'],
	],
	formulasLocal: [
		['id', 'name', 'age', 'data'],
		[1, 'Sam', 33, 'data 1'],
		[2, 'Jon', 44, 'data 2'],
		[3, 'Ron', 55, 'data 3'],
	],
	formulasR1C1: [
		['id', 'name', 'age', 'data'],
		[1, 'Sam', 33, 'data 1'],
		[2, 'Jon', 44, 'data 2'],
		[3, 'Ron', 55, 'data 3'],
	],
	hidden: false,
	rowCount: 4,
	rowIndex: 0,
	valueTypes: [
		['String', 'String', 'String', 'String'],
		['Double', 'String', 'Double', 'String'],
		['Double', 'String', 'Double', 'String'],
		['Double', 'String', 'Double', 'String'],
	],
	values: [
		['id', 'name', 'age', 'data'],
		[1, 'Sam', 33, 'data 1'],
		[2, 'Jon', 44, 'data 2'],
		[3, 'Ron', 55, 'data 3'],
	],
};

describe('Test MicrosoftExcelV2, prepareOutput', () => {
	const thisArg = mock<IExecuteFunctions>({
		helpers: mock({ constructExecutionMetaData }),
		getInputData() {
			return [{ json: {} }];
		},
	});

	it('should return empty array', () => {
		const output = prepareOutput.call(thisArg, node, { values: [] }, { rawData: false });
		expect(output).toBeDefined();
		expect(output).toEqual([]);
	});

	it('should return raw response', () => {
		const output = prepareOutput.call(thisArg, node, responseData, { rawData: true });
		expect(output).toBeDefined();
		expect(output[0].json.data).toEqual(responseData);
	});

	it('should return raw response in custom property', () => {
		const customKey = 'customKey';
		const output = prepareOutput.call(thisArg, node, responseData, {
			rawData: true,
			dataProperty: customKey,
		});
		expect(output).toBeDefined();
		expect(output[0].json.customKey).toEqual(responseData);
	});

	it('should return formated response', () => {
		const output = prepareOutput.call(thisArg, node, responseData, { rawData: false });
		expect(output).toBeDefined();
		expect(output.length).toEqual(3);
		expect(output[0].json).toEqual({
			id: 1,
			name: 'Sam',
			age: 33,
			data: 'data 1',
		});
	});

	it('should return response with selected first data row', () => {
		const output = prepareOutput.call(thisArg, node, responseData, {
			rawData: false,
			firstDataRow: 3,
		});
		expect(output).toBeDefined();
		expect(output.length).toEqual(1);
		expect(output[0].json).toEqual({
			id: 3,
			name: 'Ron',
			age: 55,
			data: 'data 3',
		});
	});

	it('should return response with selected first data row', () => {
		const [firstRow, ...rest] = responseData.values;
		const response = { values: [...rest, firstRow] };
		const output = prepareOutput.call(thisArg, node, response, {
			rawData: false,
			keyRow: 3,
			firstDataRow: 0,
		});
		expect(output).toBeDefined();
		expect(output.length).toEqual(3);
		expect(output[0].json).toEqual({
			id: 1,
			name: 'Sam',
			age: 33,
			data: 'data 1',
		});
	});
});

describe('Test MicrosoftExcelV2, updateByDefinedValues', () => {
	it('should update single row', () => {
		const nodeParameters = [
			{
				columnToMatchOn: 'id',
				valueToMatchOn: 2,
				fieldsUi: {
					values: [
						{
							column: 'name',
							fieldValue: 'Donald',
						},
					],
				},
			},
		];

		const sheetData = responseData.values;

		const updateSummary = updateByDefinedValues.call(
			fakeExecute(nodeParameters),
			nodeParameters.length,
			sheetData,
			false,
		);

		expect(updateSummary).toBeDefined();
		expect(updateSummary.updatedRows).toContain(0); //header row
		expect(updateSummary.updatedRows).toContain(2); //updated row
		expect(updateSummary.updatedRows).toHaveLength(2);
		expect(updateSummary.updatedData[2][1]).toEqual('Donald'); // updated value
	});

	it('should update multiple rows', () => {
		const nodeParameters = [
			{
				columnToMatchOn: 'id',
				valueToMatchOn: 2,
				fieldsUi: {
					values: [
						{
							column: 'name',
							fieldValue: 'Donald',
						},
					],
				},
			},
			{
				columnToMatchOn: 'id',
				valueToMatchOn: 3,
				fieldsUi: {
					values: [
						{
							column: 'name',
							fieldValue: 'Eduard',
						},
					],
				},
			},
			{
				columnToMatchOn: 'id',
				valueToMatchOn: 4,
				fieldsUi: {
					values: [
						{
							column: 'name',
							fieldValue: 'Ismael',
						},
					],
				},
			},
		];

		const sheetData = [
			['id', 'name', 'age', 'data'],
			[1, 'Sam', 33, 'data 1'],
			[2, 'Jon', 44, 'data 2'],
			[3, 'Ron', 55, 'data 3'],
			[4, 'Ron', 55, 'data 3'],
		];

		const updateSummary = updateByDefinedValues.call(
			fakeExecute(nodeParameters),
			nodeParameters.length,
			sheetData,
			false,
		);

		expect(updateSummary).toBeDefined();
		expect(updateSummary.updatedRows).toContain(0); //header row
		expect(updateSummary.updatedRows).toContain(2); //updated row
		expect(updateSummary.updatedRows).toContain(3); //updated row
		expect(updateSummary.updatedRows).toContain(4); //updated row
		expect(updateSummary.updatedRows).toHaveLength(4);
		expect(updateSummary.updatedData[2][1]).toEqual('Donald'); // updated value
		expect(updateSummary.updatedData[3][1]).toEqual('Eduard'); // updated value
		expect(updateSummary.updatedData[4][1]).toEqual('Ismael'); // updated value
	});

	it('should update all occurances', () => {
		const nodeParameters = [
			{
				columnToMatchOn: 'data',
				valueToMatchOn: 'data 3',
				fieldsUi: {
					values: [
						{
							column: 'name',
							fieldValue: 'Donald',
						},
					],
				},
			},
		];

		const sheetData = [
			['id', 'name', 'age', 'data'],
			[1, 'Sam', 55, 'data 3'],
			[2, 'Jon', 77, 'data 3'],
			[3, 'Ron', 44, 'data 3'],
			[4, 'Ron', 33, 'data 3'],
		];

		const updateSummary = updateByDefinedValues.call(
			fakeExecute(nodeParameters),
			nodeParameters.length,
			sheetData,
			true,
		);

		expect(updateSummary).toBeDefined();
		expect(updateSummary.updatedRows).toContain(0); //header row
		expect(updateSummary.updatedRows).toHaveLength(5);

		for (let i = 1; i < updateSummary.updatedRows.length; i++) {
			expect(updateSummary.updatedData[i][1]).toEqual('Donald'); // updated value
		}
	});

	it('should append rows', () => {
		const nodeParameters = [
			{
				columnToMatchOn: 'id',
				valueToMatchOn: 4,
				fieldsUi: {
					values: [
						{
							column: 'name',
							fieldValue: 'Donald',
						},
						{
							column: 'age',
							fieldValue: 45,
						},
						{
							column: 'data',
							fieldValue: 'data 4',
						},
					],
				},
			},
			{
				columnToMatchOn: 'id',
				valueToMatchOn: 5,
				fieldsUi: {
					values: [
						{
							column: 'name',
							fieldValue: 'Victor',
						},
						{
							column: 'age',
							fieldValue: 67,
						},
						{
							column: 'data',
							fieldValue: 'data 5',
						},
					],
				},
			},
		];

		const sheetData = [
			['id', 'name', 'age', 'data'],
			[1, 'Sam', 55, 'data 3'],
			[2, 'Jon', 77, 'data 3'],
			[3, 'Ron', 44, 'data 3'],
		];

		const updateSummary = updateByDefinedValues.call(
			fakeExecute(nodeParameters),
			nodeParameters.length,
			sheetData,
			true,
		);

		expect(updateSummary).toBeDefined();
		expect(updateSummary.updatedRows).toContain(0);
		expect(updateSummary.updatedRows.length).toEqual(1);
		expect(updateSummary.appendData[0]).toEqual({ id: 4, name: 'Donald', age: 45, data: 'data 4' });
		expect(updateSummary.appendData[1]).toEqual({ id: 5, name: 'Victor', age: 67, data: 'data 5' });
	});
});

describe('Test MicrosoftExcelV2, updateByAutoMaping', () => {
	it('should update single row', () => {
		const items = [
			{
				json: {
					id: 2,
					name: 'Donald',
				},
			},
		];

		const sheetData = [
			['id', 'name', 'age', 'data'],
			[1, 'Sam', 33, 'data 1'],
			[2, 'Jon', 44, 'data 2'],
			[3, 'Ron', 55, 'data 3'],
		];

		const updateSummary = updateByAutoMaping(items, sheetData, 'id');

		expect(updateSummary).toBeDefined();
		expect(updateSummary.updatedRows).toHaveLength(2);
		expect(updateSummary.updatedRows).toContain(0); //header row
		expect(updateSummary.updatedRows).toContain(2); //updated row
		expect(updateSummary.updatedData[2][1]).toEqual('Donald'); // updated value
	});

	it('should append single row', () => {
		const items = [
			{
				json: {
					id: 5,
					name: 'Donald',
				},
			},
		];

		const sheetData = [
			['id', 'name', 'age', 'data'],
			[1, 'Sam', 33, 'data 1'],
			[2, 'Jon', 44, 'data 2'],
			[3, 'Ron', 55, 'data 3'],
		];

		const updateSummary = updateByAutoMaping(items, sheetData, 'id');

		expect(updateSummary).toBeDefined();
		expect(updateSummary.updatedRows).toHaveLength(1);
		expect(updateSummary.updatedRows).toContain(0); //header row
		expect(updateSummary.appendData[0]).toEqual({ id: 5, name: 'Donald' });
	});

	it('should append skip row with match column undefined', () => {
		const items = [
			{
				json: {
					id: 5,
					name: 'Donald',
				},
			},
		];

		const sheetData = [
			['id', 'name', 'age', 'data'],
			[1, 'Sam', 33, 'data 1'],
			[2, 'Jon', 44, 'data 2'],
			[3, 'Ron', 55, 'data 3'],
		];

		const updateSummary = updateByAutoMaping(items, sheetData, 'idd');

		expect(updateSummary).toBeDefined();
		expect(updateSummary.updatedRows).toHaveLength(1);
		expect(updateSummary.updatedRows).toContain(0); //header row
		expect(updateSummary.appendData.length).toEqual(0);
	});

	it('should update multiple rows', () => {
		const items = [
			{
				json: {
					id: 2,
					name: 'Donald',
				},
			},
			{
				json: {
					id: 3,
					name: 'Eduard',
				},
			},
			{
				json: {
					id: 4,
					name: 'Ismael',
				},
			},
		];

		const sheetData = [
			['id', 'name', 'age', 'data'],
			[1, 'Sam', 33, 'data 1'],
			[2, 'Jon', 44, 'data 2'],
			[3, 'Ron', 55, 'data 3'],
			[4, 'Ron', 55, 'data 3'],
		];

		const updateSummary = updateByAutoMaping(items, sheetData, 'id');

		expect(updateSummary).toBeDefined();
		expect(updateSummary.updatedRows).toContain(0); //header row
		expect(updateSummary.updatedRows).toContain(2); //updated row
		expect(updateSummary.updatedRows).toContain(3); //updated row
		expect(updateSummary.updatedRows).toContain(4); //updated row
		expect(updateSummary.updatedRows).toHaveLength(4);
		expect(updateSummary.updatedData[2][1]).toEqual('Donald'); // updated value
		expect(updateSummary.updatedData[3][1]).toEqual('Eduard'); // updated value
		expect(updateSummary.updatedData[4][1]).toEqual('Ismael'); // updated value
	});

	it('should update all occurrences', () => {
		const items = [
			{
				json: {
					data: 'data 3',
					name: 'Donald',
				},
			},
		];

		const sheetData = [
			['id', 'name', 'age', 'data'],
			[1, 'Sam', 55, 'data 3'],
			[2, 'Jon', 77, 'data 3'],
			[3, 'Ron', 44, 'data 3'],
			[4, 'Ron', 33, 'data 3'],
		];

		const updateSummary = updateByAutoMaping(items, sheetData, 'data', true);

		expect(updateSummary).toBeDefined();
		expect(updateSummary.updatedRows).toContain(0); //header row
		expect(updateSummary.updatedRows).toHaveLength(5);

		for (let i = 1; i < updateSummary.updatedRows.length; i++) {
			expect(updateSummary.updatedData[i][1]).toEqual('Donald'); // updated value
		}
	});

	it('should append rows', () => {
		const items = [
			{
				json: {
					id: 4,
					data: 'data 4',
					name: 'Donald',
					age: 45,
				},
			},
			{
				json: {
					id: 5,
					data: 'data 5',
					name: 'Victor',
					age: 67,
				},
			},
		];

		const sheetData = [
			['id', 'name', 'age', 'data'],
			[1, 'Sam', 55, 'data 3'],
			[2, 'Jon', 77, 'data 3'],
			[3, 'Ron', 44, 'data 3'],
		];

		const updateSummary = updateByAutoMaping(items, sheetData, 'data', true);

		expect(updateSummary).toBeDefined();
		expect(updateSummary.updatedRows).toContain(0);
		expect(updateSummary.updatedRows.length).toEqual(1);
		expect(updateSummary.appendData[0]).toEqual({ id: 4, name: 'Donald', age: 45, data: 'data 4' });
		expect(updateSummary.appendData[1]).toEqual({ id: 5, name: 'Victor', age: 67, data: 'data 5' });
	});
});

describe('Test MicrosoftExcelV2, checkRange', () => {
	it('should not throw error', () => {
		const range = 'A1:D4';
		expect(() => {
			checkRange(node, range);
		}).not.toThrow();
	});

	it('should throw error', () => {
		const range = 'A:D';
		expect(() => {
			checkRange(node, range);
		}).toThrow();
	});
});

describe('Test MicrosoftExcelV2, findAppendRange', () => {
	it('should find append range for empty table', () => {
		const address = 'A1';
		const cols = 2;
		const rows = 3;
		const result = findAppendRange(address, { cols, rows });
		expect(result).toBe('A1:B3');
	});

	it('should find append range for filled table', () => {
		const address = 'A1:B2';
		const cols = 2;
		const rows = 2;
		const result = findAppendRange(address, { cols, rows });
		expect(result).toBe('A3:B4');
	});

	it('should find append range with additional columns for filled table', () => {
		const address = 'A1:B2';
		const cols = 3;
		const rows = 2;
		const result = findAppendRange(address, { cols, rows });
		expect(result).toBe('A3:C4');
	});
});

describe('Test MicrosoftExcelV2, nextExcelColumn', () => {
	it('should return same column with offset 0', () => {
		const result = nextExcelColumn('A', 0);
		expect(result).toBe('A');
	});

	it('should return next column with default offset', () => {
		const result = nextExcelColumn('A');
		expect(result).toBe('B');
	});

	it('should return next column with offset 2', () => {
		const result = nextExcelColumn('A', 2);
		expect(result).toBe('C');
	});

	it('should handle Z to AA transition', () => {
		const result = nextExcelColumn('Z');
		expect(result).toBe('AA');
	});

	it('should handle AZ with offset 2', () => {
		const result = nextExcelColumn('AZ', 2);
		expect(result).toBe('BB');
	});

	it('should handle ZZ with offset 5', () => {
		const result = nextExcelColumn('ZZ', 5);
		expect(result).toBe('AAE');
	});

	it('should handle single letter columns', () => {
		expect(nextExcelColumn('B')).toBe('C');
		expect(nextExcelColumn('Y')).toBe('Z');
		expect(nextExcelColumn('M', 3)).toBe('P');
	});

	it('should handle double letter columns', () => {
		expect(nextExcelColumn('AA')).toBe('AB');
		expect(nextExcelColumn('AB')).toBe('AC');
		expect(nextExcelColumn('BA')).toBe('BB');
		expect(nextExcelColumn('AY')).toBe('AZ');
	});

	it('should handle triple letter columns', () => {
		expect(nextExcelColumn('AAA')).toBe('AAB');
		expect(nextExcelColumn('AAZ')).toBe('ABA');
		expect(nextExcelColumn('AZZ')).toBe('BAA');
	});

	it('should handle large offsets', () => {
		expect(nextExcelColumn('A', 25)).toBe('Z');
		expect(nextExcelColumn('A', 26)).toBe('AA');
		expect(nextExcelColumn('A', 27)).toBe('AB');
		expect(nextExcelColumn('A', 51)).toBe('AZ');
		expect(nextExcelColumn('A', 52)).toBe('BA');
	});

	it('should handle transitions at column boundaries', () => {
		expect(nextExcelColumn('Z', 1)).toBe('AA');
		expect(nextExcelColumn('Z', 2)).toBe('AB');
		expect(nextExcelColumn('AZ', 1)).toBe('BA');
		expect(nextExcelColumn('ZZ', 1)).toBe('AAA');
	});

	it('should handle very large columns', () => {
		expect(nextExcelColumn('XFD', 1)).toBe('XFE'); // XFD is Excel's last column
		expect(nextExcelColumn('ZZY', 1)).toBe('ZZZ');
	});

	it('should handle offset of 1 explicitly', () => {
		expect(nextExcelColumn('A', 1)).toBe('B');
		expect(nextExcelColumn('Z', 1)).toBe('AA');
		expect(nextExcelColumn('AA', 1)).toBe('AB');
	});

	it('should throw error for invalid offset', () => {
		expect(() => nextExcelColumn('A', -1)).toThrow('Invalid offset: -1');
	});

	it('should maintain column sequence continuity', () => {
		let current = 'A';
		const sequence = [current];

		for (let i = 0; i < 30; i++) {
			current = nextExcelColumn(current);
			sequence.push(current);
		}

		// Verify some key transitions in the sequence
		expect(sequence).toContain('Z');
		expect(sequence).toContain('AA');
		expect(sequence).toContain('AB');

		// Verify Z is followed by AA
		const zIndex = sequence.indexOf('Z');
		expect(sequence[zIndex + 1]).toBe('AA');
	});
});

describe('Test MicrosoftExcelV2, parseAddress', () => {
	it('should parse normal address', () => {
		const address = 'A1:B2';
		const result = parseAddress(address);
		expect(result.cellFrom.value).toBe('A1');
		expect(result.cellFrom.column).toBe('A');
		expect(result.cellFrom.row).toBe('1');
		expect(result.cellTo.value).toBe('B2');
		expect(result.cellTo.column).toBe('B');
		expect(result.cellTo.row).toBe('2');
	});

	it('should parse address with sheet name', () => {
		const address = 'Sheet1!A1:B2';
		const result = parseAddress(address);
		expect(result.cellFrom.value).toBe('A1');
		expect(result.cellFrom.column).toBe('A');
		expect(result.cellFrom.row).toBe('1');
		expect(result.cellTo.value).toBe('B2');
		expect(result.cellTo.column).toBe('B');
		expect(result.cellTo.row).toBe('2');
	});

	it('should parse address with double letter cell', () => {
		const address = 'A1:AA2';
		const result = parseAddress(address);
		expect(result.cellFrom.value).toBe('A1');
		expect(result.cellFrom.column).toBe('A');
		expect(result.cellFrom.row).toBe('1');

		expect(result.cellTo.value).toBe('AA2');
		expect(result.cellTo.column).toBe('AA');
		expect(result.cellTo.row).toBe('2');
	});
});
