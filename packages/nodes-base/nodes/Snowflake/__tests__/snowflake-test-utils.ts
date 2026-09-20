import snowflake from 'snowflake-sdk';
import type { Mock } from 'vitest';

export const snowflakeCredentials = {
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

export function setupSnowflakeMocks(): { mockExecute: Mock; mockDestroy: Mock } {
	const mockExecute = vi.fn();
	const mockConnect = vi.fn();
	const mockDestroy = vi.fn();
	const mockConnection = { connect: mockConnect, execute: mockExecute, destroy: mockDestroy };

	// The harness loads the built node, so mock the shared SDK instance.
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

	return { mockExecute, mockDestroy };
}
