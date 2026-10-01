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
	mockConnect.mockImplementation((cb: (err: null) => void) => cb(null));
	mockDestroy.mockImplementation((cb: (err: null) => void) => cb(null));
	mockExecute.mockImplementation(
		({ complete }: { complete: (err: null, stmt: undefined, rows: unknown[]) => void }) =>
			complete(null, undefined, []),
	);
});

afterEach(() => vi.clearAllMocks());

describe('Snowflake node — VARIANT column parser configuration', () => {
	new NodeTestHarness().setupTests({
		workflowFiles: ['insert.workflow.json'],
		credentials: { snowflake: snowflakeCredentials },
		customAssertions() {
			// VARIANT/OBJECT/ARRAY columns are parsed with JSON.parse.
			expect(snowflake.configure).toHaveBeenCalledWith(
				expect.objectContaining({ jsonColumnVariantParser: JSON.parse }),
			);

			// The session forces valid JSON output for those columns.
			expect(mockExecute).toHaveBeenCalledWith(
				expect.objectContaining({ sqlText: 'ALTER SESSION SET STRICT_JSON_OUTPUT = TRUE' }),
			);
		},
	});
});
