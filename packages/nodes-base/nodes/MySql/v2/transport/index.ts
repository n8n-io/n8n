import type { ICredentialDataDecryptedObject, IDataObject } from 'n8n-workflow';

import mysql2 from 'mysql2/promise';
import type { Client } from 'ssh2';
import type { Mysql2Pool } from '../helpers/interfaces';

export async function createPool(
	credentials: ICredentialDataDecryptedObject,
	options?: IDataObject,
	sshClient?: Client,
): Promise<Mysql2Pool> {
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
		const tunnelConfig = {
			host: sshHost as string,
			port: sshPort as number,
			username: sshUser as string,
			password: sshPassword as string,
		};
		const forwardConfig = {
			srcHost: '127.0.0.1',
			srcPort: 3306,
			dstHost: credentials.host as string,
			dstPort: credentials.port as number,
		};

		if (!sshClient) {
			throw new Error('SSH Tunnel is enabled but no SSH Client was provided');
		}

		const sshPoolConnection = new Promise<mysql2.Pool>((resolve, reject) => {
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

		return sshPoolConnection;
	}
}
