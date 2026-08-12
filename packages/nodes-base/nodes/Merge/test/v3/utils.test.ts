import type { IDataObject, INodeExecutionData, IPairedItemData } from 'n8n-workflow';

import { modifySelectQuery, rowToExecutionData } from '../../v3/helpers/utils';

describe('rowToExecutionData', () => {
	test('should return empty json and pairedItem when input is empty', () => {
		const input: IDataObject = {};
		const result = rowToExecutionData(input);
		expect(result).toEqual({ json: {}, pairedItem: [] });
	});

	test('should separate json properties and pairedItem properties', () => {
		const input: IDataObject = {
			key1: 'value1',
			key2: 42,
			pairedItem1: { item: 0, input: undefined } as IPairedItemData,
			pairedItem2: { item: 0, input: 1 } as IPairedItemData,
		};

		const expectedOutput: INodeExecutionData = {
			json: { key1: 'value1', key2: 42 },
			pairedItem: [
				{ item: 0, input: undefined },
				{ item: 0, input: 1 },
			],
		};

		expect(rowToExecutionData(input)).toEqual(expectedOutput);
	});

	test('should ignore undefined pairedItem values', () => {
		const input: IDataObject = {
			key: 'value',
			pairedItem1: { item: 0, input: undefined } as IPairedItemData,
			pairedItem2: undefined,
		};

		const expectedOutput: INodeExecutionData = {
			json: { key: 'value' },
			pairedItem: [{ item: 0, input: undefined }],
		};

		expect(rowToExecutionData(input)).toEqual(expectedOutput);
	});

	test('should handle only json properties without pairedItem', () => {
		const input: IDataObject = {
			name: 'Alice',
			age: 30,
		};

		const expectedOutput: INodeExecutionData = {
			json: { name: 'Alice', age: 30 },
			pairedItem: [],
		};

		expect(rowToExecutionData(input)).toEqual(expectedOutput);
	});
});

describe('modifySelectQuery', () => {
	test('should return the original query if no SELECT match is found', () => {
		const query = 'UPDATE table SET column = 1';
		expect(modifySelectQuery(query, 2)).toBe(query);
	});

	test('should return the original query if SELECT * is used', () => {
		const query = 'SELECT * FROM input1';
		expect(modifySelectQuery(query, 2)).toBe(query);
	});

	test('should append pairedItem columns when input tables exist', () => {
		const query = 'SELECT column1, column2 FROM input1 WHERE input1.id = table.id';
		const modifiedQuery = modifySelectQuery(query, 2);
		expect(modifiedQuery).toBe(
			'SELECT column1, column2, input1.pairedItem AS pairedItem1 FROM input1 WHERE input1.id = table.id',
		);
	});

	test('should handle multiple input tables correctly', () => {
		const query = 'SELECT column1 FROM input1 LEFT JOIN input2 ON input1.name = input2.name';
		const modifiedQuery = modifySelectQuery(query, 2);
		expect(modifiedQuery).toBe(
			'SELECT column1, input1.pairedItem AS pairedItem1, input2.pairedItem AS pairedItem2 FROM input1 LEFT JOIN input2 ON input1.name = input2.name',
		);
	});

	test('should not modify query if no input tables are found', () => {
		const query = 'SELECT column1 FROM table';
		expect(modifySelectQuery(query, 2)).toBe(query);
	});
});
