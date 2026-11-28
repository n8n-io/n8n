import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createServiceStack, type N8NStack } from 'n8n-containers';
import { constructExecutionMetaData } from 'n8n-core';
import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';

import { router } from '../../v2/actions/router';
import type { MysqlNodeCredentials } from '../../v2/helpers/interfaces';
import { searchTables } from '../../v2/methods/listSearch';

let stack: N8NStack;
let credentials: MysqlNodeCredentials;

beforeAll(async () => {
	stack = await createServiceStack({ services: ['mysql'] });
	const meta = stack.serviceResults.mysql!.meta as {
		externalHost: string;
		externalPort: number;
		database: string;
		username: string;
		password: string;
	};
	credentials = {
		host: meta.externalHost,
		port: meta.externalPort,
		database: meta.database,
		user: meta.username,
		password: meta.password,
		connectTimeout: 10000,
		ssl: false,
		sshTunnel: false,
	};
});

afterAll(async () => {
	await stack?.stop();
});

const node: INode = {
	id: '1',
	name: 'MySQL',
	typeVersion: 2.5,
	type: 'n8n-nodes-base.mySql',
	position: [0, 0],
	parameters: {},
};

function mockExecuteFunctions(
	params: IDataObject,
	creds: MysqlNodeCredentials,
	continueOnFail = false,
): IExecuteFunctions {
	return {
		getNodeParameter: (name: string, _i: number, fallback?: unknown) => params[name] ?? fallback,
		getNode: () => node,
		getInputData: () => [{ json: {} }],
		continueOnFail: () => continueOnFail,
		getCredentials: async () => creds,
		addExecutionHints: () => {},
		helpers: {
			constructExecutionMetaData,
			getSSHClient: () => {
				throw new Error('No SSH');
			},
		},
	} as unknown as IExecuteFunctions;
}

const badCreds: MysqlNodeCredentials = {
	host: 'invalid.host',
	port: 3306,
	database: 'x',
	user: 'x',
	password: 'x',
	connectTimeout: 1000,
	ssl: false,
	sshTunnel: false,
};

describe('MySQL Integration - NODE-4174', () => {
	test('happy path: SELECT against real MySQL', async () => {
		const params = {
			resource: 'database',
			operation: 'executeQuery',
			query: 'SELECT 1 as result',
			options: { queryBatching: 'single', nodeVersion: 2.5 },
		};

		const result = await router.call(mockExecuteFunctions(params, credentials));

		expect(result[0][0].json).toEqual({ result: 1 });
	});

	test('bad path: query error returns error item with continueOnFail', async () => {
		const params = {
			resource: 'database',
			operation: 'executeQuery',
			query: 'SELECT * FROM table_that_does_not_exist',
			options: { queryBatching: 'single', nodeVersion: 2.5 },
		};

		const result = await router.call(mockExecuteFunctions(params, credentials, true));

		expect(result[0][0].json).toHaveProperty('message');
	});

	test('connection error should return error item with continueOnFail', async () => {
		const params = {
			resource: 'database',
			operation: 'executeQuery',
			query: 'SELECT 1',
			options: { queryBatching: 'single', nodeVersion: 2.5 },
		};

		const result = await router.call(mockExecuteFunctions(params, badCreds, true));

		expect(result[0][0].json).toHaveProperty('error');
	});

	test('connection error throws when continueOnFail is false', async () => {
		const params = {
			resource: 'database',
			operation: 'executeQuery',
			query: 'SELECT 1',
			options: { queryBatching: 'single', nodeVersion: 2.5 },
		};

		await expect(router.call(mockExecuteFunctions(params, badCreds, false))).rejects.toThrow();
	});
});

