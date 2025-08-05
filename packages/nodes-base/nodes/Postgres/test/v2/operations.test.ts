import get from 'lodash/get';
import type {
	IDataObject,
	IExecuteFunctions,
	IGetNodeParameterOptions,
	INode,
	INodeParameters,
} from 'n8n-workflow';
import pgPromise from 'pg-promise';

import * as deleteTable from '../../v2/actions/database/deleteTable.operation';
import * as executeQuery from '../../v2/actions/database/executeQuery.operation';
import * as insert from '../../v2/actions/database/insert.operation';
import * as select from '../../v2/actions/database/select.operation';
import * as update from '../../v2/actions/database/update.operation';
import * as upsert from '../../v2/actions/database/upsert.operation';
import type { ColumnInfo, PgpDatabase, QueriesRunner } from '../../v2/helpers/interfaces';
import * as utils from '../../v2/helpers/utils';

const runQueries: QueriesRunner = jest.fn();

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

const items = [{ json: {} }];

const createMockExecuteFunction = (nodeParameters: IDataObject) => {
	const fakeExecuteFunction = {
		getNodeParameter(
			parameterName: string,
			_itemIndex: number,
			fallbackValue?: IDataObject,
			options?: IGetNodeParameterOptions,
		) {
			const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
			return get(nodeParameters, parameter, fallbackValue);
		},
		getNode() {
			node.parameters = { ...node.parameters, ...(nodeParameters as INodeParameters) };
			return node;
		},
		evaluateExpression(str: string, _: number) {
			return str.replace('{{', '').replace('}}', '');
		},
	} as unknown as IExecuteFunctions;
	return fakeExecuteFunction;
};

const createMockDb = (columnInfo: ColumnInfo[]) => {
	return {
		async any() {
			return columnInfo;
		},
	} as unknown as PgpDatabase;
};

// if node parameters copied from canvas all default parameters has to be added manually as JSON would not have them
describe('Test PostgresV2, deleteTable operation', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('deleteCommand: delete, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'deleteTable',
			schema: {
				__rl: true,
				mode: 'list',
				value: 'public',
			},
			table: {
				__rl: true,
				value: 'my_table',
				mode: 'list',
				cachedResultName: 'my_table',
			},
			deleteCommand: 'delete',
			where: {
				values: [
					{
						column: 'id',
						condition: 'LIKE',
						value: '1',
					},
				],
			},
			options: { nodeVersion: 2.1 },
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		await deleteTable.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query: 'DELETE FROM $1:name.$2:name WHERE $3:name LIKE $4',
					values: ['public', 'my_table', 'id', '1'],
				},
			],
			items,
			nodeOptions,
		);
	});

	it('deleteCommand: truncate, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'deleteTable',
			schema: {
				__rl: true,
				mode: 'list',
				value: 'public',
			},
			table: {
				__rl: true,
				value: 'my_table',
				mode: 'list',
				cachedResultName: 'my_table',
			},
			deleteCommand: 'truncate',
			restartSequences: true,
			options: {
				cascade: true,
			},
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		await deleteTable.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query: 'TRUNCATE TABLE $1:name.$2:name RESTART IDENTITY CASCADE',
					values: ['public', 'my_table'],
				},
			],
			items,
			nodeOptions,
		);
	});

	it('deleteCommand: drop, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'deleteTable',
			schema: {
				__rl: true,
				mode: 'list',
				value: 'public',
			},
			table: {
				__rl: true,
				value: 'my_table',
				mode: 'list',
				cachedResultName: 'my_table',
			},
			deleteCommand: 'drop',
			options: { nodeVersion: 2.1 },
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		await deleteTable.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query: 'DROP TABLE IF EXISTS $1:name.$2:name',
					values: ['public', 'my_table'],
				},
			],
			items,
			nodeOptions,
		);
	});
});

