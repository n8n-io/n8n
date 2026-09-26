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

type ExecuteMockOptions = {
	sqlText: string;
	binds?: snowflake.Binds;
	complete: (error: Error | null, stmt: unknown, rows: unknown[] | undefined) => void;
};

type ConnectionCallback = (error: Error | null) => void;

export function setupSnowflakeMocks(): {
	mockExecute: Mock<(options: ExecuteMockOptions) => void>;
	mockDestroy: Mock<(callback: ConnectionCallback) => void>;
} {
	const mockExecute = vi.fn<(options: ExecuteMockOptions) => void>();
	const mockConnect = vi.fn<(callback: ConnectionCallback) => void>();
	const mockDestroy = vi.fn<(callback: ConnectionCallback) => void>();
	const mockConnection = { connect: mockConnect, execute: mockExecute, destroy: mockDestroy };

	// The harness loads the built node, so mock the shared SDK instance.
	beforeEach(() => {
		vi.spyOn(snowflake, 'configure').mockImplementation(() => ({}) as never);
		vi.spyOn(snowflake, 'createConnection').mockReturnValue(mockConnection as never);
		mockConnect.mockImplementation((callback) => callback(null));
		mockDestroy.mockImplementation((callback) => callback(null));
		mockExecute.mockImplementation(({ complete }) => complete(null, undefined, []));
	});

	afterEach(() => vi.clearAllMocks());

	return { mockExecute, mockDestroy };
}
