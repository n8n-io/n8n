import { NodeTestHarness } from '@nodes-testing/node-test-harness';

const mockExecute = jest.fn();
const mockConnect = jest.fn();
const mockDestroy = jest.fn();
const mockConnection = { connect: mockConnect, execute: mockExecute, destroy: mockDestroy };

jest.mock('snowflake-sdk', () => ({
	configure: jest.fn(),
	createConnection: jest.fn().mockReturnValue(mockConnection),
}));

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

afterEach(() => jest.clearAllMocks());

describe('Test Snowflake, update - parameter binding', () => {
	mockConnect.mockImplementation((callback: (err: null) => void) => callback(null));
	mockDestroy.mockImplementation((callback: (err: null) => void) => callback(null));
	mockExecute.mockImplementation(
		({ complete }: { complete: (err: null, stmt: undefined, rows: unknown[]) => void }) =>
			complete(null, undefined, []),
	);

	new NodeTestHarness().setupTests({
		workflowFiles: ['update.workflow.json'],
		credentials: { snowflake: snowflakeCredentials },
		customAssertions() {
			// UPDATE executes one query per row; one input row → one call
			expect(mockExecute).toHaveBeenCalledTimes(1);
			// Columns list is ["id", "status"] (updateKey "id" prepended since not in "status")
			// Binds: [table, col1, val1, col2, val2, updateKey, updateKeyValue]
			expect(mockExecute).toHaveBeenCalledWith(
				expect.objectContaining({
					sqlText:
						'UPDATE IDENTIFIER(?) SET IDENTIFIER(?) = ?,IDENTIFIER(?) = ? WHERE IDENTIFIER(?) = ?;',
					binds: ['orders', 'id', 1, 'status', 'shipped', 'id', 1],
				}),
			);
		},
	});
});
