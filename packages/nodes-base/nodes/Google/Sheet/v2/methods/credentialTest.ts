import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	INodeCredentialTestResult,
} from 'n8n-workflow';

import { parseGoogleScopes } from '../../../../../credentials/common/google-scopes';
import { getGoogleAccessToken, googleServiceAccountScopes } from '../../../GenericFunctions';

export async function googleApiCredentialTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const data = credential.data ?? {};

	// This credential is shared across many Google nodes, but only the HTTP Request
	// node lets users pick arbitrary scopes. For that case the test must request the
	// scopes the user actually configured instead of the Sheets-specific default
	// below - otherwise domain-wide delegation impersonation fails the test for
	// every non-Sheets scope, even though the credential works fine at request time.
	const isHttpNodeCredential = data.httpNode === true;
	const rawScopes = typeof data.scopes === 'string' ? data.scopes : '';
	const parsedScopes = isHttpNodeCredential ? parseGoogleScopes(rawScopes) : [];
	const scopeOverride = parsedScopes.length > 0 ? parsedScopes : undefined;

	// When testing user-configured scopes, don't also pass the sheetV2 default:
	// getGoogleAccessToken would ignore it, but keeping it out makes it obvious
	// at the call site that the Sheets-specific scopes play no part here.
	const service = scopeOverride ? undefined : 'sheetV2';

	try {
		const tokenRequest = await getGoogleAccessToken.call(this, data, service, scopeOverride);
		if (!tokenRequest.access_token) {
			return {
				status: 'Error',
				message: 'Could not generate a token from your private key.',
			};
		}
	} catch (err) {
		const attemptedScopes = (scopeOverride ?? googleServiceAccountScopes.sheetV2).join(', ');
		return {
			status: 'Error',
			message: `Private key validation failed: ${err.message} (requested scopes: ${attemptedScopes})`,
		};
	}

	return {
		status: 'OK',
		message: 'Connection successful!',
	};
}
