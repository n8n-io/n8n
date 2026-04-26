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

describe('Test Snowflake, insert - parameter binding', () => {
	mockConnect.mockImplementation((callback: (err: null) => void) => callback(null));
	mockDestroy.mockImplementation((callback: (err: null) => void) => callback(null));
	mockExecute.mockImplementation(
		({ complete }: { complete: (err: null, stmt: undefined, rows: unknown[]) => void }) =>
			complete(null, undefined, []),
	);

	new NodeTestHarness().setupTests({
		workflowFiles: ['insert.workflow.json'],
		credentials: { snowflake: snowflakeCredentials },
		customAssertions() {
			expect(mockExecute).toHaveBeenCalledTimes(1);
			expect(mockExecute).toHaveBeenCalledWith(
				expect.objectContaining({
					sqlText: 'INSERT INTO IDENTIFIER(?)(IDENTIFIER(?),IDENTIFIER(?)) VALUES (?,?)',
					binds: [['orders', 'name', 'status', 'Alice', 'active']],
				}),
			);
		},
	});
});
