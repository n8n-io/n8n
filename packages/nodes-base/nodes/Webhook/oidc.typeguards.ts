/**
 * Type guards for OIDC authentication
 * Following the pattern in packages/cli/src/modules/mcp/mcp.typeguards.ts
 */

export interface OidcDiscoveryDocument {
	issuer: string;
	jwks_uri: string;
	authorization_endpoint: string;
	token_endpoint: string;
	userinfo_endpoint?: string;
}

export interface OidcSession {
	sub: string;
	email?: string;
	name?: string;
	exp: number;
	iat: number;
}

export interface OidcState {
	csrf: string;
	codeVerifier: string;
	returnUrl: string;
	credentialId: string;
	webhookPath: string;
	timestamp: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard to validate OIDC discovery document structure
 */
export function isOidcDiscoveryDocument(value: unknown): value is OidcDiscoveryDocument {
	if (!isRecord(value)) return false;
	return (
		typeof value.issuer === 'string' &&
		typeof value.jwks_uri === 'string' &&
		typeof value.authorization_endpoint === 'string' &&
		typeof value.token_endpoint === 'string'
	);
}

/**
 * Type guard to validate OIDC session structure
 */
export function isOidcSession(value: unknown): value is OidcSession {
	if (!isRecord(value)) return false;
	return typeof value.sub === 'string' && typeof value.exp === 'number' && typeof value.iat === 'number';
}

/**
 * Type guard to validate OIDC state structure
 */
export function isOidcState(value: unknown): value is OidcState {
	if (!isRecord(value)) return false;
	return (
		typeof value.csrf === 'string' &&
		typeof value.codeVerifier === 'string' &&
		typeof value.returnUrl === 'string' &&
		typeof value.credentialId === 'string' &&
		typeof value.webhookPath === 'string' &&
		typeof value.timestamp === 'number'
	);
}