describe('Test PostgresV2, executeQuery operation', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'executeQuery',
			query: 'select * from $1:name;',
			options: {
				queryReplacement: 'my_table',
			},
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		await executeQuery.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
		);

		expect(runQueries).toHaveBeenCalledWith(
			[{ query: 'select * from $1:name;', values: ['my_table'], options: { partial: true } }],
			items,
			nodeOptions,
		);
	});

	it('should call runQueries and insert enclosed placeholder into values', async () => {
		const nodeParameters: IDataObject = {
			operation: 'executeQuery',
			query: "select '$1';",
			options: {},
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		await executeQuery.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
		);

		expect(runQueries).toHaveBeenCalledWith(
			[{ query: 'select $1;', values: ['$1'], options: { partial: true } }],
			items,
			nodeOptions,
		);
	});

	it('should call runQueries and not insert enclosed placeholder into values because queryReplacement is defined', async () => {
		const nodeParameters: IDataObject = {
			operation: 'executeQuery',
			query: "select '$1';",
			options: {
				queryReplacement: 'my_table',
			},
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		await executeQuery.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
		);

		expect(runQueries).toHaveBeenCalledWith(
			[{ query: "select '$1';", values: ['my_table'], options: { partial: true } }],
			items,
			nodeOptions,
		);
	});

	it('should call runQueries and insert enclosed placeholder into values because treatQueryParametersInSingleQuotesAsText is true', async () => {
		const nodeParameters: IDataObject = {
			operation: 'executeQuery',
			query: "select '$1';",
			options: {
				queryReplacement: 'my_table',
				treatQueryParametersInSingleQuotesAsText: true,
			},
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		await executeQuery.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
		);

		expect(runQueries).toHaveBeenCalledWith(
			[{ query: 'select $2;', values: ['my_table', '$1'], options: { partial: true } }],
			items,
			nodeOptions,
		);
	});

	it('should call runQueries with falsy query replacements', async () => {
		const nodeParameters: IDataObject = {
			operation: 'executeQuery',
			query: 'SELECT *\nFROM users\nWHERE username IN ($1, $2, $3)',
			options: {
				queryReplacement: '={{ 0 }}, {{ null }}, {{ 0 }}',
			},
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		expect(async () => {
			await executeQuery.execute.call(
				createMockExecuteFunction(nodeParameters),
				runQueries,
				items,
				nodeOptions,
			);
		}).not.toThrow();
	});

	it('should allow users to use $$ instead of strings', async () => {
		const nodeParameters: IDataObject = {
			operation: 'executeQuery',
			query: 'INSERT INTO dollar_bug (description) VALUES ($$34test$$);',
			options: {},
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		expect(async () => {
			await executeQuery.execute.call(
				createMockExecuteFunction(nodeParameters),
				runQueries,
				items,
				nodeOptions,
			);
		}).not.toThrow();
	});

	it('should allow users to use $$ instead of strings while using query parameters', async () => {
		const nodeParameters: IDataObject = {
			operation: 'executeQuery',
			query: 'INSERT INTO dollar_bug (description) VALUES ($1 || $$4more text$$)',
			options: {
				queryReplacement: '={{ $3This is a test }}',
			},
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		await executeQuery.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query: 'INSERT INTO dollar_bug (description) VALUES ($1 || $$4more text$$)',
					values: [' $3This is a test '],
					options: { partial: true },
				},
			],
			items,
			nodeOptions,
		);
	});

	it('should execute queries with null key/value pairs', async () => {
		const nodeParameters: IDataObject = {
			operation: 'executeQuery',
			query: 'SELECT *\nFROM users\nWHERE username IN ($1, $2)',
			options: {
				queryReplacement: '"={{ betty }}, {{ null }}"',
			},
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		expect(async () => {
			await executeQuery.execute.call(
				createMockExecuteFunction(nodeParameters),
				runQueries,
				items,
				nodeOptions,
			);
		}).not.toThrow();
	});

	it('should execute queries with multiple json key/value pairs', async () => {
		const nodeParameters: IDataObject = {
			operation: 'executeQuery',
			query: 'SELECT *\nFROM users\nWHERE username IN ($1, $2, $3)',
			options: {
				queryReplacement:
					'={{ JSON.stringify({id: "7",id2: "848da11d-e72e-44c5-yyyy-c6fb9f17d366"}) }}',
			},
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		expect(async () => {
			await executeQuery.execute.call(
				createMockExecuteFunction(nodeParameters),
				runQueries,
				items,
				nodeOptions,
			);
		}).not.toThrow();
	});

	it('should execute queries with single json key/value pair', async () => {
		const nodeParameters: IDataObject = {
			operation: 'executeQuery',
			query: 'SELECT *\nFROM users\nWHERE username IN ($1, $2, $3)',
			options: {
				queryReplacement: '={{ {"id": "7"} }}',
			},
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		expect(async () => {
			await executeQuery.execute.call(
				createMockExecuteFunction(nodeParameters),
				runQueries,
				items,
				nodeOptions,
			);
		}).not.toThrow();
	});

	it('should not parse out expressions if there are valid JSON query parameters', async () => {
		const query = 'SELECT *\nFROM users\nWHERE username IN ($1, $2, $3)';
		const nodeParameters: IDataObject = {
			operation: 'executeQuery',
			query,
			options: {
				queryReplacement: '={{ {"id": "7"} }}',
				nodeVersion: 2.6,
			},
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		jest.spyOn(utils, 'isJSON');
		jest.spyOn(utils, 'stringToArray');

		await executeQuery.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
		);

		expect(utils.isJSON).toHaveBeenCalledTimes(1);
		expect(utils.stringToArray).toHaveBeenCalledTimes(0);
	});

	it('should parse out expressions if is invalid JSON in query parameters', async () => {
		const query = 'SELECT *\nFROM users\nWHERE username IN ($1, $2, $3)';
		const nodeParameters: IDataObject = {
			operation: 'executeQuery',
			query,
			options: {
				queryReplacement: '={{ JSON.stringify({"id": "7"}}) }}',
				nodeVersion: 2.6,
			},
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		jest.spyOn(utils, 'isJSON');
		jest.spyOn(utils, 'stringToArray');

		await executeQuery.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
		);

		expect(utils.isJSON).toHaveBeenCalledTimes(1);
		expect(utils.stringToArray).toHaveBeenCalledTimes(1);
	});
});

describe('Test PostgresV2, insert operation', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('dataMode: define, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			schema: {
				__rl: true,
				mode: 'list',
				value: 'public',
			},
			table: {
				__rl: true,
				value: 'my_table',
				mode: 'list',
			},
			dataMode: 'defineBelow',
			valuesToSend: {
				values: [
					{
						column: 'json',
						value: '{"test":15}',
					},
					{
						column: 'foo',
						value: 'select 5',
					},
					{
						column: 'id',
						value: '4',
					},
				],
			},
			options: { nodeVersion: 2.1 },
		};
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO', udt_name: '' },
			{ column_name: 'json', data_type: 'json', is_nullable: 'NO', udt_name: '' },
			{ column_name: 'foo', data_type: 'text', is_nullable: 'NO', udt_name: '' },
		];

		const nodeOptions = nodeParameters.options as IDataObject;

		await insert.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
			createMockDb(columnsInfo),
			pgPromise(),
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query: 'INSERT INTO $1:name.$2:name($3:name) VALUES($3:csv) RETURNING *',
					values: ['public', 'my_table', { json: '{"test":15}', foo: 'select 5', id: '4' }],
				},
			],
			items,
			nodeOptions,
		);
	});

	it('dataMode: autoMapInputData, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			schema: {
				__rl: true,
				mode: 'list',
				value: 'public',
			},
			table: {
				__rl: true,
				value: 'my_table',
				mode: 'list',
			},
			dataMode: 'autoMapInputData',
			options: { nodeVersion: 2.1 },
		};
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO', udt_name: '' },
			{ column_name: 'json', data_type: 'json', is_nullable: 'NO', udt_name: '' },
			{ column_name: 'foo', data_type: 'text', is_nullable: 'NO', udt_name: '' },
		];

		const inputItems = [
			{
				json: {
					id: 1,
					json: {
						test: 15,
					},
					foo: 'data 1',
				},
			},
			{
				json: {
					id: 2,
					json: {
						test: 10,
					},
					foo: 'data 2',
				},
			},
			{
				json: {
					id: 3,
					json: {
						test: 5,
					},
					foo: 'data 3',
				},
			},
		];

		const nodeOptions = nodeParameters.options as IDataObject;

		await insert.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			inputItems,
			nodeOptions,
			createMockDb(columnsInfo),
			pgPromise(),
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query: 'INSERT INTO $1:name.$2:name($3:name) VALUES($3:csv) RETURNING *',
					values: ['public', 'my_table', { id: 1, json: { test: 15 }, foo: 'data 1' }],
				},
				{
					query: 'INSERT INTO $1:name.$2:name($3:name) VALUES($3:csv) RETURNING *',
					values: ['public', 'my_table', { id: 2, json: { test: 10 }, foo: 'data 2' }],
				},
				{
					query: 'INSERT INTO $1:name.$2:name($3:name) VALUES($3:csv) RETURNING *',
					values: ['public', 'my_table', { id: 3, json: { test: 5 }, foo: 'data 3' }],
				},
			],
			inputItems,
			nodeOptions,
		);
	});

	it('dataMode: define, should accept an array with values if column is of type json', async () => {
		const convertValuesToJsonWithPgpSpy = jest.spyOn(utils, 'convertValuesToJsonWithPgp');
		const hasJsonDataTypeInSchemaSpy = jest.spyOn(utils, 'hasJsonDataTypeInSchema');

		const values = [
			{ value: { id: 1, json: [], foo: 'data 1' }, expected: { id: 1, json: '[]', foo: 'data 1' } },
			{
				value: {
					id: 2,
					json: [0, 1],
					foo: 'data 2',
				},
				expected: {
					id: 2,
					json: '[0,1]',
					foo: 'data 2',
				},
			},
			{
				value: {
					id: 2,
					json: [0],
					foo: 'data 2',
				},
				expected: {
					id: 2,
					json: '[0]',
					foo: 'data 2',
				},
			},
		];

		values.forEach(async (value) => {
			const valuePassedIn = value.value;
			const nodeParameters: IDataObject = {
				schema: {
					__rl: true,
					mode: 'list',
					value: 'public',
				},
				table: {
					__rl: true,
					value: 'my_table',
					mode: 'list',
				},
				columns: {
					mappingMode: 'defineBelow',
					value: valuePassedIn,
				},
				options: { nodeVersion: 2.5 },
			};
			const columnsInfo: ColumnInfo[] = [
				{ column_name: 'id', data_type: 'integer', is_nullable: 'NO', udt_name: '' },
				{ column_name: 'json', data_type: 'json', is_nullable: 'NO', udt_name: '' },
				{ column_name: 'foo', data_type: 'text', is_nullable: 'NO', udt_name: '' },
			];

			const inputItems = [
				{
					json: valuePassedIn,
				},
			];

			const nodeOptions = nodeParameters.options as IDataObject;
			const pg = pgPromise();

			await insert.execute.call(
				createMockExecuteFunction(nodeParameters),
				runQueries,
				inputItems,
				nodeOptions,
				createMockDb(columnsInfo),
				pg,
			);

			expect(runQueries).toHaveBeenCalledWith(
				[
					{
						query: 'INSERT INTO $1:name.$2:name($3:name) VALUES($3:csv) RETURNING *',
						values: ['public', 'my_table', value.expected],
					},
				],
				inputItems,
				nodeOptions,
			);
			expect(convertValuesToJsonWithPgpSpy).toHaveBeenCalledWith(pg, columnsInfo, valuePassedIn);
			expect(hasJsonDataTypeInSchemaSpy).toHaveBeenCalledWith(columnsInfo);
		});
	});

	it('should insert default values if no values are provided', async () => {
		const nodeParameters: IDataObject = {
			schema: {
				__rl: true,
				mode: 'list',
				value: 'public',
			},
			table: {
				__rl: true,
				value: 'my_table',
				mode: 'list',
			},
			dataMode: 'defineBelow',
			valuesToSend: {
				values: [],
			},
			options: { nodeVersion: 2.6 },
		};
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO', udt_name: '' },
		];

		const nodeOptions = nodeParameters.options as IDataObject;

		await insert.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
			createMockDb(columnsInfo),
			pgPromise(),
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query: 'INSERT INTO $1:name.$2:name DEFAULT VALUES RETURNING *',
					values: ['public', 'my_table', {}],
				},
			],
			items,
			nodeOptions,
		);
	});
});

