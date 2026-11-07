import type {
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeTypeBaseDescription,
} from 'n8n-workflow';
import pgPromise from 'pg-promise';
import { mockDeep } from 'vitest-mock-extended';

import { ConnectionPoolManager } from '../../../utils/connection-pool-manager';
import { PostgresV1 } from '../v1/PostgresV1.node';
import { PostgresV2 } from '../v2/PostgresV2.node';
import type { PgpDatabase, PostgresNodeCredentials } from '../v2/helpers/interfaces';

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'Postgres',
	name: 'postgres',
	group: ['input'],
	description: 'Get, add and update data in Postgres',
};

describe.each([
	{ version: 1, postgres: new PostgresV1(baseDescription) },
	{ version: 2, postgres: new PostgresV2(baseDescription) },
	{ version: 2.7, postgres: new PostgresV2(baseDescription) },
])('Postgres v$version connection failures', ({ version, postgres }) => {
	const credentials: PostgresNodeCredentials = {
		host: 'database.example.test',
		port: 5432,
		database: 'test',
		user: 'test',
		password: 'test',
		maxConnections: 1,
		sshTunnel: true,
		sshHost: 'ssh.example.test',
		sshPort: 22,
		sshUser: 'test',
		sshAuthenticateWith: 'password',
		sshPassword: 'test',
	};
	const inputItems: INodeExecutionData[] = [{ json: { id: 1 } }];
	const connectionError = Object.assign(new Error('connect ECONNREFUSED ssh.example.test:22'), {
		code: 'ECONNREFUSED',
	});
	let context: ReturnType<typeof mockDeep<IExecuteFunctions>>;
	let poolManager: ReturnType<typeof mockDeep<ConnectionPoolManager>>;

	beforeEach(() => {
		context = mockDeep<IExecuteFunctions>();
		poolManager = mockDeep<ConnectionPoolManager>();
		vi.spyOn(ConnectionPoolManager, 'getInstance').mockReturnValue(poolManager);
		// Run the real setup without the pool cache, timers, or process handlers.
		poolManager.getConnection.mockImplementation(async ({ fallBackHandler }) => {
			return await fallBackHandler(new AbortController());
		});
		context.getCredentials.mockResolvedValue(credentials);
		context.getInputData.mockReturnValue(inputItems);
		context.continueOnFail.mockReturnValue(true);
		context.helpers.getSSHClient.mockRejectedValue(connectionError);
		context.helpers.constructExecutionMetaData.mockImplementation((items, { itemData }) =>
			items.map((item) => ({ ...item, pairedItem: itemData })),
		);
		const node: INode = {
			id: 'postgres',
			name: 'Postgres',
			type: 'n8n-nodes-base.postgres',
			typeVersion: version,
			position: [0, 0],
			parameters: { resource: 'database', operation: 'executeQuery', query: 'SELECT 1 AS id' },
			onError: 'continueErrorOutput',
		};
		context.getNode.mockReturnValue(node);
		context.getNodeParameter.mockImplementation((parameter, _itemIndex, fallbackValue) => {
			switch (parameter) {
				case 'resource':
					return 'database';
				case 'operation':
					return node.parameters.operation;
				case 'query':
					return 'SELECT 1 AS id';
				case 'options':
					return node.parameters.options ?? {};
				case 'additionalFields':
					return node.parameters.additionalFields ?? {};
				case 'schema':
					return 'public';
				case 'table':
					return 'test';
				case 'columns':
				case 'updateKey':
					return 'id';
				case 'returnFields':
					return '*';
				default:
					return fallbackValue;
			}
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// NODE-5756: Connection setup must honor Continue (using error output).
	it('should return an error item when SSH connection setup fails with Continue On Fail', async () => {
		await expect(postgres.execute.call(context)).resolves.toEqual([
			[
				expect.objectContaining({
					json: expect.objectContaining({
						error: expect.objectContaining({
							message: expect.stringMatching(/Connection refused|ECONNREFUSED/),
						}),
					}),
				}),
			],
		]);
		expect(context.helpers.getSSHClient).toHaveBeenCalledWith(
			credentials,
			expect.any(AbortController),
		);
	});

	it('should throw the connection error when Continue On Fail is disabled', async () => {
		context.continueOnFail.mockReturnValue(false);
		context.getNode().onError = 'stopWorkflow';

		await expect(postgres.execute.call(context)).rejects.toThrow(connectionError.message);
		expect(context.helpers.getSSHClient).toHaveBeenCalledOnce();
	});

	it('should return query results when connection setup succeeds', async () => {
		const db = mockDeep<PgpDatabase>();
		db.multi.mockResolvedValue([[{ id: 1 }]]);
		poolManager.getConnection.mockResolvedValue({ db, pgp: pgPromise() });

		await expect(postgres.execute.call(context)).resolves.toEqual([
			[{ json: { id: 1 }, pairedItem: { item: 0 } }],
		]);
		expect(db.multi).toHaveBeenCalledWith('SELECT 1 AS id');
		expect(context.helpers.getSSHClient).not.toHaveBeenCalled();
	});

	const scenarios: Array<{
		operation: string;
		mode: string;
		method: 'multi' | 'any' | 'tx' | 'task';
	}> =
		version === 1
			? ['executeQuery', 'insert', 'update'].flatMap((operation) => [
					{ operation, mode: 'multiple', method: operation === 'executeQuery' ? 'multi' : 'any' },
					{ operation, mode: 'transaction', method: 'tx' },
					{ operation, mode: 'independently', method: 'task' },
				])
			: [
					{ operation: 'insert', mode: 'single', method: 'any' },
					{ operation: 'update', mode: 'single', method: 'any' },
					{ operation: 'upsert', mode: 'single', method: 'any' },
					{ operation: 'executeQuery', mode: 'transaction', method: 'tx' },
					{ operation: 'executeQuery', mode: 'independently', method: 'task' },
				];

	describe.each(scenarios)('non-SSH $operation / $mode', ({ operation, mode, method }) => {
		describe.each([
			{ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED database.example.test:5432' },
			{ code: '28P01', message: 'password authentication failed for user "test"' },
		])('$code', ({ code, message }) => {
			let db: ReturnType<typeof mockDeep<PgpDatabase>>;
			let databaseError: Error;
			const items: INodeExecutionData[] = [{ json: { id: 1 } }, { json: { id: 2 } }];

			beforeEach(() => {
				db = mockDeep<PgpDatabase>();
				databaseError = Object.assign(new Error(message), { code });
				// The pool exists before pg-promise opens the first database connection.
				db.multi.mockRejectedValue(databaseError);
				db.any.mockRejectedValue(databaseError);
				db.tx.mockRejectedValue(databaseError);
				db.task.mockRejectedValue(databaseError);
				poolManager.getConnection.mockResolvedValue({ db, pgp: pgPromise() });
				context.getCredentials.mockResolvedValue({ ...credentials, sshTunnel: false });
				context.getInputData.mockReturnValue(items);
				context.getNode().parameters = {
					operation,
					additionalFields: { mode },
					options: { queryBatching: mode },
				};
			});

			it('should return a paired error for each input when Continue On Fail is enabled', async () => {
				await expect(postgres.execute.call(context)).resolves.toEqual([
					items.map((_, index) => ({
						json: {
							error: expect.objectContaining({
								message: code === 'ECONNREFUSED' ? 'Connection refused' : message,
							}),
						},
						pairedItem: { item: index },
					})),
				]);
				expect(poolManager.getConnection).toHaveBeenCalledWith(
					expect.objectContaining({ credentials: expect.objectContaining({ sshTunnel: false }) }),
				);
				expect(db[method]).toHaveBeenCalledOnce();
				if (version >= 2 && operation !== 'executeQuery') {
					expect(db.any).toHaveBeenCalledWith(
						expect.stringContaining('FROM information_schema.columns'),
						['public', 'test'],
					);
				}
				expect(context.helpers.getSSHClient).not.toHaveBeenCalled();
			});

			it('should throw when Continue On Fail is disabled', async () => {
				context.continueOnFail.mockReturnValue(false);
				context.getNode().onError = 'stopWorkflow';

				await expect(postgres.execute.call(context)).rejects.toBe(databaseError);
				expect(db[method]).toHaveBeenCalledOnce();
			});
		});
	});
});
