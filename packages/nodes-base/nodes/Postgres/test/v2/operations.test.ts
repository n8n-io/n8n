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
import type {
	ColumnInfo,
	PgpDatabase,
	QueriesRunner,
	StartAfterColumnInfo,
} from '../../v2/helpers/interfaces';
import * as utils from '../../v2/helpers/utils';

const runQueries: QueriesRunner = vi.fn().mockResolvedValue([]);

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
		vi.clearAllMocks();
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
			nodeOptions,
		);
	});

	it('deleteCommand: delete, should throw on invalid where clause', async () => {
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
						condition: '=1; select 1,2; -- -',
						value: '1',
					},
				],
			},
			options: { nodeVersion: 2.1 },
		};
		const nodeOptions = nodeParameters.options as IDataObject;

		const promise = deleteTable.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
		);
		await expect(promise).rejects.toThrow('Invalid where clause');
	});
});

describe('Test PostgresV2, executeQuery operation', () => {
	afterEach(() => {
		vi.clearAllMocks();
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

		vi.spyOn(utils, 'isJSON');
		vi.spyOn(utils, 'stringToArray');

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

		vi.spyOn(utils, 'isJSON');
		vi.spyOn(utils, 'stringToArray');

		await executeQuery.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
		);

		expect(utils.isJSON).toHaveBeenCalledTimes(1);
		expect(utils.stringToArray).toHaveBeenCalledTimes(1);
	});

	const createMockExecuteForArrayQuery = (
		nodeParameters: IDataObject,
		returnArray: unknown[],
		matchString: string,
	) =>
		({
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
				if (str.includes(matchString)) {
					return returnArray;
				}
				return str.replace('{{', '').replace('}}', '');
			},
		}) as unknown as IExecuteFunctions;

	it.each([
		{
			description: 'spread string array across individual bind values',
			query: 'INSERT INTO my_table (col1, col2, col3) VALUES ($1, $2, $3)',
			queryReplacement: "={{ ['a', 'b', 'c'] }}",
			matchString: "['a', 'b', 'c']",
			returnArray: ['a', 'b', 'c'],
			expectedValues: ['a', 'b', 'c'],
		},
		{
			description: 'JSON.stringify object elements in array bind values',
			query: 'INSERT INTO my_table (col1, col2) VALUES ($1, $2)',
			queryReplacement: '={{ [{id: 1}, {id: 2}] }}',
			matchString: '[{id: 1}, {id: 2}]',
			returnArray: [{ id: 1 }, { id: 2 }],
			expectedValues: ['{"id":1}', '{"id":2}'],
		},
		{
			description: 'handle null, number, and boolean elements in array bind values',
			query: 'INSERT INTO my_table (col1, col2, col3) VALUES ($1, $2, $3)',
			queryReplacement: '={{ [null, 42, true] }}',
			matchString: '[null, 42, true]',
			returnArray: [null, 42, true],
			expectedValues: [null, 42, true],
		},
	])(
		'should $description',
		async ({ query, queryReplacement, matchString, returnArray, expectedValues }) => {
			const nodeParameters: IDataObject = {
				operation: 'executeQuery',
				query,
				options: {
					queryReplacement,
					nodeVersion: 2.6,
				},
			};
			const nodeOptions = nodeParameters.options as IDataObject;

			const mockExecute = createMockExecuteForArrayQuery(nodeParameters, returnArray, matchString);

			await executeQuery.execute.call(mockExecute, runQueries, items, nodeOptions);

			expect(runQueries).toHaveBeenCalledWith(
				[
					{
						query,
						values: expectedValues,
						options: { partial: true },
					},
				],
				nodeOptions,
			);
		},
	);

	describe('query parameters with commas in evaluated values', () => {
		const query = 'SELECT * FROM users WHERE name = $1 AND id = $2';

		it.each([
			{
				description: 'keep a value that contains a comma as one bind value',
				nodeVersion: 2.8,
				queryReplacement: '={{ $json.name }}, {{ $json.id }}',
				evaluated: { '{{ $json.name }}': 'Doe, John', '{{ $json.id }}': 'abc' },
				expectedValues: ['Doe, John', 'abc'],
			},
			{
				description: 'pass a numeric value as one bind value',
				nodeVersion: 2.8,
				queryReplacement: '={{ $json.name }}, {{ $json.id }}',
				evaluated: { '{{ $json.name }}': 'Doe, John', '{{ $json.id }}': 42 },
				expectedValues: ['Doe, John', '42'],
			},
			{
				description: 'pass a JSON string as one bind value',
				nodeVersion: 2.8,
				queryReplacement: '={{ $json.payload }}',
				evaluated: { '{{ $json.payload }}': '{"id": "7", "name": "x"}' },
				expectedValues: ['{"id": "7", "name": "x"}'],
			},
			{
				description: 'pass an object as one JSON bind value',
				nodeVersion: 2.8,
				queryReplacement: '={{ $json.payload }}, {{ $json.id }}',
				evaluated: {
					'{{ $json.payload }}': { id: '7', tags: ['a', 'b'] },
					'{{ $json.id }}': 'abc',
				},
				expectedValues: ['{"id":"7","tags":["a","b"]}', 'abc'],
			},
			{
				description: 'keep an empty value as one bind value',
				nodeVersion: 2.8,
				queryReplacement: '={{ $json.name }}, {{ $json.id }}',
				evaluated: { '{{ $json.name }}': '', '{{ $json.id }}': 'abc' },
				expectedValues: ['', 'abc'],
			},
			{
				description: 'pass null as SQL NULL',
				nodeVersion: 2.8,
				queryReplacement: '={{ $json.name }}, {{ $json.note }}',
				evaluated: { '{{ $json.name }}': 'Doe, John', '{{ $json.note }}': null },
				expectedValues: ['Doe, John', null],
			},
			{
				description: 'pass a missing field as SQL NULL',
				nodeVersion: 2.8,
				queryReplacement: '={{ $json.name }}, {{ $json.note }}',
				evaluated: { '{{ $json.name }}': 'Doe, John' },
				expectedValues: ['Doe, John', null],
			},
			{
				description: 'spread an array across bind values',
				nodeVersion: 2.8,
				queryReplacement: '={{ $json.list }}, {{ $json.id }}',
				evaluated: { '{{ $json.list }}': ['x', 'y'], '{{ $json.id }}': 'abc' },
				expectedValues: ['x', 'y', 'abc'],
			},
			{
				description: 'pass a missing array element as SQL NULL',
				nodeVersion: 2.8,
				queryReplacement: '={{ [$json.a, $json.b] }}, {{ $json.c }}',
				evaluated: { '{{ [$json.a, $json.b] }}': [undefined, 'x'], '{{ $json.c }}': 'abc' },
				expectedValues: [null, 'x', 'abc'],
			},
			{
				description: 'skip a missing array element before v2.8',
				nodeVersion: 2.7,
				queryReplacement: '={{ [$json.a, $json.b] }}, {{ $json.c }}',
				evaluated: { '{{ [$json.a, $json.b] }}': [undefined, 'x'], '{{ $json.c }}': 'abc' },
				expectedValues: ['x', 'abc'],
			},
			{
				description: 'split a literal comma-separated list without expressions',
				nodeVersion: 2.8,
				queryReplacement: 'a, b, c',
				evaluated: {},
				expectedValues: ['a', 'b', 'c'],
			},
			{
				description: 'split a value that contains a comma before v2.8',
				nodeVersion: 2.7,
				queryReplacement: '={{ $json.name }}, {{ $json.id }}',
				evaluated: { '{{ $json.name }}': 'Doe, John', '{{ $json.id }}': 'abc' },
				expectedValues: ['Doe', 'John', 'abc'],
			},
		])(
			'should $description',
			async ({ nodeVersion, queryReplacement, evaluated, expectedValues }) => {
				const nodeParameters: IDataObject = {
					operation: 'executeQuery',
					query,
					options: { queryReplacement, nodeVersion },
				};
				const nodeOptions = nodeParameters.options as IDataObject;
				const evaluatedByExpression = new Map<string, unknown>(Object.entries(evaluated));

				const mockExecute = {
					...createMockExecuteFunction(nodeParameters),
					evaluateExpression: (str: string) => evaluatedByExpression.get(str.trim()),
				} as unknown as IExecuteFunctions;

				await executeQuery.execute.call(mockExecute, runQueries, items, nodeOptions);

				expect(runQueries).toHaveBeenCalledWith(
					[{ query, values: expectedValues, options: { partial: true } }],
					nodeOptions,
				);
			},
		);

		describe('when the field is only one expression', () => {
			const singleQuery = 'SELECT $1::int AS age';

			// In a real run, getNodeParameter resolves a single-expression field to its value
			const runWithResolvedValue = async (nodeVersion: number, resolvedValue: unknown) => {
				const nodeParameters: IDataObject = {
					operation: 'executeQuery',
					query: singleQuery,
					options: { queryReplacement: '={{ $json.age }}', nodeVersion },
				};
				const nodeOptions = nodeParameters.options as IDataObject;
				const mockExecute = {
					...createMockExecuteFunction(nodeParameters),
					getNodeParameter: (parameterName: string, _itemIndex: number, fallbackValue?: unknown) =>
						parameterName === 'options.queryReplacement'
							? resolvedValue
							: get(nodeParameters, parameterName, fallbackValue),
				} as unknown as IExecuteFunctions;

				await executeQuery.execute.call(mockExecute, runQueries, items, nodeOptions);

				return nodeOptions;
			};

			it.each([
				{ description: 'null', resolvedValue: null },
				{ description: 'a missing field', resolvedValue: undefined },
			])('should pass $description as SQL NULL from v2.8', async ({ resolvedValue }) => {
				const nodeOptions = await runWithResolvedValue(2.8, resolvedValue);

				expect(runQueries).toHaveBeenCalledWith(
					[{ query: singleQuery, values: [null], options: { partial: true } }],
					nodeOptions,
				);
			});

			it('should still reject null before v2.8', async () => {
				await expect(runWithResolvedValue(2.7, null)).rejects.toThrow(
					'Query Parameters must be a string of comma-separated values or an array of values',
				);
			});
		});
	});
});

