import type { ICredentialTestFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { ConnectionPoolManager } from '@utils/connection-pool-manager';

import { configurePostgres } from '../../transport';
import type { PgpDatabase, PostgresNodeCredentials } from '../../v2/helpers/interfaces';

describe('configurePostgres SSL options', () => {
	const context = mockDeep<ICredentialTestFunctions>();
	const credentials: PostgresNodeCredentials = {
		host: 'localhost',
		port: 5432,
		database: 'postgres',
		user: 'postgres',
		password: '',
		maxConnections: 10,
		sshTunnel: false,
	};
	const certificate = '-----BEGIN CERTIFICATE----- dGVzdA== -----END CERTIFICATE-----';
	const privateKey = '-----BEGIN PRIVATE KEY----- dGVzdA== -----END PRIVATE KEY-----';
	const formattedCertificate = '-----BEGIN CERTIFICATE-----\ndGVzdA==\n-----END CERTIFICATE-----';
	const formattedPrivateKey = '-----BEGIN PRIVATE KEY-----\ndGVzdA==\n-----END PRIVATE KEY-----';
	let db: PgpDatabase | undefined;

	beforeEach(() => {
		const poolManager = mockDeep<ConnectionPoolManager>();
		poolManager.getConnection.mockImplementation(async ({ fallBackHandler }) => {
			return await fallBackHandler(new AbortController());
		});
		vi.spyOn(ConnectionPoolManager, 'getInstance').mockReturnValue(poolManager);
	});

	afterEach(async () => {
		await db?.$pool.end();
		db = undefined;
		vi.restoreAllMocks();
	});

	it.each(['allow', 'require'] as const)(
		'should pass a formatted CA certificate to the driver with SSL %s',
		async (ssl) => {
			({ db } = await configurePostgres.call(context, {
				...credentials,
				ssl,
				caCertificate: certificate,
			}));

			expect(db.$pool.options.ssl).toEqual({ ca: formattedCertificate });
		},
	);

	it('should pass the formatted client certificate and private key to the driver', async () => {
		({ db } = await configurePostgres.call(context, {
			...credentials,
			ssl: 'require',
			caCertificate: certificate,
			clientCertificate: certificate,
			clientPrivateKey: privateKey,
		}));

		expect(db.$pool.options.ssl).toEqual({
			ca: formattedCertificate,
			cert: formattedCertificate,
		});
		expect(db.$pool.options.ssl).toHaveProperty('key', formattedPrivateKey);
	});

	it.each(['disable', undefined] as const)(
		'should keep SSL disabled with mode %s even when certificates are stored',
		async (ssl) => {
			({ db } = await configurePostgres.call(context, {
				...credentials,
				ssl,
				caCertificate: certificate,
				clientCertificate: certificate,
				clientPrivateKey: privateKey,
			}));

			expect(db.$pool.options.ssl).toBe(false);
		},
	);

	it('should keep SSL enabled when optional certificate fields are empty', async () => {
		({ db } = await configurePostgres.call(context, {
			...credentials,
			ssl: 'require',
			caCertificate: '',
			clientCertificate: '',
			clientPrivateKey: '',
		}));

		expect(db.$pool.options.ssl).toBe(true);
	});

	it('should keep SSL enabled for existing credentials without certificate fields', async () => {
		({ db } = await configurePostgres.call(context, { ...credentials, ssl: 'require' }));

		expect(db.$pool.options.ssl).toBe(true);
	});

	it('should retain the certificate validation setting when client certificates are set', async () => {
		({ db } = await configurePostgres.call(context, {
			...credentials,
			allowUnauthorizedCerts: true,
			ssl: 'disable',
			clientCertificate: certificate,
			clientPrivateKey: privateKey,
		}));

		expect(db.$pool.options.ssl).toEqual({
			rejectUnauthorized: false,
			cert: formattedCertificate,
		});
		expect(db.$pool.options.ssl).toHaveProperty('key', formattedPrivateKey);
	});
});
