import type { IExecuteFunctions, INode } from 'n8n-workflow';
import snowflake from 'snowflake-sdk';
import { mock } from 'vitest-mock-extended';

import { Snowflake } from '../Snowflake.node';

const mockExecute = vi.fn();
const mockConnect = vi.fn();
const mockDestroy = vi.fn();
const mockConnection = { connect: mockConnect, execute: mockExecute, destroy: mockDestroy };

const snowflakeCredentials = {
	authentication: 'password',
	account: 'test-account',
	database: 'TEST_DB',
	schema: 'PUBLIC',
	warehouse: 'WH',
	role: 'SYSADMIN',
	clientSessionKeepAlive: false,
	username: 'user',
	password: 'pass',
};

beforeEach(() => {
	vi.spyOn(snowflake, 'configure').mockImplementation(() => ({}) as never);
	vi.spyOn(snowflake, 'createConnection').mockReturnValue(mockConnection as never);
	mockConnect.mockImplementation((callback: (err: null) => void) => callback(null));
	mockDestroy.mockImplementation((callback: (err: null) => void) => callback(null));
});

afterEach(() => vi.clearAllMocks());

// Reproduces NODE-5163: when a statement fails mid-execution (e.g. a Snowflake
// lock error), the connection is never destroyed, so its session/transaction —
// and any table locks it holds — are leaked.
describe('Snowflake connection cleanup on statement failure', () => {
	it('destroys the connection even when a query fails', async () => {
		const lockError = new Error(
			"Statement '01c4b15b-020a-7e8c-0001-126284fb9fd6' has locked table " +
				"'ENRICHMENT_LOOKALIKE_CONTACTS' in transaction 1780060538685000000 and this " +
				'lock has not yet been released.',
		);

		// First statement (ALTER SESSION) succeeds; the user query then fails.
		mockExecute.mockImplementation(
			({
				sqlText,
				complete,
			}: {
				sqlText: string;
				complete: (err: Error | null, stmt: undefined, rows: unknown[] | undefined) => void;
			}) => {
				if (sqlText.startsWith('ALTER SESSION')) {
					complete(null, undefined, []);
				} else {
					complete(lockError, undefined, undefined);
				}
			},
		);

		const query = 'UPDATE "ENRICHMENT_LOOKALIKE_CONTACTS" SET "STATUS" = 1';

		const executeFns = mock<IExecuteFunctions>({
			getNode: () => mock<INode>({ typeVersion: 1 }),
			getInputData: () => [{ json: {} }],
		});
		executeFns.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) => {
				if (name === 'authentication') return 'credentials';
				if (name === 'operation') return 'executeQuery';
				if (name === 'query') return query;
				return fallback;
			},
		);
		executeFns.getCredentials.mockResolvedValue(snowflakeCredentials);

		await expect(new Snowflake().execute.call(executeFns)).rejects.toThrow('has locked table');

		// The connection must be cleaned up so the locked table is released.
		expect(mockDestroy).toHaveBeenCalled();
	});
});