describe('Test PostgresV2, insert operation', () => {
	afterEach(() => {
		vi.clearAllMocks();
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
			nodeOptions,
		);
	});

	it('dataMode: define, should accept an array with values if column is of type json', async () => {
		const convertValuesToJsonWithPgpSpy = vi.spyOn(utils, 'convertValuesToJsonWithPgp');
		const hasJsonDataTypeInSchemaSpy = vi.spyOn(utils, 'hasJsonDataTypeInSchema');

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
			nodeOptions,
		);
	});

	it('should handle type validation errors with continueOnFail=true', async () => {
		const nodeParameters: IDataObject = {
			operation: 'insert',
			schema: {
				__rl: true,
				mode: 'list',
				value: 'public',
			},
			table: {
				__rl: true,
				mode: 'list',
				value: 'my_table',
			},
			'columns.mappingMode': 'defineBelow',
			valuesToSend: {
				values: [
					{
						column: 'id',
						value: '1',
					},
				],
			},
			options: {
				nodeVersion: 2.6,
			},
		};
		const nodeOptions = nodeParameters.options as IDataObject;
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO', udt_name: '' },
		];
		const error = new Error('Test error');

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters);
		fakeExecuteFunction.continueOnFail = () => true;
		const originalGetNodeParameter = fakeExecuteFunction.getNodeParameter;
		fakeExecuteFunction.getNodeParameter = ((
			parameterName: string,
			_itemIndex: number,
			fallbackValue?: IDataObject,
			options?: IGetNodeParameterOptions,
		) => {
			if (parameterName === 'columns.value') {
				throw error;
			}

			return originalGetNodeParameter(parameterName, _itemIndex, fallbackValue, options);
		}) as typeof fakeExecuteFunction.getNodeParameter;

		const result = await insert.execute.call(
			fakeExecuteFunction,
			runQueries,
			items,
			nodeOptions,
			createMockDb(columnsInfo),
			pgPromise(),
		);

		expect(result).toEqual([
			{
				json: { error },
				pairedItem: { item: 0 },
			},
		]);
	});
});

