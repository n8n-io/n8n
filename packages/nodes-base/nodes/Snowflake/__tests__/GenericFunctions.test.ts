import crypto from 'crypto';

import { getConnectionOptions } from '../GenericFunctions';

jest.mock('crypto');

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
				username: 'test-username',
				authentication: 'keyPair',
				privateKey: 'test-private-key',
			});

			expect(result).toEqual({
				...commonOptions,
				username: 'test-username',
				authenticator: 'SNOWFLAKE_JWT',
				privateKey: 'test-private-key',
			});
		});

		it('with private key for keyPair authentication and passphrase', () => {
			const createPrivateKeySpy = jest.spyOn(crypto, 'createPrivateKey').mockImplementation(
				() =>
					({
						export: () => 'test-private-key',
					}) as unknown as crypto.KeyObject,
			);
			const result = getConnectionOptions({
				...commonOptions,
				username: 'test-username',
				authentication: 'keyPair',
				privateKey: 'encrypted-private-key',
				passphrase: 'test-passphrase',
			});

			expect(createPrivateKeySpy).toHaveBeenCalledWith({
				key: 'encrypted-private-key',
				format: 'pem',
				passphrase: 'test-passphrase',
			});

			expect(result).toEqual({
				...commonOptions,
				username: 'test-username',
				authenticator: 'SNOWFLAKE_JWT',
				privateKey: 'test-private-key',
			});
		});
	});
});
