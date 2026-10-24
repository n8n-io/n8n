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
])('Postgres v$version connection setup', ({ version, postgres }) => {
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
					return 'executeQuery';
				case 'query':
					return 'SELECT 1 AS id';
				case 'options':
				case 'additionalFields':
					return {};
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
});