describe('MySQL Integration - Select Start After', () => {
	const executeQuery = async (query: string) =>
		await router.call(
			mockExecuteFunctions(
				{
					resource: 'database',
					operation: 'executeQuery',
					query,
					options: { queryBatching: 'single', nodeVersion: 2.5 },
				},
				credentials,
			),
		);

	const selectPage = async (column: string, value: string) =>
		await router.call(
			mockExecuteFunctions(
				{
					resource: 'database',
					operation: 'select',
					table: 'paging_test',
					limit: 2,
					sort: {},
					startAfter: { values: { column, value } },
					options: { queryBatching: 'single', nodeVersion: 2.5 },
				},
				credentials,
			),
		);

	beforeAll(async () => {
		await executeQuery('DROP TABLE IF EXISTS paging_test');
		await executeQuery(
			'CREATE TABLE paging_test (id INT PRIMARY KEY, code VARCHAR(8) NOT NULL UNIQUE, grp INT, INDEX (grp))',
		);
		await executeQuery(
			"INSERT INTO paging_test (id, code, grp) VALUES (1,'g',1),(2,'f',1),(3,'e',1),(4,'d',1),(5,'c',1),(6,'b',1),(7,'a',1)",
		);
	});

	test('walks every row once over a unique non-primary column', async () => {
		const codes: string[] = [];
		let cursor = '';
		let pages = 0;

		while (true) {
			const rows = (await selectPage('code', cursor))[0];
			pages++;
			codes.push(...rows.map((row) => row.json.code as string));
			if (rows.length < 2) break;
			cursor = rows[rows.length - 1].json.code as string;
		}

		expect(codes).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
		expect(pages).toBe(4);
	});

	test('rejects a column without a single-column unique index', async () => {
		await expect(selectPage('grp', '')).rejects.toThrow('Column "grp" has no unique index');
	});
});

describe('MySQL Integration - Database parameter', () => {
	// The container user has grants on the credential database only
	const rootCredentials = (): MysqlNodeCredentials => ({
		...credentials,
		user: 'root',
		password: 'root_password',
	});

	const run = async (params: IDataObject, creds: MysqlNodeCredentials) =>
		await router.call(
			mockExecuteFunctions(
				{
					resource: 'database',
					options: { queryBatching: 'single', nodeVersion: 2.5 },
					...params,
				},
				creds,
			),
		);

	const searchTablesIn = async (database: string, creds: MysqlNodeCredentials) => {
		const params: IDataObject = { database, options: {} };
		return await searchTables.call({
			getCredentials: async () => creds,
			getNodeParameter: (name: string, fallback?: unknown) => params[name] ?? fallback,
		} as unknown as ILoadOptionsFunctions);
	};

	beforeAll(async () => {
		for (const query of [
			'CREATE DATABASE IF NOT EXISTS n8n_other',
			'DROP TABLE IF EXISTS n8n_other.items',
			'CREATE TABLE n8n_other.items (id INT PRIMARY KEY, name VARCHAR(16))',
		]) {
			await run({ operation: 'executeQuery', query }, rootCredentials());
		}
	});

	test('inserts into and selects from a database that is not the credential database', async () => {
		expect(credentials.database).not.toBe('n8n_other');

		await run(
			{
				operation: 'insert',
				database: 'n8n_other',
				table: 'items',
				dataMode: 'defineBelow',
				valuesToSend: {
					values: [
						{ column: 'id', value: 1 },
						{ column: 'name', value: 'first' },
					],
				},
			},
			rootCredentials(),
		);

		const result = await run(
			{ operation: 'select', database: 'n8n_other', table: 'items', returnAll: true },
			rootCredentials(),
		);

		expect(result[0].map((row) => row.json)).toEqual([{ id: 1, name: 'first' }]);
	});

	test('select rejects with the server error when the user cannot see the database', async () => {
		await expect(
			run(
				{ operation: 'select', database: 'n8n_other', table: 'items', returnAll: true },
				credentials,
			),
		).rejects.toThrow(/denied/i);
	});

	test('searchTables lists the tables of the chosen database', async () => {
		const { results } = await searchTablesIn('n8n_other', rootCredentials());

		expect(results.map(({ value }) => value)).toEqual(['items']);
	});

	test('searchTables rejects with the server error when the user cannot see the database', async () => {
		await expect(searchTablesIn('n8n_other', credentials)).rejects.toThrow(/denied/i);
	});

	test('searchTables rejects with the server error when the database does not exist', async () => {
		await expect(searchTablesIn('n8n_missing_db', rootCredentials())).rejects.toThrow(
			/Unknown database/,
		);
	});
});