describe('Test PostgresV2, select operation', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('returnAll, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'select',
			schema: {
				__rl: true,
				mode: 'list',
				value: 'public',
			},
			table: {
				__rl: true,
				value: 'my_table',
				mode: 'list',
				cachedResultName: 'my_table',
			},
			returnAll: true,
			options: {},
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		await select.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query: 'SELECT * FROM $1:name.$2:name',
					values: ['public', 'my_table'],
				},
			],
			items,
			nodeOptions,
		);
	});

	it('limit, whereClauses, sortRules, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'select',
			schema: {
				__rl: true,
				mode: 'list',
				value: 'public',
			},
			table: {
				__rl: true,
				value: 'my_table',
				mode: 'list',
				cachedResultName: 'my_table',
			},
			limit: 5,
			where: {
				values: [
					{
						column: 'id',
						condition: '>=',
						value: 2,
					},
					{
						column: 'foo',
						condition: 'equal',
						value: 'data 2',
					},
				],
			},
			sort: {
				values: [
					{
						column: 'id',
					},
				],
			},
			options: {
				outputColumns: ['json', 'id'],
			},
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		await select.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query:
						'SELECT $3:name FROM $1:name.$2:name WHERE $4:name >= $5 AND $6:name = $7 ORDER BY $8:name ASC LIMIT 5',
					values: ['public', 'my_table', ['json', 'id'], 'id', 2, 'foo', 'data 2', 'id'],
				},
			],
			items,
			nodeOptions,
		);
	});
});

