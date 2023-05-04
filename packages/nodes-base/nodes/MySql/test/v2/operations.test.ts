import type { IDataObject, INode } from 'n8n-workflow';

import { createMockExecuteFunction } from '../../../../test/nodes/Helpers';

import * as deleteTable from '../../v2/actions/database/deleteTable.operation';
import * as executeQuery from '../../v2/actions/database/executeQuery.operation';
import * as insert from '../../v2/actions/database/insert.operation';
import * as select from '../../v2/actions/database/select.operation';
import * as update from '../../v2/actions/database/update.operation';
import * as upsert from '../../v2/actions/database/upsert.operation';

import type { Mysql2Pool, QueryRunner } from '../../v2/helpers/interfaces';
import { configureQueryRunner } from '../../v2/helpers/utils';

import mysql2 from 'mysql2/promise';

const mySqlMockNode: INode = {
	id: '1',
	name: 'MySQL node',
	typeVersion: 2,
	type: 'n8n-nodes-base.mySql',
	position: [60, 760],
	parameters: {
		operation: 'select',
	},
};

const fakeConnection = {
	format(query: string, values: any[]) {
		return mysql2.format(query, values);
	},
	query: jest.fn(async (_query = '') => [{}]),
	release: jest.fn(),
	beginTransaction: jest.fn(),
	commit: jest.fn(),
	rollback: jest.fn(),
};

const createFakePool = (connection: IDataObject) => {
	return {
		getConnection() {
			return connection;
		},
		query: jest.fn(async () => [{}]),
	} as unknown as Mysql2Pool;
};

const emptyInputItems = [{ json: {}, pairedItem: { item: 0, input: undefined } }];

