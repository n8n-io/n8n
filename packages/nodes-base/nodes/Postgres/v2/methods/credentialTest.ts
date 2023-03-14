import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
} from 'n8n-workflow';

import { configurePostgres } from '../transport';

export async function postgresConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data as IDataObject;

	const { db, pgp, sshClient } = await configurePostgres(credentials);

	try {
		await db.connect();
	} catch (error) {
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
	} finally {
		if (sshClient) {
			sshClient.end();
		}
		pgp.end();
	}
	return {
		status: 'OK',
		message: 'Connection successful!',
	};
}
