import { ApplicationError } from 'n8n-workflow';
import type { ICredentialDataDecryptedObject, IDataObject } from 'n8n-workflow';

import mysql2 from 'mysql2/promise';
import type { Client, ConnectConfig } from 'ssh2';

import type { Mysql2Pool } from '../helpers/interfaces';
import { formatPrivateKey } from '@utils/utilities';

async function createSshConnectConfig(credentials: IDataObject) {
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
		throw new ApplicationError('Credentials not selected, select or add new credentials', {
			level: 'warning',
		});
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
			baseCredentials.ssl.ca = formatPrivateKey(caCertificate as string);
		}

		if (clientCertificate || clientPrivateKey) {
			baseCredentials.ssl.cert = formatPrivateKey(clientCertificate as string);
			baseCredentials.ssl.key = formatPrivateKey(clientPrivateKey as string);
		}
	}

	const connectionOptions: mysql2.ConnectionOptions = {
		...baseCredentials,
		multipleStatements: true,
		supportBigNumbers: true,
	};

	if (options?.nodeVersion && (options.nodeVersion as number) >= 2.1) {
		connectionOptions.dateStrings = true;
	}

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
			throw new ApplicationError('SSH Tunnel is enabled but no SSH Client was provided', {
				level: 'warning',
			});
		}

		const tunnelConfig = await createSshConnectConfig(credentials);

		const forwardConfig = {
			srcHost: '127.0.0.1',
			srcPort: sshMysqlPort as number,
			dstHost: credentials.host as string,
			dstPort: credentials.port as number,
		};

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

		return await poolSetup;
	}
}
