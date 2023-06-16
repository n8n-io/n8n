import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	INodeCredentialTestResult,
} from 'n8n-workflow';

import { createPool } from '../transport';

import { Client } from 'ssh2';

export async function mysqlConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data as ICredentialDataDecryptedObject;

	let sshClient: Client | undefined = undefined;

	if (credentials.sshTunnel) {
		sshClient = new Client();
	}
	const pool = await createPool(credentials, {}, sshClient);

	try {
		const connection = await pool.getConnection();
		connection.release();
	} catch (error) {
		return {
			status: 'Error',
			message: error.message,
		};
	} finally {
		if (sshClient) {
			sshClient.end();
		}
		await pool.end();
	}

	return {
		status: 'OK',
		message: 'Connection successful!',
	};
}
