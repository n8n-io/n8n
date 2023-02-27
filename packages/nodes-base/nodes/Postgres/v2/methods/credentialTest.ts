import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
} from 'n8n-workflow';

import pgPromise from 'pg-promise';

export async function postgresConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data as IDataObject;
	const pgp = pgPromise();

	try {
		const config: IDataObject = {
			host: credentials.host as string,
			port: credentials.port as number,
			database: credentials.database as string,
			user: credentials.user as string,
			password: credentials.password as string,
			connectionTimeoutMillis: 60000,
		};

		if (credentials.allowUnauthorizedCerts === true) {
			config.ssl = {
				rejectUnauthorized: false,
			};
		} else {
			config.ssl = !['disable', undefined].includes(credentials.ssl as string | undefined);
			config.sslmode = (credentials.ssl as string) || 'disable'; // does not like it supported in the pg-promise config
		}

		const db = pgp(config);
		await db.connect();
		pgp.end();
	} catch (error) {
		pgp.end();

		let message = error.message as string;

		if (error.code === 'ECONNREFUSED') {
			message = 'Connection refused, please check your credentials';
		}

		if (error.code === 'ENOTFOUND') {
			message = 'Host not found, please check your host name';
		}

		return {
			status: 'Error',
			message,
		};
	}
	return {
		status: 'OK',
		message: 'Connection successful!',
	};
}
