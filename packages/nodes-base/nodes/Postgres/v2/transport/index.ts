import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import pgPromise from 'pg-promise';

import type { Client, ConnectConfig } from 'ssh2';
import { createServer } from 'net';

import { rm, writeFile } from 'fs/promises';

import { file } from 'tmp-promise';
import type { PgpDatabase } from '../helpers/interfaces';

async function createSshConnectConfig(credentials: IDataObject) {
	if (credentials.sshAuthenticateWith === 'password') {
		return {
			host: credentials.sshHost as string,
			port: credentials.sshPort as number,
			username: credentials.sshUser as string,
			password: credentials.sshPassword as string,
		} as ConnectConfig;
	} else {
		const { path } = await file({ prefix: 'n8n-ssh-' });
		await writeFile(path, credentials.privateKey as string);

		const options: ConnectConfig = {
			host: credentials.host as string,
			username: credentials.username as string,
			port: credentials.port as number,
			privateKey: path,
		};

		if (credentials.passphrase) {
			options.passphrase = credentials.passphrase as string;
		}

		return options;
	}
}

export async function configurePostgres(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	sshClient?: Client,
) {
	const credentials = await this.getCredentials('postgres');
	const options = this.getNodeParameter('options', 0, {}) as IDataObject;

	const pgp = pgPromise();

	if (options.largeNumbersOutput === 'numbers') {
		pgp.pg.types.setTypeParser(20, (value: string) => {
			return parseInt(value, 10);
		});
		pgp.pg.types.setTypeParser(1700, (value: string) => {
			return parseFloat(value);
		});
	}

	const config: IDataObject = {
		host: credentials.host as string,
		port: credentials.port as number,
		database: credentials.database as string,
		user: credentials.user as string,
		password: credentials.password as string,
	};

	if (options.connectionTimeoutMillis) {
		config.connectionTimeoutMillis = options.connectionTimeoutMillis as number;
	}

	if (credentials.allowUnauthorizedCerts === true) {
		config.ssl = {
			rejectUnauthorized: false,
		};
	} else {
		config.ssl = !['disable', undefined].includes(credentials.ssl as string | undefined);
		config.sslmode = (credentials.ssl as string) || 'disable';
	}

	if (!credentials.sshTunnel) {
		const db = pgp(config);
		return { db, pgp };
	} else {
		if (!sshClient) {
			throw new Error('SSH Tunnel is enabled but no SSH Client was provided');
		}

		const tunnelConfig = await createSshConnectConfig(credentials);

		const srcHost = '127.0.0.1';
		const srcPort = 5432;

		const forwardConfig = {
			srcHost,
			srcPort,
			host: credentials.host as string,
			port: credentials.port as number,
		};

		const db = await new Promise<PgpDatabase>((resolve, reject) => {
			const proxyPort = srcPort;
			let ready = false;

			const proxy = createServer((socket) => {
				if (!ready) return socket.destroy();

				sshClient.forwardOut(
					socket.remoteAddress as string,
					socket.remotePort as number,
					forwardConfig.host,
					forwardConfig.port,
					(err, stream) => {
						if (err) reject(err);

						socket.pipe(stream);
						stream.pipe(socket);
					},
				);
			}).listen(proxyPort, srcHost);

			sshClient.connect(tunnelConfig);

			sshClient.on('ready', () => {
				ready = true;

				const updatedDbServer = {
					...config,
					port: proxyPort,
					host: srcHost,
				};
				const dbConnection = pgp(updatedDbServer);
				resolve(dbConnection);
			});

			sshClient.on('end', async () => {
				if (tunnelConfig.privateKey) {
					await rm(tunnelConfig.privateKey as string, { force: true });
				}
				proxy.close();
			});
		});

		return { db, pgp };
	}
}