describe('Test PostgresV2, update operation', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('dataMode: define, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'update',
			schema: {
				__rl: true,
				mode: 'list',
				value: 'public',
			},
			table: {
				__rl: true,
				value: 'my_table',
				mode: 'list',
			},
			dataMode: 'defineBelow',
			columnToMatchOn: 'id',
			valueToMatchOn: '1',
			valuesToSend: {
				values: [
					{
						column: 'json',
						value: { text: 'some text' },
					},
					{
						column: 'foo',
						value: 'updated',
					},
				],
			},
			options: {
				outputColumns: ['json', 'foo'],
				nodeVersion: 2.1,
			},
		};
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO', udt_name: '' },
			{ column_name: 'json', data_type: 'json', is_nullable: 'NO', udt_name: '' },
			{ column_name: 'foo', data_type: 'text', is_nullable: 'NO', udt_name: '' },
		];

		const nodeOptions = nodeParameters.options as IDataObject;

		await update.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
			createMockDb(columnsInfo),
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query:
						'UPDATE $1:name.$2:name SET $5:name = $6, $7:name = $8 WHERE $3:name = $4 RETURNING $9:name',
					values: [
						'public',
						'my_table',
						'id',
						'1',
						'json',
						{ text: 'some text' },
						'foo',
						'updated',
						['json', 'foo'],
					],
				},
			],
			items,
			nodeOptions,
		);
	});

	it('dataMode: autoMapInputData, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'update',
			schema: {
				__rl: true,
				mode: 'list',
				value: 'public',
			},
			table: {
				__rl: true,
				value: 'my_table',
				mode: 'list',
			},
			dataMode: 'autoMapInputData',
			columnToMatchOn: 'id',
			options: { nodeVersion: 2.1 },
		};
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO', udt_name: '' },
			{ column_name: 'json', data_type: 'json', is_nullable: 'NO', udt_name: '' },
			{ column_name: 'foo', data_type: 'text', is_nullable: 'NO', udt_name: '' },
		];

		const inputItems = [
			{
				json: {
					id: 1,
					json: {
						test: 15,
					},
					foo: 'data 1',
				},
			},
			{
				json: {
					id: 2,
					json: {
						test: 10,
					},
					foo: 'data 2',
				},
			},
			{
				json: {
					id: 3,
					json: {
						test: 5,
					},
					foo: 'data 3',
				},
			},
		];

		const nodeOptions = nodeParameters.options as IDataObject;

		await update.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			inputItems,
			nodeOptions,
			createMockDb(columnsInfo),
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query:
						'UPDATE $1:name.$2:name SET $5:name = $6, $7:name = $8 WHERE $3:name = $4 RETURNING *',
					values: ['public', 'my_table', 'id', 1, 'json', { test: 15 }, 'foo', 'data 1'],
				},
				{
					query:
						'UPDATE $1:name.$2:name SET $5:name = $6, $7:name = $8 WHERE $3:name = $4 RETURNING *',
					values: ['public', 'my_table', 'id', 2, 'json', { test: 10 }, 'foo', 'data 2'],
				},
				{
					query:
						'UPDATE $1:name.$2:name SET $5:name = $6, $7:name = $8 WHERE $3:name = $4 RETURNING *',
					values: ['public', 'my_table', 'id', 3, 'json', { test: 5 }, 'foo', 'data 3'],
				},
			],
			inputItems,
			nodeOptions,
		);
	});
});