describe('Test PostgresV2, select operation', () => {
	afterEach(() => {
		vi.clearAllMocks();
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
			createMockDb([]),
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query: 'SELECT * FROM $1:name.$2:name',
					values: ['public', 'my_table'],
				},
			],
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
			createMockDb([]),
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query:
						'SELECT $3:name FROM $1:name.$2:name WHERE $4:name >= $5 AND $6:name = $7 ORDER BY $8:name ASC LIMIT $9',
					values: ['public', 'my_table', ['json', 'id'], 'id', 2, 'foo', 'data 2', 'id', 5],
				},
			],
			nodeOptions,
		);
	});

	it('limit, throw on invalid value', async () => {
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
			limit: '2; select 1,2;',
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

		const promise = select.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
			createMockDb([]),
		);
		await expect(promise).rejects.toThrow('Failed to parse value to number');
	});
});

describe('Test PostgresV2, select operation with Start After', () => {
	const uniqueColumnInfo: StartAfterColumnInfo = {
		relkind: 'r',
		column_exists: true,
		not_null: true,
		data_type: 'integer',
		is_timestamp: false,
		outputs_object: false,
		is_numeric: false,
		is_unique: true,
		has_child_tables: false,
	};

	const createColumnInfoDb = (info: StartAfterColumnInfo | null = uniqueColumnInfo) => {
		const oneOrNone = vi.fn().mockResolvedValue(info);
		return { db: { oneOrNone } as unknown as PgpDatabase, oneOrNone };
	};

	const selectParameters = (
		startAfter: IDataObject,
		parameters: IDataObject = {},
	): IDataObject => ({
		operation: 'select',
		schema: { __rl: true, mode: 'list', value: 'public' },
		table: { __rl: true, value: 'orders', mode: 'list', cachedResultName: 'orders' },
		limit: 100,
		startAfter: { values: startAfter },
		options: {},
		...parameters,
	});

	// Like n8n, throw when a parameter is missing and there is no fallback value.
	const createStrictMockExecuteFunction = (nodeParameters: IDataObject) => {
		const context = createMockExecuteFunction(nodeParameters);
		const getNodeParameter = context.getNodeParameter.bind(context);
		context.getNodeParameter = ((
			name: string,
			itemIndex: number,
			fallbackValue?: IDataObject,
			options?: IGetNodeParameterOptions,
		) => {
			const value = getNodeParameter(name, itemIndex, fallbackValue, options);
			if (value === undefined) throw new Error(`Could not get parameter "${name}"`);
			return value;
		}) as IExecuteFunctions['getNodeParameter'];
		return context;
	};

	const runSelect = async (
		nodeParameters: IDataObject,
		db: PgpDatabase = createColumnInfoDb().db,
		inputItems = items,
	) =>
		await select.execute.call(
			createStrictMockExecuteFunction(nodeParameters),
			runQueries,
			inputItems,
			nodeParameters.options as IDataObject,
			db,
		);

	const expectQuery = (query: string, values: unknown[]) =>
		expect(runQueries).toHaveBeenCalledWith([{ query, values }], {});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should give the first page sorted by the column when the value is empty', async () => {
		const { db, oneOrNone } = createColumnInfoDb();

		await runSelect(selectParameters({ column: 'id', value: '' }), db);

		expectQuery('SELECT * FROM $1:name.$2:name ORDER BY $3:name ASC LIMIT $4', [
			'public',
			'orders',
			'id',
			100,
		]);
		const [lookup] = oneOrNone.mock.calls[0];
		expect(lookup.text).toContain('pg_catalog.pg_index');
		expect(lookup.values).toEqual(['public', 'orders', 'id']);
	});

	it('should give the first page when the value is null', async () => {
		await runSelect(selectParameters({ column: 'id', value: null }));

		expectQuery('SELECT * FROM $1:name.$2:name ORDER BY $3:name ASC LIMIT $4', [
			'public',
			'orders',
			'id',
			100,
		]);
	});

	it('should give the rows after the value and send the value as text', async () => {
		await runSelect(selectParameters({ column: 'id', value: 5 }));

		expectQuery('SELECT * FROM $1:name.$2:name WHERE $3:name > $4 ORDER BY $5:name ASC LIMIT $6', [
			'public',
			'orders',
			'id',
			'5',
			'id',
			100,
		]);
	});

	it('should use 0 as a value, not as the first page', async () => {
		await runSelect(selectParameters({ column: 'id', value: 0 }));

		expectQuery('SELECT * FROM $1:name.$2:name WHERE $3:name > $4 ORDER BY $5:name ASC LIMIT $6', [
			'public',
			'orders',
			'id',
			'0',
			'id',
			100,
		]);
	});

	it('should keep a text value that looks like a number as text', async () => {
		await runSelect(
			selectParameters(
				{ column: 'code', value: '10' },
				{ table: { __rl: true, value: 'skus', mode: 'list' } },
			),
		);

		expectQuery('SELECT * FROM $1:name.$2:name WHERE $3:name > $4 ORDER BY $5:name ASC LIMIT $6', [
			'public',
			'skus',
			'code',
			'10',
			'code',
			100,
		]);
	});

	it('should put brackets around the conditions in Select Rows', async () => {
		await runSelect(
			selectParameters(
				{ column: 'id', value: '12' },
				{
					where: {
						values: [
							{ column: 'status', condition: 'equal', value: 'new' },
							{ column: 'customer', condition: 'equal', value: 'Acme Corp' },
						],
					},
					combineConditions: 'OR',
				},
			),
		);

		expectQuery(
			'SELECT * FROM $1:name.$2:name WHERE ($3:name = $4 OR $5:name = $6) AND $7:name > $8 ORDER BY $9:name ASC LIMIT $10',
			['public', 'orders', 'status', 'new', 'customer', 'Acme Corp', 'id', '12', 'id', 100],
		);
	});

	it('should keep the conditions in Select Rows as they are on the first page', async () => {
		await runSelect(
			selectParameters(
				{ column: 'id', value: '' },
				{
					where: {
						values: [
							{ column: 'status', condition: 'equal', value: 'new' },
							{ column: 'customer', condition: 'equal', value: 'Acme Corp' },
						],
					},
					combineConditions: 'OR',
				},
			),
		);

		expectQuery(
			'SELECT * FROM $1:name.$2:name WHERE $3:name = $4 OR $5:name = $6 ORDER BY $7:name ASC LIMIT $8',
			['public', 'orders', 'status', 'new', 'customer', 'Acme Corp', 'id', 100],
		);
	});

	it('should give the rows before the value when the column is sorted DESC', async () => {
		await runSelect(
			selectParameters(
				{ column: 'id', value: '901' },
				{ sort: { values: [{ column: 'id', direction: 'DESC' }] } },
			),
		);

		expectQuery('SELECT * FROM $1:name.$2:name WHERE $3:name < $4 ORDER BY $5:name DESC LIMIT $6', [
			'public',
			'orders',
			'id',
			'901',
			'id',
			100,
		]);
	});

	it('should give the biggest values first on the first page when the column is sorted DESC', async () => {
		await runSelect(
			selectParameters(
				{ column: 'id', value: '' },
				{ sort: { values: [{ column: 'id', direction: 'DESC' }] } },
			),
		);

		expectQuery('SELECT * FROM $1:name.$2:name ORDER BY $3:name DESC LIMIT $4', [
			'public',
			'orders',
			'id',
			100,
		]);
	});

	it('should keep the sort rules after the column', async () => {
		await runSelect(
			selectParameters(
				{ column: 'id', value: '5' },
				{
					sort: {
						values: [
							{ column: 'id', direction: 'ASC' },
							{ column: 'customer', direction: 'DESC' },
						],
					},
				},
			),
		);

		expectQuery(
			'SELECT * FROM $1:name.$2:name WHERE $3:name > $4 ORDER BY $5:name ASC, $6:name DESC LIMIT $7',
			['public', 'orders', 'id', '5', 'id', 'customer', 100],
		);
	});

	it('should throw when another sort rule comes before the column', async () => {
		const { db, oneOrNone } = createColumnInfoDb();

		await expect(
			runSelect(
				selectParameters(
					{ column: 'id', value: '5' },
					{
						sort: {
							values: [
								{ column: 'customer', direction: 'ASC' },
								{ column: 'id', direction: 'ASC' },
							],
						},
					},
				),
				db,
			),
		).rejects.toThrow('Sort by "id" first');
		expect(oneOrNone).not.toHaveBeenCalled();
		expect(runQueries).not.toHaveBeenCalled();
	});

	it('should tell how to fix the sort when the column is in Sort but not first', async () => {
		await expect(
			runSelect(
				selectParameters(
					{ column: 'id', value: '5' },
					{
						sort: {
							values: [
								{ column: 'customer', direction: 'ASC' },
								{ column: 'id', direction: 'ASC' },
							],
						},
					},
				),
			),
		).rejects.toMatchObject({
			description: expect.stringContaining('Move "id" to the top of Sort.'),
		});
	});

	it('should tell how to fix the sort when the column is not in Sort', async () => {
		await expect(
			runSelect(
				selectParameters(
					{ column: 'id', value: '5' },
					{ sort: { values: [{ column: 'customer', direction: 'ASC' }] } },
				),
			),
		).rejects.toMatchObject({
			description: expect.stringContaining('Add "id" as the first sort rule'),
		});
	});

	it('should throw when the value is a number too big to be exact', async () => {
		await expect(
			runSelect(selectParameters({ column: 'id', value: 9007199254740992 })),
		).rejects.toThrow('The Start After value is too big to be exact');
	});

	it('should accept a big number as text', async () => {
		await runSelect(selectParameters({ column: 'id', value: '9007199254740993' }));

		expectQuery('SELECT * FROM $1:name.$2:name WHERE $3:name > $4 ORDER BY $5:name ASC LIMIT $6', [
			'public',
			'orders',
			'id',
			'9007199254740993',
			'id',
			100,
		]);
	});

	it('should throw when Output Columns is one string that is not the column', async () => {
		await expect(
			runSelect(
				selectParameters({ column: 'id', value: '5' }, { options: { outputColumns: 'tenant_id' } }),
			),
		).rejects.toThrow('Add "id" to Output Columns');
	});

	it('should throw when Output Columns leaves out the column', async () => {
		await expect(
			runSelect(
				selectParameters(
					{ column: 'id', value: '5' },
					{ options: { outputColumns: ['customer'] } },
				),
			),
		).rejects.toThrow('Add "id" to Output Columns');
		expect(runQueries).not.toHaveBeenCalled();
	});

	it('should accept Output Columns that include the column', async () => {
		await runSelect(
			selectParameters(
				{ column: 'id', value: '5' },
				{ options: { outputColumns: ['id', 'customer'] } },
			),
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query:
						'SELECT $3:name FROM $1:name.$2:name WHERE $4:name > $5 ORDER BY $6:name ASC LIMIT $7',
					values: ['public', 'orders', ['id', 'customer'], 'id', '5', 'id', 100],
				},
			],
			{ outputColumns: ['id', 'customer'] },
		);
	});

	it.each<[string, Partial<StartAfterColumnInfo> | null, string, string]>([
		[
			'not unique',
			{ is_unique: false },
			'created_on',
			'Column "created_on" has no unique index that Start After can use',
		],
		['nullable', { not_null: false }, 'email', 'Column "email" can be null'],
		[
			'a timestamp',
			{ is_timestamp: true, data_type: 'timestamp without time zone' },
			'happened_at',
			'Start After does not support the timestamp column "happened_at"',
		],
		[
			'in a view',
			{ relkind: 'v', is_unique: false, not_null: false },
			'id',
			'Start After cannot page the view "public.orders"',
		],
		[
			'missing',
			{ column_exists: false },
			'nope',
			'Column "nope" does not exist in "public.orders"',
		],
		[
			'in a table with child tables',
			{ has_child_tables: true },
			'id',
			'Values of "id" can repeat in the child tables of "public.orders"',
		],
		[
			'in a materialized view',
			{ relkind: 'm', not_null: false },
			'id',
			'Start After cannot page the materialized view "public.orders"',
		],
		[
			'in a foreign table',
			{ relkind: 'f', is_unique: false },
			'id',
			'Start After cannot page the foreign table "public.orders"',
		],
		[
			'of a type that n8n outputs as an object',
			{ outputs_object: true, data_type: 'bytea' },
			'id',
			'Start After does not support the column "id" of type bytea',
		],
		['in a table that does not exist', null, 'id', 'Table "public.orders" does not exist'],
	])('should throw when the column is %s', async (_, info, column, message) => {
		const { db } = createColumnInfoDb(info && { ...uniqueColumnInfo, ...info });

		await expect(runSelect(selectParameters({ column, value: '5' }), db)).rejects.toThrow(message);
		expect(runQueries).not.toHaveBeenCalled();
	});

	it('should name the problem in the error description', async () => {
		const { db } = createColumnInfoDb({ ...uniqueColumnInfo, is_unique: false });

		await expect(
			runSelect(selectParameters({ column: 'created_on', value: '' }), db),
		).rejects.toMatchObject({
			description: expect.stringContaining('unique index on this column alone'),
		});
	});

	it('should not add a limit when Return All is on', async () => {
		await runSelect(selectParameters({ column: 'id', value: '5' }, { returnAll: true }));

		expectQuery('SELECT * FROM $1:name.$2:name WHERE $3:name > $4 ORDER BY $5:name ASC', [
			'public',
			'orders',
			'id',
			'5',
			'id',
		]);
	});

	it('should read the indexes once per run for the same column', async () => {
		const { db, oneOrNone } = createColumnInfoDb();

		await runSelect(selectParameters({ column: 'id', value: '5' }), db, [
			{ json: {} },
			{ json: {} },
			{ json: {} },
		]);

		expect(oneOrNone).toHaveBeenCalledTimes(1);
		expect(vi.mocked(runQueries).mock.calls[0][0]).toHaveLength(3);
	});

	it('should read the indexes for each table', async () => {
		const { db, oneOrNone } = createColumnInfoDb();
		const tables = ['orders', 'orders', 'customers'];
		const context = createMockExecuteFunction(selectParameters({ column: 'id', value: '5' }));
		const getNodeParameter = context.getNodeParameter.bind(context);
		context.getNodeParameter = ((name: string, itemIndex: number, ...rest: unknown[]) =>
			name === 'table'
				? tables[itemIndex]
				: getNodeParameter(
						name,
						itemIndex,
						...(rest as []),
					)) as IExecuteFunctions['getNodeParameter'];

		await select.execute.call(
			context,
			runQueries,
			[{ json: {} }, { json: {} }, { json: {} }],
			{},
			db,
		);

		expect(oneOrNone).toHaveBeenCalledTimes(2);
		expect(oneOrNone.mock.calls[1][0].values).toEqual(['public', 'customers', 'id']);
	});

	it('should throw when the node version is older than 2.7', async () => {
		const { db, oneOrNone } = createColumnInfoDb();

		await expect(
			runSelect(
				selectParameters({ column: 'id', value: '5' }, { options: { nodeVersion: 2.6 } }),
				db,
			),
		).rejects.toThrow('Start After needs version 2.7 or later of the Postgres node');
		expect(oneOrNone).not.toHaveBeenCalled();
		expect(runQueries).not.toHaveBeenCalled();
	});

	it('should page from node version 2.7', async () => {
		await runSelect(
			selectParameters({ column: 'id', value: '5' }, { options: { nodeVersion: 2.7 } }),
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query: 'SELECT * FROM $1:name.$2:name WHERE $3:name > $4 ORDER BY $5:name ASC LIMIT $6',
					values: ['public', 'orders', 'id', '5', 'id', 100],
				},
			],
			{ nodeVersion: 2.7 },
		);
	});

	it('should build the same SQL as before on an old node version without Start After', async () => {
		await runSelect(selectParameters({}, { startAfter: {}, options: { nodeVersion: 2.6 } }));

		expect(runQueries).toHaveBeenCalledWith(
			[{ query: 'SELECT * FROM $1:name.$2:name LIMIT $3', values: ['public', 'orders', 100] }],
			{ nodeVersion: 2.6 },
		);
	});

	it('should throw for a numeric column when large numbers come back as numbers', async () => {
		const { db } = createColumnInfoDb({
			...uniqueColumnInfo,
			is_numeric: true,
			data_type: 'numeric',
		});

		await expect(
			runSelect(
				selectParameters(
					{ column: 'amount', value: '' },
					{ options: { largeNumbersOutput: 'numbers' } },
				),
				db,
			),
		).rejects.toThrow('Set Output Large-Format Numbers As to Text to page by "amount"');
		expect(runQueries).not.toHaveBeenCalled();
	});

	it('should page by a numeric column when large numbers come back as text', async () => {
		const { db } = createColumnInfoDb({
			...uniqueColumnInfo,
			is_numeric: true,
			data_type: 'numeric',
		});

		await runSelect(
			selectParameters(
				{ column: 'amount', value: '0.12345678901234567' },
				{ options: { largeNumbersOutput: 'text' } },
			),
			db,
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query: 'SELECT * FROM $1:name.$2:name WHERE $3:name > $4 ORDER BY $5:name ASC LIMIT $6',
					values: ['public', 'orders', 'amount', '0.12345678901234567', 'amount', 100],
				},
			],
			{ largeNumbersOutput: 'text' },
		);
	});

	it('should throw when Column is empty', async () => {
		await expect(runSelect(selectParameters({ column: '', value: '5' }))).rejects.toThrow(
			'Choose a column in Start After',
		);
	});

	it('should throw when the value is an object', async () => {
		await expect(runSelect(selectParameters({ column: 'id', value: { id: 5 } }))).rejects.toThrow(
			'The Start After value must be text or a number',
		);
	});

	it('should build the same SQL as before when the node has no Start After parameter', async () => {
		const { db, oneOrNone } = createColumnInfoDb();
		const { startAfter: _, ...parameters } = selectParameters({});

		await runSelect({ ...parameters, limit: 5 }, db);

		expectQuery('SELECT * FROM $1:name.$2:name LIMIT $3', ['public', 'orders', 5]);
		expect(oneOrNone).not.toHaveBeenCalled();
	});

	it('should not read the indexes without Start After', async () => {
		const { db, oneOrNone } = createColumnInfoDb();

		await runSelect(
			selectParameters(
				{},
				{ startAfter: {}, sort: { values: [{ column: 'id', direction: 'ASC' }] } },
			),
			db,
		);

		expectQuery('SELECT * FROM $1:name.$2:name ORDER BY $3:name ASC LIMIT $4', [
			'public',
			'orders',
			'id',
			100,
		]);
		expect(oneOrNone).not.toHaveBeenCalled();
	});
});

