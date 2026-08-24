import type { CredentialCheckResult, CredentialCheckStatus } from './interfaces';

/** Discriminator so a client can tell a readiness rejection from any other 4xx. */
export const CREDENTIAL_CONNECTIONS_REQUIRED = 'credential_connections_required';

/**
 * One required credential in a readiness rejection. Field names mirror the
 * `GET /workflows/:id/execution-status` response, so a client that can render
 * readiness there needs no new code here. Deliberately omits `authorizationUrl`
 * and `revokeUrl`: this body is read inside the sandboxed, author-scriptable form
 * page, and the connect links belong to the trusted host that owns the session.
 */
export interface RequiredCredentialConnection {
	credentialId: string;
	credentialName: string;
	credentialType: string;
	credentialStatus: CredentialCheckStatus['status'];
}

export interface CredentialConnectionsRequiredResponse {
	status: typeof CREDENTIAL_CONNECTIONS_REQUIRED;
	readyToExecute: false;
	credentials: RequiredCredentialConnection[];
}

/**
 * Maps a readiness check into the body a trigger returns when it refuses to
 * start an execution. Keeps every required credential, not just the missing ones,
 * so a client can render "{n} of {m} connected" without a second round-trip — the
 * missing ones are identifiable by `credentialStatus`.
 */
export function buildCredentialConnectionsRequiredResponse(
	result: CredentialCheckResult,
): CredentialConnectionsRequiredResponse {
	return {
		status: CREDENTIAL_CONNECTIONS_REQUIRED,
		readyToExecute: false,
		credentials: result.credentials.map(
			({ credentialId, credentialName, credentialType, status }) => ({
				credentialId,
				credentialName,
				credentialType,
				credentialStatus: status,
			}),
		),
	};
}
