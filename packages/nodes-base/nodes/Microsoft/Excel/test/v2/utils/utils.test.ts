import { get } from 'lodash';
import type { IDataObject, IExecuteFunctions, IGetNodeParameterOptions, INode } from 'n8n-workflow';
import {
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
		getNodeParameter(
			parameterName: string,
			itemIndex: number,
			fallbackValue?: IDataObject | undefined,
			options?: IGetNodeParameterOptions | undefined,
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
	it('should return empty array', () => {
		const output = prepareOutput(node, { values: [] }, { rawData: false });
		expect(output).toBeDefined();
		expect(output).toEqual([]);
	});

	it('should return raw response', () => {
		const output = prepareOutput(node, responseData, { rawData: true });
		expect(output).toBeDefined();
		expect(output[0].json.data).toEqual(responseData);
	});

	it('should return raw response in custom property', () => {
		const customKey = 'customKey';
		const output = prepareOutput(node, responseData, { rawData: true, dataProperty: customKey });
		expect(output).toBeDefined();
		expect(output[0].json.customKey).toEqual(responseData);
	});

	it('should return formated response', () => {
		const output = prepareOutput(node, responseData, { rawData: false });
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
		const output = prepareOutput(node, responseData, { rawData: false, firstDataRow: 3 });
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
		const output = prepareOutput(node, response, { rawData: false, keyRow: 3, firstDataRow: 0 });
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

	it('should update all occurances', () => {
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
