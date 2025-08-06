import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	INodeCredentialTestResult,
} from 'n8n-workflow';

import type { MysqlNodeCredentials } from '../helpers/interfaces';
import { createPool } from '../transport';

export async function mysqlConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data as MysqlNodeCredentials;

	const pool = await createPool.call(this, credentials);

	try {
		const connection = await pool.getConnection();
		connection.release();
	} catch (error) {
		return {
			status: 'Error',
			message: error.message,
		};
	} finally {
		await pool.end();
	}

	return {
		status: 'OK',
		message: 'Connection successful!',
	};
}