describe('Test PostgresV2, upsert operation', () => {
	it('dataMode: define, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'upsert',
			schema: {
				__rl: true,
				mode: 'list',
				value: 'public',
			},
			table: {
				__rl: true,
				value: 'my_table',
				mode: 'list',
			},
			dataMode: 'defineBelow',
			columnToMatchOn: 'id',
			valueToMatchOn: '5',
			valuesToSend: {
				values: [
					{
						column: 'json',
						value: '{ "test": 5 }',
					},
					{
						column: 'foo',
						value: 'data 5',
					},
				],
			},
			options: {
				outputColumns: ['json'],
				nodeVersion: 2.1,
			},
		};
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO', udt_name: '' },
			{ column_name: 'json', data_type: 'json', is_nullable: 'NO', udt_name: '' },
			{ column_name: 'foo', data_type: 'text', is_nullable: 'NO', udt_name: '' },
		];

		const nodeOptions = nodeParameters.options as IDataObject;

		await upsert.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
			createMockDb(columnsInfo),
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query:
						'INSERT INTO $1:name.$2:name($4:name) VALUES($4:csv) ON CONFLICT ($3:name) DO UPDATE  SET $5:name = $6, $7:name = $8 RETURNING $9:name',
					values: [
						'public',
						'my_table',
						'id',
						{ json: '{ "test": 5 }', foo: 'data 5', id: '5' },
						'json',
						'{ "test": 5 }',
						'foo',
						'data 5',
						['json'],
					],
				},
			],
			items,
			nodeOptions,
		);
	});

	it('dataMode: autoMapInputData, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'upsert',
			schema: {
				__rl: true,
				mode: 'list',
				value: 'public',
			},
			table: {
				__rl: true,
				value: 'my_table',
				mode: 'list',
			},
			dataMode: 'autoMapInputData',
			columnToMatchOn: 'id',
			options: { nodeVersion: 2.1 },
		};
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO', udt_name: '' },
			{ column_name: 'json', data_type: 'json', is_nullable: 'NO', udt_name: '' },
			{ column_name: 'foo', data_type: 'text', is_nullable: 'NO', udt_name: '' },
		];

		const inputItems = [
			{
				json: {
					id: 1,
					json: {
						test: 15,
					},
					foo: 'data 1',
				},
			},
			{
				json: {
					id: 2,
					json: {
						test: 10,
					},
					foo: 'data 2',
				},
			},
			{
				json: {
					id: 3,
					json: {
						test: 5,
					},
					foo: 'data 3',
				},
			},
		];

		const nodeOptions = nodeParameters.options as IDataObject;

		await upsert.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			inputItems,
			nodeOptions,
			createMockDb(columnsInfo),
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query:
						'INSERT INTO $1:name.$2:name($4:name) VALUES($4:csv) ON CONFLICT ($3:name) DO UPDATE  SET $5:name = $6, $7:name = $8 RETURNING *',
					values: [
						'public',
						'my_table',
						'id',
						{ id: 1, json: { test: 15 }, foo: 'data 1' },
						'json',
						{ test: 15 },
						'foo',
						'data 1',
					],
				},
				{
					query:
						'INSERT INTO $1:name.$2:name($4:name) VALUES($4:csv) ON CONFLICT ($3:name) DO UPDATE  SET $5:name = $6, $7:name = $8 RETURNING *',
					values: [
						'public',
						'my_table',
						'id',
						{ id: 2, json: { test: 10 }, foo: 'data 2' },
						'json',
						{ test: 10 },
						'foo',
						'data 2',
					],
				},
				{
					query:
						'INSERT INTO $1:name.$2:name($4:name) VALUES($4:csv) ON CONFLICT ($3:name) DO UPDATE  SET $5:name = $6, $7:name = $8 RETURNING *',
					values: [
						'public',
						'my_table',
						'id',
						{ id: 3, json: { test: 5 }, foo: 'data 3' },
						'json',
						{ test: 5 },
						'foo',
						'data 3',
					],
				},
			],
			inputItems,
			nodeOptions,
		);
	});
});

