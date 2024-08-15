import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	INodeCredentialTestResult,
} from 'n8n-workflow';

import { configurePostgres } from '../transport';

import type { PgpClient, PostgresNodeCredentials } from '../helpers/interfaces';

export async function postgresConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data as PostgresNodeCredentials;

	let pgpClientCreated: PgpClient | undefined;

	try {
		const { db, pgp } = await configurePostgres.call(this, credentials, {});

		pgpClientCreated = pgp;

		await db.connect();
	} catch (error) {
		let message = error.message as string;

		if (error.message.includes('ECONNREFUSED')) {
			message = 'Connection refused';
		}

		if (error.message.includes('ENOTFOUND')) {
			message = 'Host not found, please check your host name';
		}

		if (error.message.includes('ETIMEDOUT')) {
			message = 'Connection timed out';
		}

		return {
			status: 'Error',
			message,
		};
	} finally {
		if (pgpClientCreated) {
			pgpClientCreated.end();
		}
	}
	return {
		status: 'OK',
		message: 'Connection successful!',
	};
}
