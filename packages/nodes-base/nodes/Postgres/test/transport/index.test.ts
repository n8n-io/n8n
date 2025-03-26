import { mock, mockFn } from 'jest-mock-extended';
import { type ICredentialTestFunctions } from 'n8n-workflow';
import pgPromise from 'pg-promise';

import { ConnectionPoolManager } from '@utils/connection-pool-manager';

import { configurePostgres } from '../../transport';

jest.mock('pg-promise');
jest.mock('@utils/connection-pool-manager');

const mockConfigurePostgres = (): jest.MockedFunction<pgPromise.IMain> => {
	const ConnectionPoolManagerStatic = ConnectionPoolManager as jest.Mocked<
		typeof ConnectionPoolManager
	>;
	const poolManager = mock<ConnectionPoolManager>();
	ConnectionPoolManagerStatic.getInstance.mockReturnValue(poolManager as any);
	poolManager.getConnection.mockImplementation(async (options) => {
		return await options.fallBackHandler();
	});

	const pgp = mockFn<pgPromise.IMain>();
	(pgPromise as jest.MockedFunction<typeof pgPromise>).mockReturnValue(pgp);
	return pgp;
};

describe('configurePostgres', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('calls pg-promise with ssl false when disabled', async () => {
		const pgp = mockConfigurePostgres();

		await configurePostgres.call(mock<ICredentialTestFunctions>(), {
			host: 'db.localhost',
			port: 2345,
			database: 'defaultdb',
			user: 'postgres',
			password: 'sergtsop',
			maxConnections: 100,
			ssl: 'disable',
			sshTunnel: false,
		});

		expect(pgp.mock.calls).toEqual([
			[
				{
					host: 'db.localhost',
					port: 2345,
					database: 'defaultdb',
					user: 'postgres',
					password: 'sergtsop',
					keepAlive: true,
					max: 100,
					ssl: false,
				},
			],
		]);
	});

	it('calls pg-promise with ssl enabled when required', async () => {
		const pgp = mockConfigurePostgres();

		await configurePostgres.call(mock<ICredentialTestFunctions>(), {
			host: 'db.localhost',
			port: 2345,
			database: 'defaultdb',
			user: 'postgres',
			password: 'sergtsop',
			maxConnections: 100,
			ssl: 'require',
			sshTunnel: false,
		});

		expect(pgp.mock.calls).toEqual([
			[
				{
					host: 'db.localhost',
					port: 2345,
					database: 'defaultdb',
					user: 'postgres',
					password: 'sergtsop',
					keepAlive: true,
					max: 100,
					ssl: true,
				},
			],
		]);
	});

	it('calls pg-promise with ssl enabled when set to unknown value', async () => {
		const pgp = mockConfigurePostgres();

		await configurePostgres.call(mock<ICredentialTestFunctions>(), {
			host: 'db.localhost',
			port: 2345,
			database: 'defaultdb',
			user: 'postgres',
			password: 'sergtsop',
			maxConnections: 100,
			ssl: 'allow' as 'require',
			sshTunnel: false,
		});

		expect(pgp.mock.calls).toEqual([
			[
				{
					host: 'db.localhost',
					port: 2345,
					database: 'defaultdb',
					user: 'postgres',
					password: 'sergtsop',
					keepAlive: true,
					max: 100,
					ssl: true,
				},
			],
		]);
	});

	it('calls pg-promise with ssl ignoring verification errors when configured', async () => {
		const pgp = mockConfigurePostgres();

		await configurePostgres.call(mock<ICredentialTestFunctions>(), {
			host: 'db.localhost',
			port: 2345,
			database: 'defaultdb',
			user: 'postgres',
			password: 'sergtsop',
			maxConnections: 100,
			ssl: 'require',
			allowUnauthorizedCerts: true,
			sshTunnel: false,
		});

		expect(pgp.mock.calls).toEqual([
			[
				{
					host: 'db.localhost',
					port: 2345,
					database: 'defaultdb',
					user: 'postgres',
					password: 'sergtsop',
					keepAlive: true,
					max: 100,
					ssl: {
						rejectUnauthorized: false,
					},
				},
			],
		]);
	});

	it('calls pg-promise with ssl server certificate options', async () => {
		const pgp = mockConfigurePostgres();

		await configurePostgres.call(mock<ICredentialTestFunctions>(), {
			host: 'db.localhost',
			port: 2345,
			database: 'defaultdb',
			user: 'postgres',
			password: 'sergtsop',
			maxConnections: 100,
			ssl: 'require',
			servername: 'other-server-name',
			caCert: 'ca-cert',
			sshTunnel: false,
		});

		expect(pgp.mock.calls).toEqual([
			[
				{
					host: 'db.localhost',
					port: 2345,
					database: 'defaultdb',
					user: 'postgres',
					password: 'sergtsop',
					keepAlive: true,
					max: 100,
					ssl: {
						servername: 'other-server-name',
						ca: 'ca-cert',
					},
				},
			],
		]);
	});

	it('calls pg-promise with ssl client certificate options', async () => {
		const pgp = mockConfigurePostgres();

		await configurePostgres.call(mock<ICredentialTestFunctions>(), {
			host: 'db.localhost',
			port: 2345,
			database: 'defaultdb',
			user: 'postgres',
			password: 'sergtsop',
			maxConnections: 100,
			ssl: 'require',
			clientCert: 'client-cert',
			clientKey: 'client-key',
			sshTunnel: false,
		});

		expect(pgp.mock.calls).toEqual([
			[
				{
					host: 'db.localhost',
					port: 2345,
					database: 'defaultdb',
					user: 'postgres',
					password: 'sergtsop',
					keepAlive: true,
					max: 100,
					ssl: {
						cert: 'client-cert',
						key: 'client-key',
					},
				},
			],
		]);
	});
});
