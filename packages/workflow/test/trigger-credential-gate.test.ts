import type { CredentialCheckResult } from '../src/interfaces';
import {
	CREDENTIAL_CONNECTIONS_REQUIRED,
	buildCredentialConnectionsRequiredResponse,
} from '../src/trigger-credential-gate';

describe('buildCredentialConnectionsRequiredResponse', () => {
	const missing = {
		credentialId: 'cred-missing',
		credentialName: 'My Gmail',
		credentialType: 'gmailOAuth2',
		resolverId: 'resolver-1',
		status: 'missing' as const,
		authorizationUrl: 'https://example.com/authorize',
		revokeUrl: 'https://example.com/revoke',
	};
	const configured = {
		credentialId: 'cred-configured',
		credentialName: 'My CRM',
		credentialType: 'hubspotOAuth2',
		resolverId: 'resolver-2',
		status: 'configured' as const,
	};

	it('renames status to credentialStatus and drops resolver/URL fields', () => {
		const result: CredentialCheckResult = { readyToExecute: false, credentials: [missing] };

		expect(buildCredentialConnectionsRequiredResponse(result)).toEqual({
			// Asserted as a literal so a rename can't silently break clients reading the wire.
			status: 'credential_connections_required',
			readyToExecute: false,
			credentials: [
				{
					credentialId: 'cred-missing',
					credentialName: 'My Gmail',
					credentialType: 'gmailOAuth2',
					credentialStatus: 'missing',
				},
			],
		});
	});

	it('keeps connected credentials and preserves input order', () => {
		const result: CredentialCheckResult = {
			readyToExecute: false,
			credentials: [configured, missing],
		};

		const response = buildCredentialConnectionsRequiredResponse(result);

		expect(response.credentials.map((c) => c.credentialId)).toEqual([
			'cred-configured',
			'cred-missing',
		]);
		expect(response.credentials.map((c) => c.credentialStatus)).toEqual(['configured', 'missing']);
	});

	it('always reports readyToExecute false, even for a ready result', () => {
		const result: CredentialCheckResult = { readyToExecute: true, credentials: [configured] };

		expect(buildCredentialConnectionsRequiredResponse(result).readyToExecute).toBe(false);
	});

	it('handles an empty credential list', () => {
		const result: CredentialCheckResult = { readyToExecute: false, credentials: [] };

		expect(buildCredentialConnectionsRequiredResponse(result)).toEqual({
			status: CREDENTIAL_CONNECTIONS_REQUIRED,
			readyToExecute: false,
			credentials: [],
		});
	});

	it('maps a resolver_missing status through unchanged', () => {
		const result: CredentialCheckResult = {
			readyToExecute: false,
			credentials: [{ ...missing, status: 'resolver_missing' }],
		};

		expect(buildCredentialConnectionsRequiredResponse(result).credentials[0]).toEqual({
			credentialId: 'cred-missing',
			credentialName: 'My Gmail',
			credentialType: 'gmailOAuth2',
			credentialStatus: 'resolver_missing',
		});
	});
});
