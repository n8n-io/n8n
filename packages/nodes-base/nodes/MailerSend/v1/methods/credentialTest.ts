import {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	INodeCredentialTestResult,
	JsonObject
}
from 'n8n-workflow';
import { validateCredentials } from '../transport';


export async function mailersendEmailApiTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted):
	Promise<INodeCredentialTestResult> {
		try {
			await validateCredentials.call(this, credential.data as ICredentialDataDecryptedObject);
		} catch (error) {
			const err = error as JsonObject;
			if (err.statusCode === 401) {
				return {
					status: 'Error',
					message: `Invalid credentials`,
				};
			}
		}
		return {
			status: 'OK',
			message: 'Authentication successful',
		};
	}
