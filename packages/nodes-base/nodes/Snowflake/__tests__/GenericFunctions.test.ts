import { getConnectionOptions } from '../GenericFunctions';

describe('getConnectionOptions', () => {
	const commonOptions = {
		account: 'test-account',
		database: 'test-database',
		schema: 'test-schema',
		warehouse: 'test-warehouse',
		role: 'test-role',
		clientSessionKeepAlive: true,
	};

	describe('should return connection options', () => {
		it('with username and password for password authentication', () => {
			const result = getConnectionOptions({
				...commonOptions,
				authentication: 'password',
				username: 'test-username',
				password: 'test-password',
			});

			expect(result).toEqual({
				...commonOptions,
				username: 'test-username',
				password: 'test-password',
			});
		});

		it('with private key for keyPair authentication', () => {
			const result = getConnectionOptions({
				...commonOptions,
				authentication: 'keyPair',
				privateKey: 'test-private-key',
			});

			expect(result).toEqual({
				...commonOptions,
				authenticator: 'SNOWFLAKE_JWT',
				privateKey: 'test-private-key',
			});
		});
	});
});
