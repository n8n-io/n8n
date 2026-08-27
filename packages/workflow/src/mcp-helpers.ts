import type { ICredentialDataDecryptedObject } from './interfaces';

/** Covers `mcpOAuth2Api` and registry-specific variants like `notionMcpOAuth2Api`. */
export type McpOAuth2CredentialType = 'mcpOAuth2Api' | `${string}McpOAuth2Api`;

export interface McpRegistryConnection {
	nodeTypeName: string;
	credentialType: McpOAuth2CredentialType;
	endpointUrl: string;
	endpointHostname: string;
	transport: 'httpStreamable' | 'sse';
}

export interface PrepareMcpRegistryConnectionInput {
	connection: McpRegistryConnection;
	credentialData: ICredentialDataDecryptedObject;
}

export type PrepareMcpRegistryConnectionResult =
	| {
			ok: true;
			value: McpRegistryConnection & {
				headers: Record<string, string>;
				allowedDomains: string;
			};
	  }
	| {
			ok: false;
			error: {
				code: 'missing_access_token';
				message: string;
			};
	  };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns `true` for `mcpOAuth2Api` and any credential type ending in
 * `McpOAuth2Api` (e.g. `notionMcpOAuth2Api`, `githubMcpOAuth2Api`).
 */
export function isMcpOAuth2Authentication(
	authentication: string,
): authentication is McpOAuth2CredentialType {
	return authentication === 'mcpOAuth2Api' || authentication.endsWith('McpOAuth2Api');
}

export function getMcpAuthHeaders(
	authentication: string,
	credentialData: ICredentialDataDecryptedObject,
): Record<string, string> {
	if (isMcpOAuth2Authentication(authentication)) {
		const tokenData = credentialData.oauthTokenData;
		const accessToken = isRecord(tokenData)
			? (tokenData.access_token ?? tokenData.accessToken)
			: undefined;
		return typeof accessToken === 'string' ? { authorization: `Bearer ${accessToken}` } : {};
	}

	if (authentication === 'bearerAuth') {
		return typeof credentialData.token === 'string' && credentialData.token.length > 0
			? { authorization: `Bearer ${credentialData.token}` }
			: {};
	}

	if (authentication === 'headerAuth') {
		return typeof credentialData.name === 'string' &&
			credentialData.name.length > 0 &&
			typeof credentialData.value === 'string'
			? { [credentialData.name]: credentialData.value }
			: {};
	}

	if (authentication !== 'multipleHeadersAuth') return {};
	const headers = credentialData.headers;
	const values = isRecord(headers) ? headers.values : undefined;
	if (!Array.isArray(values)) return {};

	return Object.fromEntries(
		values.flatMap((entry) => {
			if (!isRecord(entry)) return [];
			const { name, value } = entry;
			return typeof name === 'string' && typeof value === 'string' ? [[name, value]] : [];
		}),
	);
}
