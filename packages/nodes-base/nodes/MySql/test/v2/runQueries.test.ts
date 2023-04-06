import { createMockExecuteFunction } from '../../../../test/nodes/Helpers';

import { configureQueryRunner } from '../../v2/helpers/utils';
import type { Mysql2Pool, QueryRunner } from '../../v2/helpers/interfaces';
import { BATCH_MODE } from '../../v2/helpers/interfaces';

import type { IDataObject, INode } from 'n8n-workflow';

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
	query: jest.fn(async () => Promise.resolve([{}])),
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
		query: jest.fn(async () => Promise.resolve([{}])),
	} as unknown as Mysql2Pool;
};

describe('Test MySql V2, runQueries', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should execute in "Single" mode, should return success true', async () => {
		const nodeOptions: IDataObject = { queryBatching: BATCH_MODE.SINGLE };

		const pool = createFakePool(fakeConnection);
		const fakeExecuteFunction = createMockExecuteFunction({}, mySqlMockNode);

		const runQueries: QueryRunner = configureQueryRunner.call(
			fakeExecuteFunction,
			nodeOptions,
			pool,
		);

		const poolGetConnectionSpy = jest.spyOn(pool, 'getConnection');
		const poolQuerySpy = jest.spyOn(pool, 'query');
		const connectionReleaseSpy = jest.spyOn(fakeConnection, 'release');
		const connectionFormatSpy = jest.spyOn(fakeConnection, 'format');

		const result = await runQueries([
			{ query: 'SELECT * FROM my_table WHERE id = ?', values: [55] },
		]);

		expect(result).toBeDefined();
		expect(result).toHaveLength(1);
		expect(result).toEqual([{ json: { success: true } }]);

		expect(poolGetConnectionSpy).toBeCalledTimes(1);

		expect(connectionReleaseSpy).toBeCalledTimes(1);

		expect(poolQuerySpy).toBeCalledTimes(1);
		expect(poolQuerySpy).toBeCalledWith('SELECT * FROM my_table WHERE id = 55');

		expect(connectionFormatSpy).toBeCalledTimes(1);
		expect(connectionFormatSpy).toBeCalledWith('SELECT * FROM my_table WHERE id = ?', [55]);
	});

	it('should execute in "independently" mode, should return success true', async () => {
		const nodeOptions: IDataObject = { queryBatching: BATCH_MODE.INDEPENDENTLY };

		const pool = createFakePool(fakeConnection);

		const fakeExecuteFunction = createMockExecuteFunction({}, mySqlMockNode);

		const runQueries: QueryRunner = configureQueryRunner.call(
			fakeExecuteFunction,
			nodeOptions,
			pool,
		);

		const poolGetConnectionSpy = jest.spyOn(pool, 'getConnection');

		const connectionReleaseSpy = jest.spyOn(fakeConnection, 'release');
		const connectionFormatSpy = jest.spyOn(fakeConnection, 'format');
		const connectionQuerySpy = jest.spyOn(fakeConnection, 'query');

		const result = await runQueries([
			{
				query: 'SELECT * FROM my_table WHERE id = ?; SELECT * FROM my_table WHERE id = ?',
				values: [55, 42],
			},
		]);

		expect(result).toBeDefined();
		expect(result).toHaveLength(1);
		expect(result).toEqual([{ json: { success: true } }]);

		expect(poolGetConnectionSpy).toBeCalledTimes(1);

		expect(connectionQuerySpy).toBeCalledTimes(2);
		expect(connectionQuerySpy).toBeCalledWith('SELECT * FROM my_table WHERE id = 55');
		expect(connectionQuerySpy).toBeCalledWith('SELECT * FROM my_table WHERE id = 42');

		expect(connectionFormatSpy).toBeCalledTimes(1);
		expect(connectionFormatSpy).toBeCalledWith(
			'SELECT * FROM my_table WHERE id = ?; SELECT * FROM my_table WHERE id = ?',
			[55, 42],
		);

		expect(connectionReleaseSpy).toBeCalledTimes(1);
	});

	it('should execute in "transaction" mode, should return success true', async () => {
		const nodeOptions: IDataObject = { queryBatching: BATCH_MODE.TRANSACTION };

		const pool = createFakePool(fakeConnection);

		const fakeExecuteFunction = createMockExecuteFunction({}, mySqlMockNode);

		const runQueries: QueryRunner = configureQueryRunner.call(
			fakeExecuteFunction,
			nodeOptions,
			pool,
		);

		const poolGetConnectionSpy = jest.spyOn(pool, 'getConnection');

		const connectionReleaseSpy = jest.spyOn(fakeConnection, 'release');
		const connectionFormatSpy = jest.spyOn(fakeConnection, 'format');
		const connectionQuerySpy = jest.spyOn(fakeConnection, 'query');
		const connectionBeginTransactionSpy = jest.spyOn(fakeConnection, 'beginTransaction');
		const connectionCommitSpy = jest.spyOn(fakeConnection, 'commit');

		const result = await runQueries([
			{
				query: 'SELECT * FROM my_table WHERE id = ?; SELECT * FROM my_table WHERE id = ?',
				values: [55, 42],
			},
		]);

		expect(result).toBeDefined();
		expect(result).toHaveLength(1);
		expect(result).toEqual([{ json: { success: true } }]);

		expect(poolGetConnectionSpy).toBeCalledTimes(1);

		expect(connectionBeginTransactionSpy).toBeCalledTimes(1);

		expect(connectionQuerySpy).toBeCalledTimes(2);
		expect(connectionQuerySpy).toBeCalledWith('SELECT * FROM my_table WHERE id = 55');
		expect(connectionQuerySpy).toBeCalledWith('SELECT * FROM my_table WHERE id = 42');

		expect(connectionFormatSpy).toBeCalledTimes(1);
		expect(connectionFormatSpy).toBeCalledWith(
			'SELECT * FROM my_table WHERE id = ?; SELECT * FROM my_table WHERE id = ?',
			[55, 42],
		);

		expect(connectionCommitSpy).toBeCalledTimes(1);

		expect(connectionReleaseSpy).toBeCalledTimes(1);
	});
});
