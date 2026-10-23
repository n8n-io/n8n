import type { IExecuteFunctions, Logger } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ConnectionPoolManager } from '@utils/connection-pool-manager';

import { configurePostgres } from '../../transport';
import type { PostgresNodeCredentials } from '../../v2/helpers/interfaces';

type SSHClient = Awaited<ReturnType<IExecuteFunctions['helpers']['getSSHClient']>>;

const credentials = (): PostgresNodeCredentials => ({
	host: 'db.example.com',
	port: 5432,
	database: 'postgres',
	user: 'postgres',
	password: 'password',
	maxConnections: 10,
	ssl: 'disable',
	sshTunnel: true,
	sshAuthenticateWith: 'password',
	sshHost: 'bastion.example.com',
	sshPort: 22,
	sshUser: 'tunnel',
	sshPassword: 'password',
});

const createContext = (sshClient: SSHClient) =>
	mock<IExecuteFunctions>({
		logger: mock<Logger>(),
		helpers: mock<IExecuteFunctions['helpers']>({
			getSSHClient: vi.fn().mockResolvedValue(sshClient),
			updateLastUsed: vi.fn(),
		}),
	});

describe('configurePostgres with an SSH tunnel', () => {
	afterEach(() => {
		ConnectionPoolManager.getInstance(mock<Logger>()).purgeConnections();
	});

	it('should reject the query and drop the pool when forwardOut throws', async () => {
		const sshClient = mock<SSHClient>();
		sshClient.forwardOut.mockImplementation(() => {
			throw new Error('Not connected');
		});
		const context = createContext(sshClient);

		const { db } = await configurePostgres.call(context, credentials(), { nodeVersion: 2.6 });

		await expect(db.one('SELECT 1')).rejects.toThrow();

		// The pool was dropped, so the next call builds a new one with a fresh SSH client
		await configurePostgres.call(context, credentials(), { nodeVersion: 2.6 });
		expect(context.helpers.getSSHClient).toHaveBeenCalledTimes(2);
	});

	it('should reject the query when the SSH server refuses the forward', async () => {
		const sshClient = mock<SSHClient>();
		sshClient.forwardOut.mockImplementation((_srcIP, _srcPort, _dstIP, _dstPort, callback) => {
			callback?.(new Error('(SSH) Channel open failure: open failed'), undefined as never);
			return sshClient;
		});
		const context = createContext(sshClient);

		const { db } = await configurePostgres.call(context, credentials(), { nodeVersion: 2.6 });

		await expect(db.one('SELECT 1')).rejects.toThrow();
	});
});
