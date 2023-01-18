import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	INodeCredentialTestResult,
} from 'n8n-workflow';

import { getAccessToken, IGoogleAuthCredentials } from '../transport';

export async function googleApiCredentialTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	try {
		const tokenRequest = await getAccessToken.call(
			this,
			credential.data! as unknown as IGoogleAuthCredentials,
		);
		if (!tokenRequest.access_token) {
			return {
				status: 'Error',
				message: 'Could not generate a token from your private key.',
			};
		}
	} catch (err) {
		return {
			status: 'Error',
			message: `Private key validation failed: ${err.message}`,
		};
	}

	return {
		status: 'OK',
		message: 'Connection successful!',
	};
}
