import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import snowflake from 'snowflake-sdk';

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

describe('Test Snowflake, update - parameter binding', () => {
	new NodeTestHarness().setupTests({
		workflowFiles: ['update.workflow.json'],
		credentials: { snowflake: snowflakeCredentials },
		customAssertions() {
			// UPDATE executes one query per row; one input row → one call
			expect(mockExecute).toHaveBeenCalledTimes(1);
			// Columns list is ["id", "status"] (updateKey "id" prepended since not in "status")
			// Binds: [id_value, status_value, updateKey_value]
			expect(mockExecute).toHaveBeenCalledWith(
				expect.objectContaining({
					sqlText: 'UPDATE "ORDERS" SET "ID" = ?,"STATUS" = ? WHERE "ID" = ?;',
					binds: [1, 'shipped', 1],
				}),
			);
		},
	});
});
