import { isRecord } from '@n8n/utils/is-record';

import type { ICredentialDataDecryptedObject } from './interfaces';

/** Covers MCP-specific and existing native OAuth2 credential type names. */
export type McpOAuth2CredentialType = 'oAuth2Api' | `${string}OAuth2Api` | `${string}OAuth2`;

interface McpRegistryConnectionBase {
	nodeTypeName: string;
	transport: 'httpStreamable' | 'sse';
	credentialBindings: readonly McpRegistryCredentialBinding[];
}

export interface McpRegistryCredentialBinding {
	credentialType: McpOAuth2CredentialType;
	selector: string;
}

export interface ResolvedMcpRegistryConnection {
	connection: McpRegistryConnection;
	binding: McpRegistryCredentialBinding;
}

/** A row whose endpoint is a literal URL, known before any credential is read. */
export interface LiteralMcpRegistryConnection extends McpRegistryConnectionBase {
	isTemplated?: false;
	endpointUrl: string;
	endpointHostname: string;
}

/**
 * A row whose endpoint is a `$self`-expression (e.g.
 * `={{$self["host"]}}/api/2.0/mcp/genie`) rather than a URL. It only becomes
 * one once `prepareMcpRegistryConnection` resolves it against the credential,
 * so it deliberately has no `endpointUrl` to read by mistake.
 */
export interface TemplatedMcpRegistryConnection extends McpRegistryConnectionBase {
	isTemplated: true;
	urlTemplate: string;
}

export type McpRegistryConnection = LiteralMcpRegistryConnection | TemplatedMcpRegistryConnection;

/**
 * The endpoint as the registry configured it: a literal URL, or the unresolved
 * template for a templated row. Only for describing the row (node defaults,
 * search results). Anything that opens a connection needs the resolved URL from
 * `prepareMcpRegistryConnection`.
 */
export function getConfiguredEndpointUrl(connection: McpRegistryConnection): string {
	return connection.isTemplated ? connection.urlTemplate : connection.endpointUrl;
}

export interface PrepareMcpRegistryConnectionInput {
	connection: McpRegistryConnection;
	credentialType: McpOAuth2CredentialType;
	credentialData: ICredentialDataDecryptedObject;
	headers?: Record<string, string>;
}

export type PrepareMcpRegistryConnectionResult =
	| {
			ok: true;
			value: {
				nodeTypeName: string;
				credentialType: McpOAuth2CredentialType;
				transport: 'httpStreamable' | 'sse';
				/** Always a literal URL, templated or not. */
				endpointUrl: string;
				headers: Record<string, string>;
				/** Host the credential is pinned to, taken from `endpointUrl`. */
				allowedDomains: string;
			};
	  }
	| {
			ok: false;
			error: {
				code:
					| 'missing_access_token'
					| 'unsupported_credential'
					| 'not_registered'
					| 'unresolved_server_url';
				message: string;
			};
	  };

export interface McpRegistryRuntime {
	resolveConnection(
		nodeTypeName: string,
		selector?: string,
	): ResolvedMcpRegistryConnection | undefined;
	prepareConnection(input: PrepareMcpRegistryConnectionInput): PrepareMcpRegistryConnectionResult;
}

/**
 * Returns `true` for MCP-specific and native OAuth2 credential naming conventions.
 */
export function isMcpOAuth2Authentication(
	authentication: string,
): authentication is McpOAuth2CredentialType {
	return (
		authentication === 'oAuth2Api' ||
		authentication.endsWith('OAuth2Api') ||
		authentication.endsWith('OAuth2')
	);
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
		return typeof accessToken === 'string' && accessToken.length > 0
			? { ['Authorization']: `Bearer ${accessToken}` }
			: {};
	}

	if (authentication === 'bearerAuth') {
		return typeof credentialData.token === 'string' && credentialData.token.length > 0
			? { ['Authorization']: `Bearer ${credentialData.token}` }
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
