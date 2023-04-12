import type { ICredentialDataDecryptedObject, IDataObject } from 'n8n-workflow';

import mysql2 from 'mysql2/promise';
import type { Client, ConnectConfig } from 'ssh2';
import { rm, writeFile } from 'fs/promises';

import { file } from 'tmp-promise';
import type { Mysql2Pool } from '../helpers/interfaces';

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

export async function createPool(
	credentials: ICredentialDataDecryptedObject,
	options?: IDataObject,
	sshClient?: Client,
): Promise<Mysql2Pool> {
	if (credentials === undefined) {
		throw new Error('Credentials not selected, select or add new credentials');
	}
	const {
		ssl,
		caCertificate,
		clientCertificate,
		clientPrivateKey,
		sshTunnel,
		sshHost,
		sshUser,
		sshPassword,
		sshPort,
		sshMysqlPort,
		privateKey,
		passphrase,
		sshAuthenticateWith,
		...baseCredentials
	} = credentials;

	if (ssl) {
		baseCredentials.ssl = {};

		if (caCertificate) {
			baseCredentials.ssl.ca = caCertificate;
		}

		if (clientCertificate || clientPrivateKey) {
			baseCredentials.ssl.cert = clientCertificate;
			baseCredentials.ssl.key = clientPrivateKey;
		}
	}

	const connectionOptions: mysql2.ConnectionOptions = {
		...baseCredentials,
		multipleStatements: true,
		supportBigNumbers: true,
	};

	if (options?.connectionLimit) {
		connectionOptions.connectionLimit = options.connectionLimit as number;
	}

	if (options?.connectTimeout) {
		connectionOptions.connectTimeout = options.connectTimeout as number;
	}

	if (options?.largeNumbersOutput === 'text') {
		connectionOptions.bigNumberStrings = true;
	}

	if (!sshTunnel) {
		return mysql2.createPool(connectionOptions);
	} else {
		if (!sshClient) {
			throw new Error('SSH Tunnel is enabled but no SSH Client was provided');
		}

		const tunnelConfig = await createSshConnectConfig(credentials);

		const forwardConfig = {
			srcHost: '127.0.0.1',
			srcPort: sshMysqlPort as number,
			dstHost: credentials.host as string,
			dstPort: credentials.port as number,
		};

		if (sshAuthenticateWith === 'privateKey') {
			sshClient.on('end', async () => {
				await rm(tunnelConfig.privateKey as string);
			});
		}

		const poolSetup = new Promise<mysql2.Pool>((resolve, reject) => {
			sshClient
				.on('ready', () => {
					sshClient.forwardOut(
						forwardConfig.srcHost,
						forwardConfig.srcPort,
						forwardConfig.dstHost,
						forwardConfig.dstPort,
						(err, stream) => {
							if (err) reject(err);
							const updatedDbServer = {
								...connectionOptions,
								stream,
							};
							const connection = mysql2.createPool(updatedDbServer);
							resolve(connection);
						},
					);
				})
				.connect(tunnelConfig);
		});

		return poolSetup;
	}
}
