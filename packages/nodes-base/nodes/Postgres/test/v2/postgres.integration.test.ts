import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createServiceStack, type N8NStack } from 'n8n-containers';
import { constructExecutionMetaData } from 'n8n-core';
import type { IDataObject, IExecuteFunctions, INode, Logger } from 'n8n-workflow';

import { ConnectionPoolManager } from '@utils/connection-pool-manager';

import { router } from '../../v2/actions/router';
import type { PostgresNodeCredentials } from '../../v2/helpers/interfaces';

let stack: N8NStack;
let credentials: PostgresNodeCredentials;

const logger = { debug() {}, info() {}, warn() {}, error() {} } as unknown as Logger;

beforeAll(async () => {
	stack = await createServiceStack({ services: ['postgres'] });
	const { container, meta } = stack.serviceResults.postgres! as {
		container: { getHost(): string; getMappedPort(port: number): number };
		meta: { database: string; username: string; password: string };
	};
	credentials = {
		host: container.getHost(),
		port: container.getMappedPort(5432),
		database: meta.database,
		user: meta.username,
		password: meta.password,
		maxConnections: 5,
		ssl: 'disable',
		sshTunnel: false,
	};
});

afterAll(async () => {
	ConnectionPoolManager.getInstance(logger).purgeConnections();
	await stack?.stop();
});

const node: INode = {
	id: '1',
	name: 'Postgres',
	typeVersion: 2.6,
	type: 'n8n-nodes-base.postgres',
	position: [0, 0],
	parameters: {},
};

function mockExecuteFunctions(
	params: IDataObject,
	creds: PostgresNodeCredentials,
): IExecuteFunctions {
	return {
		getNodeParameter: (name: string, _i: number, fallback?: unknown) => params[name] ?? fallback,
		getNode: () => node,
		getInputData: () => [{ json: {} }],
		continueOnFail: () => false,
		getCredentials: async () => creds,
		addExecutionHints: () => {},
		logger,
		helpers: { constructExecutionMetaData },
	} as unknown as IExecuteFunctions;
}

describe('Postgres Integration - Select Start After', () => {
	const executeQuery = async (query: string) =>
		await router.call(
			mockExecuteFunctions(
				{ resource: 'database', operation: 'executeQuery', query, options: {} },
				credentials,
			),
		);

	const selectPage = async (column: string, value: string) =>
		await router.call(
			mockExecuteFunctions(
				{
					resource: 'database',
					operation: 'select',
					schema: 'public',
					table: 'paging_test',
					limit: 2,
					sort: {},
					startAfter: { values: { column, value } },
					options: {},
				},
				credentials,
			),
		);

	beforeAll(async () => {
		await executeQuery(
			'CREATE TABLE paging_test (id INT PRIMARY KEY, code VARCHAR(8) UNIQUE, grp INT)',
		);
		await executeQuery('CREATE INDEX paging_test_grp ON paging_test (grp)');
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
