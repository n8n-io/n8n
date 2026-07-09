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
