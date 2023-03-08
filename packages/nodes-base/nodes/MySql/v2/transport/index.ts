import type { ICredentialDataDecryptedObject, IDataObject } from 'n8n-workflow';

import mysql2 from 'mysql2/promise';

export async function createConnection(
	credentials: ICredentialDataDecryptedObject,
	options?: IDataObject,
): Promise<mysql2.Connection> {
	const { ssl, caCertificate, clientCertificate, clientPrivateKey, ...baseCredentials } =
		credentials;

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
		supportBigNumbers: true,
	};

	if (options?.connectTimeout) {
		connectionOptions.connectTimeout = options.connectTimeout as number;
	}

	if (options?.largeNumbersOutput === 'text') {
		connectionOptions.bigNumberStrings = true;
	}

	return mysql2.createConnection(baseCredentials);
}

export async function createPool(
	credentials: ICredentialDataDecryptedObject,
	options?: IDataObject,
) {
	const { ssl, caCertificate, clientCertificate, clientPrivateKey, ...baseCredentials } =
		credentials;

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

	if (options?.connectTimeout) {
		connectionOptions.connectTimeout = options.connectTimeout as number;
	}

	if (options?.largeNumbersOutput === 'text') {
		connectionOptions.bigNumberStrings = true;
	}

	return mysql2.createPool(connectionOptions);
}
