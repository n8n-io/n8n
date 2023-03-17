import type { INode } from 'n8n-workflow';
import { prepareOutput } from '../../../v2/helpers/utils';

const node: INode = {
	id: '1',
	name: 'Microsoft Excel 365',
	typeVersion: 2,
	type: 'n8n-nodes-base.microsoftExcel',
	position: [60, 760],
	parameters: {},
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
