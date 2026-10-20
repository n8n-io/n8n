import type { ICredentialTestFunctions } from 'n8n-workflow';
import { createServer, type Server } from 'node:net';
import { mockDeep } from 'vitest-mock-extended';

import { ConnectionPoolManager } from '@utils/connection-pool-manager';

import { configurePostgres } from '../../transport';
import type { PgpDatabase, PostgresNodeCredentials } from '../../v2/helpers/interfaces';

vi.mock('node:net', async (importOriginal) => ({
	...(await importOriginal<typeof import('node:net')>()),
	createServer: vi.fn(),
}));

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

	describe('SSH tunnel', () => {
		const sshCredentials: PostgresNodeCredentials = {
			...credentials,
			host: 'db.example.com',
			sshTunnel: true,
			sshHost: 'ssh.example.com',
			sshPort: 22,
			sshUser: 'test',
			sshAuthenticateWith: 'password',
			sshPassword: '',
		};

		beforeEach(() => {
			const proxy = mockDeep<Server>();
			proxy.address.mockReturnValue({ address: '127.0.0.1', family: 'IPv4', port: 15432 });
			proxy.listen.mockImplementation((...args) => {
				const listener = args[args.length - 1];
				if (typeof listener === 'function') listener();
				return proxy;
			});
			vi.mocked(createServer).mockReturnValue(proxy);
			context.helpers.getSSHClient.mockResolvedValue(
				mockDeep<Awaited<ReturnType<ICredentialTestFunctions['helpers']['getSSHClient']>>>(),
			);
		});

		it.each(['allow', 'require'] as const)(
			'should verify the database hostname with a custom CA and SSL %s',
			async (ssl) => {
				({ db } = await configurePostgres.call(context, {
					...sshCredentials,
					ssl,
					caCertificate: certificate,
					clientCertificate: certificate,
					clientPrivateKey: privateKey,
				}));

				expect(db.$pool.options.host).toBe('127.0.0.1');
				expect(db.$pool.options.port).toBe(15432);
				expect(db.$pool.options.ssl).toEqual({
					servername: 'db.example.com',
					ca: formattedCertificate,
					cert: formattedCertificate,
				});
				expect(db.$pool.options.ssl).toHaveProperty('key', formattedPrivateKey);
			},
		);

		it('should verify the database hostname without a custom certificate', async () => {
			({ db } = await configurePostgres.call(context, { ...sshCredentials, ssl: 'require' }));

			expect(db.$pool.options.ssl).toEqual({ servername: 'db.example.com' });
		});

		it('should retain the certificate validation setting', async () => {
			({ db } = await configurePostgres.call(context, {
				...sshCredentials,
				ssl: 'require',
				allowUnauthorizedCerts: true,
				caCertificate: certificate,
			}));

			expect(db.$pool.options.ssl).toEqual({
				servername: 'db.example.com',
				rejectUnauthorized: false,
				ca: formattedCertificate,
			});
		});

		it('should keep SSL disabled when certificates are stored', async () => {
			({ db } = await configurePostgres.call(context, {
				...sshCredentials,
				ssl: 'disable',
				caCertificate: certificate,
			}));

			expect(db.$pool.options.ssl).toBe(false);
		});
	});
});
