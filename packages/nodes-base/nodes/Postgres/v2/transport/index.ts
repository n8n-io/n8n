import type { Server } from 'net';
import { createServer } from 'net';
import { Client } from 'ssh2';
import type { ConnectConfig } from 'ssh2';

import type { IDataObject } from 'n8n-workflow';

import pgPromise from 'pg-promise';
import type {
	PgpDatabase,
	PostgresNodeCredentials,
	PostgresNodeOptions,
} from '../helpers/interfaces';
import { formatPrivateKey } from '@utils/utilities';

async function createSshConnectConfig(credentials: PostgresNodeCredentials) {
	if (credentials.sshAuthenticateWith === 'password') {
		return {
			host: credentials.sshHost as string,
			port: credentials.sshPort as number,
			username: credentials.sshUser as string,
			password: credentials.sshPassword as string,
		} as ConnectConfig;
	} else {
		const options: ConnectConfig = {
			host: credentials.sshHost as string,
			username: credentials.sshUser as string,
			port: credentials.sshPort as number,
			privateKey: formatPrivateKey(credentials.privateKey as string),
		};

		if (credentials.passphrase) {
			options.passphrase = credentials.passphrase;
		}

		return options;
	}
}

export async function configurePostgres(
	credentials: PostgresNodeCredentials,
	options: PostgresNodeOptions = {},
	createdSshClient?: Client,
) {
	const pgp = pgPromise({
		// prevent spam in console "WARNING: Creating a duplicate database object for the same connection."
		// duplicate connections created when auto loading parameters, they are closed imidiatly after, but several could be open at the same time
		noWarnings: true,
	});

	if (typeof options.nodeVersion === 'number' && options.nodeVersion >= 2.1) {
		// Always return dates as ISO strings
		[pgp.pg.types.builtins.TIMESTAMP, pgp.pg.types.builtins.TIMESTAMPTZ].forEach((type) => {
			pgp.pg.types.setTypeParser(type, (value: string) => {
				return new Date(value).toISOString();
			});
		});
	}

	if (options.largeNumbersOutput === 'numbers') {
		pgp.pg.types.setTypeParser(20, (value: string) => {
			return parseInt(value, 10);
		});
		pgp.pg.types.setTypeParser(1700, (value: string) => {
			return parseFloat(value);
		});
	}

	const dbConfig: IDataObject = {
		host: credentials.host,
		port: credentials.port,
		database: credentials.database,
		user: credentials.user,
		password: credentials.password,
		keepAlive: true,
	};

	if (options.connectionTimeout) {
		dbConfig.connectionTimeoutMillis = options.connectionTimeout * 1000;
	}

	if (options.delayClosingIdleConnection) {
		dbConfig.keepAliveInitialDelayMillis = options.delayClosingIdleConnection * 1000;
	}

	if (credentials.allowUnauthorizedCerts === true) {
		dbConfig.ssl = {
			rejectUnauthorized: false,
		};
	} else {
		dbConfig.ssl = !['disable', undefined].includes(credentials.ssl as string | undefined);
		dbConfig.sslmode = credentials.ssl || 'disable';
	}

	if (!credentials.sshTunnel) {
		const db = pgp(dbConfig);
		return { db, pgp };
	} else {
		const sshClient = createdSshClient || new Client();

		const tunnelConfig = await createSshConnectConfig(credentials);

		const localHost = '127.0.0.1';
		const localPort = credentials.sshPostgresPort as number;

		let proxy: Server | undefined;

		const db = await new Promise<PgpDatabase>((resolve, reject) => {
			let sshClientReady = false;

			proxy = createServer((socket) => {
				if (!sshClientReady) return socket.destroy();

				sshClient.forwardOut(
					socket.remoteAddress as string,
					socket.remotePort as number,
					credentials.host,
					credentials.port,
					(err, stream) => {
						if (err) reject(err);

						socket.pipe(stream);
						stream.pipe(socket);
					},
				);
			}).listen(localPort, localHost);

			proxy.on('error', (err) => {
				reject(err);
			});

			sshClient.connect(tunnelConfig);

			sshClient.on('ready', () => {
				sshClientReady = true;

				const updatedDbConfig = {
					...dbConfig,
					port: localPort,
					host: localHost,
				};
				const dbConnection = pgp(updatedDbConfig);
				resolve(dbConnection);
			});

			sshClient.on('error', (err) => {
				reject(err);
			});

			sshClient.on('end', async () => {
				if (proxy) proxy.close();
			});
		}).catch((err) => {
			if (proxy) proxy.close();
			if (sshClient) sshClient.end();

			let message = err.message;
			let description = err.description;

			if (err.message.includes('ECONNREFUSED')) {
				message = 'Connection refused';
				try {
					description = err.message.split('ECONNREFUSED ')[1].trim();
				} catch (e) {}
			}

			if (err.message.includes('ENOTFOUND')) {
				message = 'Host not found';
				try {
					description = err.message.split('ENOTFOUND ')[1].trim();
				} catch (e) {}
			}

			if (err.message.includes('ETIMEDOUT')) {
				message = 'Connection timed out';
				try {
					description = err.message.split('ETIMEDOUT ')[1].trim();
				} catch (e) {}
			}

			err.message = message;
			err.description = description;
			throw err;
		});

		return { db, pgp, sshClient };
	}
}
