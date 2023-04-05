import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
} from 'n8n-workflow';

import { Connections } from '../transport';

import { Client } from 'ssh2';
import type { ConnectionsData, PgpClient } from '../helpers/interfaces';

export async function postgresConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data as IDataObject;

	let sshClientCreated: Client | undefined = new Client();
	let pgpClientCreated: PgpClient | undefined;

	try {
		const { db, pgp, sshClient } = (await Connections.getInstance(
			credentials,
			{},
			true,
			sshClientCreated,
		)) as ConnectionsData;

		sshClientCreated = sshClient;
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
		if (sshClientCreated) {
			sshClientCreated.end();
		}
		if (pgpClientCreated) {
			pgpClientCreated.end();
		}

		//set the connection instance to null so that it can be recreated
		await Connections.getInstance({}, {}, false, undefined, true);
	}
	return {
		status: 'OK',
		message: 'Connection successful!',
	};
}
