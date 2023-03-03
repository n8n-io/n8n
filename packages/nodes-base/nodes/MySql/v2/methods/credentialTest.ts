import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	INodeCredentialTestResult,
} from 'n8n-workflow';
import { createConnection } from '../transport';

export async function mysqlConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data as ICredentialDataDecryptedObject;
	try {
		const connection = await createConnection(credentials);
		await connection.end();
	} catch (error) {
		return {
			status: 'Error',
			message: error.message,
		};
	}
	return {
		status: 'OK',
		message: 'Connection successful!',
	};
}
