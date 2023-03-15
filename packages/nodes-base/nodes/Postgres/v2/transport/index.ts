import type { IDataObject } from 'n8n-workflow';

import { Client } from 'ssh2';
import type { ConnectConfig } from 'ssh2';

import type { Server } from 'net';
import { createServer } from 'net';

import pgPromise from 'pg-promise';

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
	credentials: IDataObject,
	options: IDataObject = {},
	createdSshClient?: Client,
) {
	const pgp = pgPromise();

	if (options.largeNumbersOutput === 'numbers') {
		pgp.pg.types.setTypeParser(20, (value: string) => {
			return parseInt(value, 10);
		});
		pgp.pg.types.setTypeParser(1700, (value: string) => {
			return parseFloat(value);
		});
	}

	const dbConfig: IDataObject = {
		host: credentials.host as string,
		port: credentials.port as number,
		database: credentials.database as string,
		user: credentials.user as string,
		password: credentials.password as string,
	};

	if (options.connectionTimeoutMillis) {
		dbConfig.connectionTimeoutMillis = options.connectionTimeoutMillis as number;
	}

	if (credentials.allowUnauthorizedCerts === true) {
		dbConfig.ssl = {
			rejectUnauthorized: false,
		};
	} else {
		dbConfig.ssl = !['disable', undefined].includes(credentials.ssl as string | undefined);
		dbConfig.sslmode = (credentials.ssl as string) || 'disable';
	}

	if (!credentials.sshTunnel) {
		const db = pgp(dbConfig);
		return { db, pgp };
	} else {
		const sshClient = createdSshClient || new Client();

		const tunnelConfig = await createSshConnectConfig(credentials);

		const localHost = '127.0.0.1';
		const localPort = 5432;

		let proxy: Server | undefined;

		const db = await new Promise<PgpDatabase>((resolve, reject) => {
			let sshClientReady = false;

			proxy = createServer((socket) => {
				if (!sshClientReady) return socket.destroy();

				sshClient.forwardOut(
					socket.remoteAddress as string,
					socket.remotePort as number,
					credentials.host as string,
					credentials.port as number,
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
				if (tunnelConfig.privateKey) {
					await rm(tunnelConfig.privateKey as string, { force: true });
				}
				if (proxy) proxy.close();
			});
		}).catch((err) => {
			if (proxy) proxy.close();
			if (sshClient) sshClient.end();
			throw new Error(`Connection by SSH Tunnel failed: ${err.message}`);
		});

		return { db, pgp, sshClient };
	}
}
