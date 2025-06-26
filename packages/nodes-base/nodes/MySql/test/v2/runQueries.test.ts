import mysql2 from 'mysql2/promise';
import type { IDataObject, INode } from 'n8n-workflow';

import { createMockExecuteFunction } from '@test/nodes/Helpers';

import type { Mysql2Pool, QueryRunner } from '../../v2/helpers/interfaces';
import { BATCH_MODE } from '../../v2/helpers/interfaces';
import { configureQueryRunner } from '../../v2/helpers/utils';

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
	query: jest.fn(async () => [{}]),
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

describe('Test MySql V2, runQueries', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('in single query batch mode', () => {
		it('should set paired items correctly', async () => {
			const nodeOptions = { queryBatching: BATCH_MODE.SINGLE, nodeVersion: 2 };
			const pool = createFakePool(fakeConnection);
			const mockExecuteFns = createMockExecuteFunction({}, mySqlMockNode);

			// @ts-expect-error
			pool.query = jest.fn(async () => [
				[[{ finishedAt: '2023-12-30' }], [{ finishedAt: '2023-12-31' }]],
			]);

			const result = await configureQueryRunner.call(
				mockExecuteFns,
				nodeOptions,
				pool,
			)([
				{ query: 'SELECT finishedAt FROM my_table WHERE id = ?', values: [123] },
				{ query: 'SELECT finishedAt FROM my_table WHERE id = ?', values: [456] },
			]);

			expect(result).toEqual([
				{
					json: { finishedAt: '2023-12-30' },
					pairedItem: { item: 0 },
				},
				{
					json: { finishedAt: '2023-12-31' },
					pairedItem: { item: 1 },
				},
			]);
		});
	});

	it('should execute in "Single" mode, should return success true', async () => {
		const nodeOptions: IDataObject = { queryBatching: BATCH_MODE.SINGLE, nodeVersion: 2 };

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
		expect(result).toEqual([{ json: { success: true }, pairedItem: [{ item: 0 }] }]);

		expect(poolGetConnectionSpy).toHaveBeenCalledTimes(1);

		expect(connectionReleaseSpy).toHaveBeenCalledTimes(1);

		expect(poolQuerySpy).toHaveBeenCalledTimes(1);
		expect(poolQuerySpy).toHaveBeenCalledWith('SELECT * FROM my_table WHERE id = 55');

		expect(connectionFormatSpy).toHaveBeenCalledTimes(1);
		expect(connectionFormatSpy).toHaveBeenCalledWith('SELECT * FROM my_table WHERE id = ?', [55]);
	});

	it('should execute in "independently" mode, should return success true', async () => {
		const nodeOptions: IDataObject = { queryBatching: BATCH_MODE.INDEPENDENTLY, nodeVersion: 2 };

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
		expect(result).toEqual([{ json: { success: true }, pairedItem: { item: 0 } }]);

		expect(poolGetConnectionSpy).toHaveBeenCalledTimes(1);

		expect(connectionQuerySpy).toHaveBeenCalledTimes(2);
		expect(connectionQuerySpy).toHaveBeenCalledWith('SELECT * FROM my_table WHERE id = 55');
		expect(connectionQuerySpy).toHaveBeenCalledWith('SELECT * FROM my_table WHERE id = 42');

		expect(connectionFormatSpy).toHaveBeenCalledTimes(1);
		expect(connectionFormatSpy).toHaveBeenCalledWith(
			'SELECT * FROM my_table WHERE id = ?; SELECT * FROM my_table WHERE id = ?',
			[55, 42],
		);

		expect(connectionReleaseSpy).toHaveBeenCalledTimes(1);
	});

	it('should execute in "transaction" mode, should return success true', async () => {
		const nodeOptions: IDataObject = { queryBatching: BATCH_MODE.TRANSACTION, nodeVersion: 2 };

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
		expect(result).toEqual([{ json: { success: true }, pairedItem: { item: 0 } }]);

		expect(poolGetConnectionSpy).toHaveBeenCalledTimes(1);

		expect(connectionBeginTransactionSpy).toHaveBeenCalledTimes(1);

		expect(connectionQuerySpy).toHaveBeenCalledTimes(2);
		expect(connectionQuerySpy).toHaveBeenCalledWith('SELECT * FROM my_table WHERE id = 55');
		expect(connectionQuerySpy).toHaveBeenCalledWith('SELECT * FROM my_table WHERE id = 42');

		expect(connectionFormatSpy).toHaveBeenCalledTimes(1);
		expect(connectionFormatSpy).toHaveBeenCalledWith(
			'SELECT * FROM my_table WHERE id = ?; SELECT * FROM my_table WHERE id = ?',
			[55, 42],
		);

		expect(connectionCommitSpy).toHaveBeenCalledTimes(1);

		expect(connectionReleaseSpy).toHaveBeenCalledTimes(1);
	});
});