describe('Test PostgresV2, update operation', () => {
	afterEach(() => {
		vi.clearAllMocks();
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
			nodeOptions,
		);
	});

	it('should handle type validation errors with continueOnFail=true', async () => {
		const nodeParameters: IDataObject = {
			operation: 'update',
			schema: {
				__rl: true,
				mode: 'list',
				value: 'public',
			},
			table: {
				__rl: true,
				mode: 'list',
				value: 'my_table',
			},
			columnToMatchOn: 'id',
			'columns.mappingMode': 'defineBelow',
			valuesToSend: {
				values: [
					{
						column: 'id',
						value: '1',
					},
				],
			},
			options: {
				nodeVersion: 2.6,
			},
		};
		const nodeOptions = nodeParameters.options as IDataObject;
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO', udt_name: '' },
		];
		const error = new Error('Test error');

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters);
		fakeExecuteFunction.continueOnFail = () => true;
		const originalGetNodeParameter = fakeExecuteFunction.getNodeParameter;
		fakeExecuteFunction.getNodeParameter = ((
			parameterName: string,
			_itemIndex: number,
			fallbackValue?: IDataObject,
			options?: IGetNodeParameterOptions,
		) => {
			if (parameterName === 'columns.value') {
				throw error;
			}

			return originalGetNodeParameter(parameterName, _itemIndex, fallbackValue, options);
		}) as typeof fakeExecuteFunction.getNodeParameter;

		const result = await update.execute.call(
			fakeExecuteFunction,
			runQueries,
			items,
			nodeOptions,
			createMockDb(columnsInfo),
		);

		expect(result).toEqual([
			{
				json: { error },
				pairedItem: { item: 0 },
			},
		]);
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
			nodeOptions,
		);
	});

	it('should handle type validation errors with continueOnFail=true', async () => {
		const nodeParameters: IDataObject = {
			operation: 'upsert',
			schema: {
				__rl: true,
				mode: 'list',
				value: 'public',
			},
			table: {
				__rl: true,
				mode: 'list',
				value: 'my_table',
			},
			columnToMatchOn: 'id',
			'columns.mappingMode': 'defineBelow',
			valuesToSend: {
				values: [
					{
						column: 'id',
						value: '1',
					},
				],
			},
			options: {
				nodeVersion: 2.6,
			},
		};
		const nodeOptions = nodeParameters.options as IDataObject;
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO', udt_name: '' },
		];
		const error = new Error('Test error');

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters);
		fakeExecuteFunction.continueOnFail = () => true;
		const originalGetNodeParameter = fakeExecuteFunction.getNodeParameter;
		fakeExecuteFunction.getNodeParameter = ((
			parameterName: string,
			_itemIndex: number,
			fallbackValue?: IDataObject,
			options?: IGetNodeParameterOptions,
		) => {
			if (parameterName === 'columns.value') {
				throw error;
			}

			return originalGetNodeParameter(parameterName, _itemIndex, fallbackValue, options);
		}) as typeof fakeExecuteFunction.getNodeParameter;

		const result = await upsert.execute.call(
			fakeExecuteFunction,
			runQueries,
			items,
			nodeOptions,
			createMockDb(columnsInfo),
		);

		expect(result).toEqual([
			{
				json: { error },
				pairedItem: { item: 0 },
			},
		]);
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
			nodeOptions,
		);
	});
});