describe('Test MySql V2, operations', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should have all operations', () => {
		expect(deleteTable.execute).toBeDefined();
		expect(deleteTable.description).toBeDefined();
		expect(executeQuery.execute).toBeDefined();
		expect(executeQuery.description).toBeDefined();
		expect(insert.execute).toBeDefined();
		expect(insert.description).toBeDefined();
		expect(select.execute).toBeDefined();
		expect(select.description).toBeDefined();
		expect(update.execute).toBeDefined();
		expect(update.description).toBeDefined();
		expect(upsert.execute).toBeDefined();
		expect(upsert.description).toBeDefined();
	});

	it('deleteTable: drop, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'deleteTable',
			table: {
				__rl: true,
				value: 'test_table',
				mode: 'list',
				cachedResultName: 'test_table',
			},
			deleteCommand: 'drop',
			options: {},
		};

		const nodeOptions = nodeParameters.options as IDataObject;

		const pool = createFakePool(fakeConnection);

		const poolQuerySpy = jest.spyOn(pool, 'query');

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, mySqlMockNode);

		const runQueries: QueryRunner = configureQueryRunner.call(
			fakeExecuteFunction,
			nodeOptions,
			pool,
		);

		const result = await deleteTable.execute.call(fakeExecuteFunction, emptyInputItems, runQueries);

		expect(result).toBeDefined();
		expect(result).toEqual([{ json: { success: true } }]);

		expect(poolQuerySpy).toBeCalledTimes(1);
		expect(poolQuerySpy).toBeCalledWith('DROP TABLE IF EXISTS `test_table`');
	});

	it('deleteTable: truncate, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'deleteTable',
			table: {
				__rl: true,
				value: 'test_table',
				mode: 'list',
				cachedResultName: 'test_table',
			},
			deleteCommand: 'truncate',
			options: {},
		};

		const nodeOptions = nodeParameters.options as IDataObject;

		const pool = createFakePool(fakeConnection);

		const poolQuerySpy = jest.spyOn(pool, 'query');

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, mySqlMockNode);

		const runQueries: QueryRunner = configureQueryRunner.call(
			fakeExecuteFunction,
			nodeOptions,
			pool,
		);

		const result = await deleteTable.execute.call(fakeExecuteFunction, emptyInputItems, runQueries);

		expect(result).toBeDefined();
		expect(result).toEqual([{ json: { success: true } }]);

		expect(poolQuerySpy).toBeCalledTimes(1);
		expect(poolQuerySpy).toBeCalledWith('TRUNCATE TABLE `test_table`');
	});

	it('deleteTable: delete, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'deleteTable',
			table: {
				__rl: true,
				value: 'test_table',
				mode: 'list',
				cachedResultName: 'test_table',
			},
			deleteCommand: 'delete',
			where: {
				values: [
					{
						column: 'id',
						condition: 'equal',
						value: '1',
					},
					{
						column: 'name',
						condition: 'LIKE',
						value: 'some%',
					},
				],
			},
			options: {},
		};

		const nodeOptions = nodeParameters.options as IDataObject;

		const pool = createFakePool(fakeConnection);

		const poolQuerySpy = jest.spyOn(pool, 'query');

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, mySqlMockNode);

		const runQueries: QueryRunner = configureQueryRunner.call(
			fakeExecuteFunction,
			nodeOptions,
			pool,
		);

		const result = await deleteTable.execute.call(fakeExecuteFunction, emptyInputItems, runQueries);

		expect(result).toBeDefined();
		expect(result).toEqual([{ json: { success: true } }]);

		expect(poolQuerySpy).toBeCalledTimes(1);
		expect(poolQuerySpy).toBeCalledWith(
			"DELETE FROM `test_table` WHERE `id` = '1' AND `name` LIKE 'some%'",
		);
	});

	it('executeQuery, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'executeQuery',
			query:
				"DROP TABLE IF EXISTS $1:name;\ncreate table $1:name (id INT, name TEXT);\ninsert into $1:name (id, name) values (1, 'test 1');\nselect * from $1:name;\n",
			options: {
				queryBatching: 'independently',
				queryReplacement: 'test_table',
			},
		};

		const nodeOptions = nodeParameters.options as IDataObject;

		const fakeConnectionCopy = { ...fakeConnection };

		fakeConnectionCopy.query = jest.fn(async (query?: string) => {
			const result = [];
			console.log(query);
			if (query?.toLowerCase().includes('select')) {
				result.push([{ id: 1, name: 'test 1' }]);
			} else {
				result.push({});
			}
			return result;
		});
		const pool = createFakePool(fakeConnectionCopy);

		const connectionQuerySpy = jest.spyOn(fakeConnectionCopy, 'query');

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, mySqlMockNode);

		const runQueries: QueryRunner = configureQueryRunner.call(
			fakeExecuteFunction,
			nodeOptions,
			pool,
		);

		const result = await executeQuery.execute.call(
			fakeExecuteFunction,
			emptyInputItems,
			runQueries,
			nodeOptions,
		);

		expect(result).toBeDefined();
		expect(result).toEqual([
			{
				json: {
					id: 1,
					name: 'test 1',
				},
				pairedItem: {
					item: 0,
				},
			},
		]);

		expect(connectionQuerySpy).toBeCalledTimes(4);
		expect(connectionQuerySpy).toBeCalledWith('DROP TABLE IF EXISTS `test_table`');
		expect(connectionQuerySpy).toBeCalledWith('create table `test_table` (id INT, name TEXT)');
		expect(connectionQuerySpy).toBeCalledWith(
			"insert into `test_table` (id, name) values (1, 'test 1')",
		);
		expect(connectionQuerySpy).toBeCalledWith('select * from `test_table`');
	});

	it('select, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'select',
			table: {
				__rl: true,
				value: 'test_table',
				mode: 'list',
				cachedResultName: 'test_table',
			},
			limit: 2,
			where: {
				values: [
					{
						column: 'id',
						condition: '>',
						value: '1',
					},
					{
						column: 'name',
						value: 'test',
					},
				],
			},
			combineConditions: 'OR',
			sort: {
				values: [
					{
						column: 'id',
						direction: 'DESC',
					},
				],
			},
			options: {
				queryBatching: 'transaction',
				detailedOutput: false,
			},
		};

		const nodeOptions = nodeParameters.options as IDataObject;

		const pool = createFakePool(fakeConnection);

		const connectionQuerySpy = jest.spyOn(fakeConnection, 'query');

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, mySqlMockNode);

		const runQueries: QueryRunner = configureQueryRunner.call(
			fakeExecuteFunction,
			nodeOptions,
			pool,
		);

		const result = await select.execute.call(fakeExecuteFunction, emptyInputItems, runQueries);

		expect(result).toBeDefined();
		expect(result).toEqual([{ json: { success: true } }]);

		const connectionBeginTransactionSpy = jest.spyOn(fakeConnection, 'beginTransaction');
		const connectionCommitSpy = jest.spyOn(fakeConnection, 'commit');

		expect(connectionBeginTransactionSpy).toBeCalledTimes(1);

		expect(connectionQuerySpy).toBeCalledTimes(1);
		expect(connectionQuerySpy).toBeCalledWith(
			"SELECT * FROM `test_table` WHERE `id` > 1 OR `name` undefined 'test' ORDER BY `id` DESC LIMIT 2",
		);

		expect(connectionCommitSpy).toBeCalledTimes(1);
	});

	it('insert, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			table: {
				__rl: true,
				value: 'test_table',
				mode: 'list',
				cachedResultName: 'test_table',
			},
			dataMode: 'defineBelow',
			valuesToSend: {
				values: [
					{
						column: 'id',
						value: '2',
					},
					{
						column: 'name',
						value: 'name 2',
					},
				],
			},
			options: {
				queryBatching: 'independently',
				priority: 'HIGH_PRIORITY',
				detailedOutput: false,
				skipOnConflict: true,
			},
		};

		const nodeOptions = nodeParameters.options as IDataObject;

		const pool = createFakePool(fakeConnection);

		const connectionQuerySpy = jest.spyOn(fakeConnection, 'query');

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, mySqlMockNode);

		const runQueries: QueryRunner = configureQueryRunner.call(
			fakeExecuteFunction,
			nodeOptions,
			pool,
		);

		const result = await insert.execute.call(
			fakeExecuteFunction,
			emptyInputItems,
			runQueries,
			nodeOptions,
		);

		expect(result).toBeDefined();
		expect(result).toEqual([{ json: { success: true } }]);

		expect(connectionQuerySpy).toBeCalledTimes(1);
		expect(connectionQuerySpy).toBeCalledWith(
			"INSERT HIGH_PRIORITY IGNORE INTO `test_table` (`id`, `name`) VALUES ('2','name 2')",
		);
	});

	it('update, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'update',
			table: {
				__rl: true,
				value: 'test_table',
				mode: 'list',
				cachedResultName: 'test_table',
			},
			dataMode: 'autoMapInputData',
			columnToMatchOn: 'id',
			options: {
				queryBatching: 'independently',
			},
		};

		const nodeOptions = nodeParameters.options as IDataObject;

		const pool = createFakePool(fakeConnection);

		const connectionQuerySpy = jest.spyOn(fakeConnection, 'query');

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, mySqlMockNode);

		const runQueries: QueryRunner = configureQueryRunner.call(
			fakeExecuteFunction,
			nodeOptions,
			pool,
		);

		const inputItems = [
			{
				json: {
					id: 42,
					name: 'test 4',
				},
			},
			{
				json: {
					id: 88,
					name: 'test 88',
				},
			},
		];

		const result = await update.execute.call(
			fakeExecuteFunction,
			inputItems,
			runQueries,
			nodeOptions,
		);

		expect(result).toBeDefined();
		expect(result).toEqual([{ json: { success: true } }, { json: { success: true } }]);

		expect(connectionQuerySpy).toBeCalledTimes(2);
		expect(connectionQuerySpy).toBeCalledWith(
			"UPDATE `test_table` SET `name` = 'test 4' WHERE `id` = 42",
		);
		expect(connectionQuerySpy).toBeCalledWith(
			"UPDATE `test_table` SET `name` = 'test 88' WHERE `id` = 88",
		);
	});

	it('upsert, should call runQueries with', async () => {
		const nodeParameters: IDataObject = {
			operation: 'upsert',
			table: {
				__rl: true,
				value: 'test_table',
				mode: 'list',
				cachedResultName: 'test_table',
			},
			columnToMatchOn: 'id',
			dataMode: 'autoMapInputData',
			options: {},
		};

		const nodeOptions = nodeParameters.options as IDataObject;

		const pool = createFakePool(fakeConnection);

		const poolQuerySpy = jest.spyOn(pool, 'query');

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, mySqlMockNode);

		const runQueries: QueryRunner = configureQueryRunner.call(
			fakeExecuteFunction,
			nodeOptions,
			pool,
		);

		const inputItems = [
			{
				json: {
					id: 42,
					name: 'test 4',
				},
			},
			{
				json: {
					id: 88,
					name: 'test 88',
				},
			},
		];

		const result = await upsert.execute.call(
			fakeExecuteFunction,
			inputItems,
			runQueries,
			nodeOptions,
		);

		expect(result).toBeDefined();
		expect(result).toEqual([{ json: { success: true } }]);

		expect(poolQuerySpy).toBeCalledTimes(1);
		expect(poolQuerySpy).toBeCalledWith(
			"INSERT INTO `test_table`(`id`, `name`) VALUES(42,'test 4') ON DUPLICATE KEY UPDATE `name` = 'test 4';INSERT INTO `test_table`(`id`, `name`) VALUES(88,'test 88') ON DUPLICATE KEY UPDATE `name` = 'test 88'",
		);
	});
});
