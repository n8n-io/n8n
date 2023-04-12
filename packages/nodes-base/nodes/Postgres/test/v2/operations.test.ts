import type { IDataObject, IExecuteFunctions, IGetNodeParameterOptions, INode } from 'n8n-workflow';

import type { ColumnInfo, PgpDatabase, QueriesRunner } from '../../v2/helpers/interfaces';

import { get } from 'lodash';

import * as deleteTable from '../../v2/actions/database/deleteTable.operation';
import * as executeQuery from '../../v2/actions/database/executeQuery.operation';
import * as insert from '../../v2/actions/database/insert.operation';
import * as select from '../../v2/actions/database/select.operation';
import * as update from '../../v2/actions/database/update.operation';
import * as upsert from '../../v2/actions/database/upsert.operation';

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
			fallbackValue?: IDataObject | undefined,
			options?: IGetNodeParameterOptions | undefined,
		) {
			const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
			return get(nodeParameters, parameter, fallbackValue);
		},
		getNode() {
			return node;
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

// if node parameters copied from canvas all default parameters has to be added manualy as JSON would not have them
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
			options: {},
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
			options: {},
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
			[{ query: 'select * from $1:name;', values: ['my_table'] }],
			items,
			nodeOptions,
		);
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
			options: {},
		};
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
			{ column_name: 'json', data_type: 'json', is_nullable: 'NO' },
			{ column_name: 'foo', data_type: 'text', is_nullable: 'NO' },
		];

		const nodeOptions = nodeParameters.options as IDataObject;

		await insert.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
			createMockDb(columnsInfo),
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
			options: {},
		};
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
			{ column_name: 'json', data_type: 'json', is_nullable: 'NO' },
			{ column_name: 'foo', data_type: 'text', is_nullable: 'NO' },
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
			},
		};
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
			{ column_name: 'json', data_type: 'json', is_nullable: 'NO' },
			{ column_name: 'foo', data_type: 'text', is_nullable: 'NO' },
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
			options: {},
		};
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
			{ column_name: 'json', data_type: 'json', is_nullable: 'NO' },
			{ column_name: 'foo', data_type: 'text', is_nullable: 'NO' },
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
			},
		};
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
			{ column_name: 'json', data_type: 'json', is_nullable: 'NO' },
			{ column_name: 'foo', data_type: 'text', is_nullable: 'NO' },
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
			options: {},
		};
		const columnsInfo: ColumnInfo[] = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
			{ column_name: 'json', data_type: 'json', is_nullable: 'NO' },
			{ column_name: 'foo', data_type: 'text', is_nullable: 'NO' },
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
