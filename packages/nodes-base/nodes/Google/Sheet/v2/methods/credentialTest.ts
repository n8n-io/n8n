import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	INodeCredentialTestResult,
} from 'n8n-workflow';

import { getGoogleAccessToken, googleServiceAccountScopes } from '../../../GenericFunctions';

// Matches the scope-string parsing in GoogleApi.credentials.ts's `authenticate`.
const SCOPE_SEPARATOR = /[,\s]+/;

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
	const scopeOverride = isHttpNodeCredential
		? rawScopes.split(SCOPE_SEPARATOR).filter(Boolean)
		: undefined;

	if (scopeOverride?.length === 0) {
		return {
			status: 'Error',
			message: 'Add at least one scope in the "Scope(s)" field to test this credential.',
		};
	}

	try {
		const tokenRequest = await getGoogleAccessToken.call(this, data, 'sheetV2', scopeOverride);
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
