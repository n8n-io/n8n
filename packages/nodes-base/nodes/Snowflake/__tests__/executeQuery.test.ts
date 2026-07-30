import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INode,
	type WorkflowTestData,
} from 'n8n-workflow';
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

// The harness loads the node from dist via require(), so vi.mock cannot intercept its
// `snowflake-sdk` import. The module is externalized, so the test and the node share the same
// instance — spy on it instead. Re-applied per test since restoreMocks resets spies.
beforeEach(() => {
	vi.spyOn(snowflake, 'configure').mockImplementation(() => ({}) as never);
	vi.spyOn(snowflake, 'createConnection').mockReturnValue(mockConnection as never);
	mockConnect.mockImplementation((callback: (err: null) => void) => callback(null));
	mockDestroy.mockImplementation((callback: (err: null) => void) => callback(null));
	mockExecute.mockImplementation(
		({ complete }: { complete: (err: null, stmt: undefined, rows: unknown[]) => void }) =>
			complete(null, undefined, []),
	);
});

afterEach(() => vi.clearAllMocks());

// A manual trigger (one empty item) feeding a single executeQuery Snowflake node.
function executeQueryWorkflow(
	query: string,
	queryReplacement: string,
): WorkflowTestData['input']['workflowData'] {
	return {
		nodes: [
			{
				parameters: {},
				id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
				name: 'When clicking "Execute Workflow"',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [460, 460],
			},
			{
				parameters: { operation: 'executeQuery', query, options: { queryReplacement } },
				id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
				name: 'Snowflake',
				type: 'n8n-nodes-base.snowflake',
				typeVersion: 1,
				position: [680, 460],
				credentials: { snowflake: { id: '1', name: 'Snowflake account' } },
			},
		],
		connections: {
			'When clicking "Execute Workflow"': {
				main: [[{ node: 'Snowflake', type: NodeConnectionTypes.Main, index: 0 }]],
			},
		},
	};
}

describe('Test Snowflake, executeQuery - query parameters are bound', () => {
	new NodeTestHarness().setupTests({
		workflowFiles: ['executeQuery.workflow.json'],
		credentials: { snowflake: snowflakeCredentials },
		customAssertions() {
			// The value is sent as a ? bind; it never touches the SQL string.
			expect(mockExecute).toHaveBeenCalledWith(
				expect.objectContaining({
					sqlText: 'SELECT * FROM users WHERE name = ?',
					binds: ["O'Brien"],
				}),
			);
			// The bound value must not appear in any executed statement.
			for (const [{ sqlText }] of mockExecute.mock.calls as Array<[{ sqlText: string }]>) {
				expect(sqlText).not.toContain("O'Brien");
			}
		},
	});
});

describe('Test Snowflake, executeQuery - comma-separated query parameters', () => {
	new NodeTestHarness().setupTest(
		{
			description: 'splits on commas, trims, and binds in placeholder order',
			input: {
				workflowData: executeQueryWorkflow(
					'SELECT * FROM users WHERE first = ? AND last = ?',
					"Ada, O'Brien",
				),
			},
			output: { nodeData: {} },
		},
		{
			credentials: { snowflake: snowflakeCredentials },
			customAssertions() {
				expect(mockExecute).toHaveBeenCalledWith(
					expect.objectContaining({
						sqlText: 'SELECT * FROM users WHERE first = ? AND last = ?',
						binds: ['Ada', "O'Brien"],
					}),
				);
			},
		},
	);
});

describe('Test Snowflake, executeQuery - query parameters provided as an array', () => {
	new NodeTestHarness().setupTest(
		{
			description: 'binds each array entry positionally',
			input: {
				workflowData: executeQueryWorkflow(
					'SELECT * FROM users WHERE first = ? AND last = ?',
					"={{ ['Ada', 'Lovelace'] }}",
				),
			},
			output: { nodeData: {} },
		},
		{
			credentials: { snowflake: snowflakeCredentials },
			customAssertions() {
				expect(mockExecute).toHaveBeenCalledWith(
					expect.objectContaining({
						sqlText: 'SELECT * FROM users WHERE first = ? AND last = ?',
						binds: ['Ada', 'Lovelace'],
					}),
				);
			},
		},
	);
});

describe('Test Snowflake, executeQuery - invalid query parameters', () => {
	new NodeTestHarness().setupTest(
		{
			description: 'errors when query parameters are neither a string nor an array',
			input: {
				workflowData: executeQueryWorkflow('SELECT * FROM users WHERE first = ?', '={{ 42 }}'),
			},
			output: {
				nodeData: {},
				error: 'Query Parameters must be a string of comma-separated values, or an array of values',
			},
		},
		{ credentials: { snowflake: snowflakeCredentials } },
	);
});

describe('Test Snowflake, executeQuery - connection cleanup', () => {
	it('destroys the connection even when a query fails', async () => {
		const lockError = new Error(
			"Statement '01c4b15b-020a-7e8c-0001-126284fb9fd6' has locked table 'ORDERS' in " +
				'transaction 1780060538685000000 and this lock has not yet been released.',
		);

		// The ALTER SESSION statement succeeds; the user query then fails.
		mockExecute.mockImplementation(
			({
				sqlText,
				complete,
			}: {
				sqlText: string;
				complete: (error: Error | null, stmt: undefined, rows: unknown[] | undefined) => void;
			}) =>
				sqlText.startsWith('ALTER SESSION')
					? complete(null, undefined, [])
					: complete(lockError, undefined, undefined),
		);

		const executeFns = mock<IExecuteFunctions>({
			getNode: () => mock<INode>({ typeVersion: 1 }),
			getInputData: () => [{ json: {} }],
		});
		executeFns.getNodeParameter.mockImplementation((name, _itemIndex, fallback) => {
			if (name === 'authentication') return 'credentials';
			if (name === 'operation') return 'executeQuery';
			if (name === 'query') return 'UPDATE "ORDERS" SET "STATUS" = 1';
			return fallback;
		});
		executeFns.getCredentials.mockResolvedValue(snowflakeCredentials);

		await expect(new Snowflake().execute.call(executeFns)).rejects.toThrow('has locked table');

		expect(mockDestroy).toHaveBeenCalled();
	});
});
