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

	it('deleteCommand: delete, should call runQueries with', async () => {
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

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, mySqlMockNode);

		const runQueries: QueryRunner = configureQueryRunner.call(
			fakeExecuteFunction,
			nodeOptions,
			pool,
		);

		const result = await deleteTable.execute.call(fakeExecuteFunction, emptyInputItems, runQueries);

		expect(result).toBeDefined();
	});
});
