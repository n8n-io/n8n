import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	INodeCredentialTestResult,
} from 'n8n-workflow';
import type * as oracleDBTypes from 'oracledb';

import type { OracleDBNodeCredentials } from '../helpers/interfaces';
import { configureOracleDB } from '../Sql/../transport';

export async function oracleDBConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data as OracleDBNodeCredentials;

	let pool: oracleDBTypes.Pool;

	try {
		pool = await configureOracleDB.call(this, credentials, {});
		const conn = await pool.getConnection();
		await conn.close();
	} catch (error) {
		const message = error.message as string;
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
