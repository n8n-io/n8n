import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
} from 'n8n-workflow';

import { configurePostgres } from '../transport';

import { Client } from 'ssh2';
import type { PgpClient } from '../helpers/interfaces';

export async function postgresConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data as IDataObject;

	let sshClientCreated: Client | undefined = new Client();
	let pgpClientCreated: PgpClient | undefined;

	try {
		const { db, pgp, sshClient } = await configurePostgres(credentials, {}, sshClientCreated);
		sshClientCreated = sshClient;
		pgpClientCreated = pgp;
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
		if (sshClientCreated) {
			sshClientCreated.end();
		}
		if (pgpClientCreated) {
			pgpClientCreated.end();
		}
	}
	return {
		status: 'OK',
		message: 'Connection successful!',
	};
}