describe('When matching on all columns', () => {
	it('dataMode: define, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'upsert',
			schema: {
				__rl: true,
				mode: 'list',
				value: 'public',
			},
			table: {
				__rl: true,
				value: 'my_table',
				mode: 'list',
			},
			columns: {
				matchingColumns: ['id', 'json', 'foo'],
				value: { id: '5', json: '{ "test": 5 }', foo: 'data 5' },
				mappingMode: 'defineBelow',
			},
			options: {
				outputColumns: ['json'],
				nodeVersion: 2.5,
			},
		};
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO', udt_name: '' },
			{ column_name: 'json', data_type: 'json', is_nullable: 'NO', udt_name: '' },
			{ column_name: 'foo', data_type: 'text', is_nullable: 'NO', udt_name: '' },
		];
		const inputItems = [
			{
				json: {
					id: 1,
					json: {
						test: 15,
					},
					foo: 'data 1',
				},
			},
		];
		const nodeOptions = nodeParameters.options as IDataObject;

		await upsert.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			inputItems,
			nodeOptions,
			createMockDb(columnsInfo),
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query:
						'INSERT INTO $1:name.$2:name($6:name) VALUES($6:csv) ON CONFLICT ($3:name,$4:name,$5:name) DO NOTHING  RETURNING $7:name',
					values: [
						'public',
						'my_table',
						'id',
						'json',
						'foo',
						{ id: '5', json: '{ "test": 5 }', foo: 'data 5' },
						['json'],
					],
				},
			],
			inputItems,
			nodeOptions,
		);
	});

	it('dataMode: autoMapInputData, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'upsert',
			schema: {
				__rl: true,
				mode: 'list',
				value: 'public',
			},
			table: {
				__rl: true,
				value: 'my_table',
				mode: 'list',
			},
			columns: {
				matchingColumns: ['id', 'json', 'foo'],
				mappingMode: 'autoMapInputData',
			},
			options: { nodeVersion: 2.5 },
		};
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO', udt_name: '' },
			{ column_name: 'json', data_type: 'json', is_nullable: 'NO', udt_name: '' },
			{ column_name: 'foo', data_type: 'text', is_nullable: 'NO', udt_name: '' },
		];

		const inputItems = [
			{
				json: {
					id: 1,
					json: {
						test: 15,
					},
					foo: 'data 1',
				},
			},
			{
				json: {
					id: 2,
					json: {
						test: 10,
					},
					foo: 'data 2',
				},
			},
			{
				json: {
					id: 3,
					json: {
						test: 5,
					},
					foo: 'data 3',
				},
			},
		];

		const nodeOptions = nodeParameters.options as IDataObject;

		await upsert.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			inputItems,
			nodeOptions,
			createMockDb(columnsInfo),
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query:
						'INSERT INTO $1:name.$2:name($6:name) VALUES($6:csv) ON CONFLICT ($3:name,$4:name,$5:name) DO NOTHING  RETURNING *',
					values: [
						'public',
						'my_table',
						'id',
						'json',
						'foo',
						{ id: 1, json: { test: 15 }, foo: 'data 1' },
					],
				},
				{
					query:
						'INSERT INTO $1:name.$2:name($6:name) VALUES($6:csv) ON CONFLICT ($3:name,$4:name,$5:name) DO NOTHING  RETURNING *',
					values: [
						'public',
						'my_table',
						'id',
						'json',
						'foo',
						{ id: 2, json: { test: 10 }, foo: 'data 2' },
					],
				},
				{
					query:
						'INSERT INTO $1:name.$2:name($6:name) VALUES($6:csv) ON CONFLICT ($3:name,$4:name,$5:name) DO NOTHING  RETURNING *',
					values: [
						'public',
						'my_table',
						'id',
						'json',
						'foo',
						{ id: 3, json: { test: 5 }, foo: 'data 3' },
					],
				},
			],
			inputItems,
			nodeOptions,
		);
	});
});
