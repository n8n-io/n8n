import type { IDataObject, INode } from 'n8n-workflow';
import { createMockExecuteFunction } from '../../../../test/nodes/Helpers';
import * as mode from '../../v3/actions/mode';

const node: INode = {
	id: '123456',
	name: 'Merge',
	typeVersion: 3,
	type: 'n8n-nodes-base.merge',
	position: [50, 50],
	parameters: {},
};

const inputsData = [
	[
		{
			json: {
				id: 1,
				data: 'a',
				name: 'Sam',
			},
		},
		{
			json: {
				id: 2,
				data: 'b',
				name: 'Dan',
			},
		},
		{
			json: {
				id: 3,
				data: 'c',
				name: 'Jon',
			},
		},
		{
			json: {
				id: 6,
				data: 'e',
				name: 'Ron',
			},
		},
		{
			json: {
				id: 7,
				data: 'f',
				name: 'Joe',
			},
		},
	],
	[
		{
			json: {
				id: 1,
				data: 'aa',
				country: 'PL',
			},
		},
		{
			json: {
				id: 2,
				data: 'bb',
				country: 'FR',
			},
		},
		{
			json: {
				id: 3,
				data: 'cc',
				country: 'UA',
			},
		},
		{
			json: {
				id: 4,
				data: 'ee',
				country: 'US',
			},
		},
		{
			json: {
				id: 5,
				data: 'ff',
				country: 'ES',
			},
		},
	],
];
describe('Test MergeV3, combineBySql operation', () => {
	it('LEFT JOIN', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query:
				'SELECT *, input1.data as data_1\nFROM input1\nLEFT JOIN input2\nON input1.id = input2.id\n',
		};

		const returnData = await mode.combineBySql.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData[0].json).toEqual({
			data_1: 'a',
			id: 1,
			data: 'aa',
			name: 'Sam',
			country: 'PL',
		});
	});
	it('LEFT JOIN, missing input 2(empty array)', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query:
				'SELECT *, input1.data as data_1\nFROM input1\nLEFT JOIN input2\nON input1.id = input2.id\n',
		};

		const returnData = await mode.combineBySql.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			[inputsData[0], []],
		);

		expect(returnData[0].json).toEqual({
			data: 'a',
			data_1: 'a',
			id: 1,
			name: 'Sam',
		});
	});

	it('LEFT JOIN, missing data in input 2', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query:
				'SELECT *, input1.data as data_1\nFROM input1\nLEFT JOIN input2\nON input1.id = input2.id\n',
		};

		try {
			await mode.combineBySql.execute.call(createMockExecuteFunction(nodeParameters, node), [
				inputsData[0],
			]);

			expect(true).toBe(false);
		} catch (error) {
			expect(error.message).toBe('Issue while executing query');
			expect(error.description).toBe('Table does not exist: input2');
		}
	});

	it('LEFT JOIN, invalid syntax', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query:
				'SELECTTT *, input1.data as data_1\nFROM input1\nLEFT JOIN input2\nON input1.id = input2.id\n',
		};

		try {
			await mode.combineBySql.execute.call(
				createMockExecuteFunction(nodeParameters, node),
				inputsData,
			);

			expect(true).toBe(false);
		} catch (error) {
			expect(error.message).toBe('Issue while executing query');
			expect(error.description.includes('Parse error')).toBe(true);
			expect(error.description.includes('SELECTTT')).toBe(true);
		}
	});

	it('RIGHT JOIN', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query: 'SELECT *\nFROM input1\nRIGHT JOIN input2\nON input1.id = input2.id;\n',
		};

		const returnData = await mode.combineBySql.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData[0].json).toEqual({
			id: 1,
			data: 'aa',
			name: 'Sam',
			country: 'PL',
		});
		expect(returnData[4].json).toEqual({
			id: 5,
			data: 'ff',
			country: 'ES',
		});
	});

	it('INNER JOIN', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query: 'SELECT *\nFROM input1\nINNER JOIN input2\nON input1.id = input2.id;\n',
		};

		const returnData = await mode.combineBySql.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData.length).toEqual(3);
		expect(returnData[2].json).toEqual({
			id: 3,
			data: 'cc',
			name: 'Jon',
			country: 'UA',
		});
	});

	it('FULL OUTER JOIN', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query: 'SELECT *\nFROM input1\nFULL OUTER JOIN input2\nON input1.id = input2.id;\n',
		};

		const returnData = await mode.combineBySql.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData.length).toEqual(7);
		expect(returnData[2].json).toEqual({
			id: 3,
			data: 'cc',
			name: 'Jon',
			country: 'UA',
		});
	});
	it('CROSS JOIN', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query: 'SELECT *, input1.data AS data_1\nFROM input1\nCROSS JOIN input2;\n',
		};

		const returnData = await mode.combineBySql.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData.length).toEqual(25);
		expect(returnData[0].json).toEqual({
			data_1: 'a',
			id: 1,
			data: 'aa',
			name: 'Sam',
			country: 'PL',
		});
	});
});

describe('Test MergeV3, append operation', () => {
	it('append inputs', async () => {
		const nodeParameters: IDataObject = {};

		const returnData = await mode.append.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData.length).toEqual(10);
		expect(returnData[0].json).toEqual({
			id: 1,
			data: 'a',
			name: 'Sam',
		});
	});
});
describe('Test MergeV3, combineByFields operation', () => {
	it('merge inputs', async () => {
		const nodeParameters: IDataObject = {
			joinMode: 'keepMatches',
			fieldsToMatchString: 'id',
			options: {},
		};

		const returnData = await mode.combineByFields.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData.length).toEqual(3);
		expect(returnData[1].json).toEqual({
			id: 2,
			data: 'bb',
			name: 'Dan',
			country: 'FR',
		});
	});
});

describe('Test MergeV3, combineByPosition operation', () => {
	it('combine inputs', async () => {
		const nodeParameters: IDataObject = {};

		const returnData = await mode.combineByPosition.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData.length).toEqual(5);
		expect(returnData[4].json).toEqual({
			id: 5,
			data: 'ff',
			name: 'Joe',
			country: 'ES',
		});
	});
});

describe('Test MergeV3, chooseBranch operation', () => {
	it('choose input', async () => {
		const nodeParameters: IDataObject = {
			useDataOfInput: 2,
			chooseBranchMode: 'waitForAll',
			output: 'specifiedInput',
		};

		const returnData = await mode.chooseBranch.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData.length).toEqual(5);
		expect(returnData[0].json).toEqual({
			id: 1,
			data: 'aa',
			country: 'PL',
		});
	});
});

describe('Test MergeV3, combineAll operation', () => {
	it('combine inputs', async () => {
		const nodeParameters: IDataObject = {
			options: {},
		};

		const returnData = await mode.combineAll.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData.length).toEqual(25);
		expect(returnData[0].json).toEqual({
			id: 1,
			data: 'aa',
			name: 'Sam',
			country: 'PL',
		});
	});
});
