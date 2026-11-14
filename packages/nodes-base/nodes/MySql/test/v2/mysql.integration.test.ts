import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createServiceStack, type N8NStack } from 'n8n-containers';
import { constructExecutionMetaData } from 'n8n-core';
import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';

import { router } from '../../v2/actions/router';
import type { MysqlNodeCredentials } from '../../v2/helpers/interfaces';

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
			options: { queryBatching: 'single', nodeVersion: 2.5, connectTimeout: 1000 },
		};

		const result = await router.call(mockExecuteFunctions(params, badCreds, true));

		expect(result[0][0].json).toHaveProperty('error');
	});

	test('connection error throws when continueOnFail is false', async () => {
		const params = {
			resource: 'database',
			operation: 'executeQuery',
			query: 'SELECT 1',
			options: { queryBatching: 'single', nodeVersion: 2.5, connectTimeout: 1000 },
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
			'CREATE TABLE paging_test (id INT PRIMARY KEY, code VARCHAR(8) UNIQUE, grp INT, INDEX (grp))',
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
		await expect(selectPage('grp', '')).rejects.toThrow('Column "grp" in table "paging_test"');
	});
});
