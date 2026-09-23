import { isRecord } from '@n8n/utils/is-record';

import type { ICredentialDataDecryptedObject } from './interfaces';

const OAUTH2_REFRESH_BUFFER_MS = 2 * 60 * 1000;
const OAUTH2_REFRESH_BUFFER_RATIO = 0.1;

/** Covers MCP-specific and existing native OAuth2 credential type names. */
export type McpOAuth2CredentialType = 'oAuth2Api' | `${string}OAuth2Api` | `${string}OAuth2`;

/** Either credential kind an MCP registry binding can carry: user OAuth2 or gateway-managed. */
export type McpRegistryCredentialType = McpOAuth2CredentialType | McpGatewayCredentialType;

interface McpRegistryConnectionBase {
	nodeTypeName: string;
	transport: 'httpStreamable' | 'sse';
	credentialBindings: readonly McpRegistryCredentialBinding[];
	/** Extra headers configured on the registry row (e.g. a partner User-Agent), sent as-is on every request. */
	headers?: Record<string, string>;
	/** Attribution text the registry row requires on every tool result it returns. */
	attribution?: string;
}

export interface McpRegistryCredentialBinding {
	credentialType: McpRegistryCredentialType;
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
	credentialType: McpRegistryCredentialType;
	credentialData: ICredentialDataDecryptedObject;
	headers?: Record<string, string>;
}

export type PrepareMcpRegistryConnectionResult =
	| {
			ok: true;
			value: {
				nodeTypeName: string;
				credentialType: McpRegistryCredentialType;
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

/** Return true when an MCP OAuth2 token is close enough to expiry to refresh it. */
export function shouldRefreshMcpOAuth2Token(tokenData: unknown, grantType?: unknown): boolean {
	if (!isRecord(tokenData)) return false;
	if (grantType !== 'clientCredentials' && !(tokenData.refresh_token ?? tokenData.refreshToken)) {
		return false;
	}

	const expiresAt = Number(tokenData.n8n_expires_at);
	if (!Number.isFinite(expiresAt)) return false;

	const expiresInMs = Number(tokenData.expires_in) * 1000;
	const refreshBufferMs =
		Number.isFinite(expiresInMs) && expiresInMs > 0
			? Math.min(OAUTH2_REFRESH_BUFFER_MS, expiresInMs * OAUTH2_REFRESH_BUFFER_RATIO)
			: OAUTH2_REFRESH_BUFFER_MS;

	return Date.now() + refreshBufferMs >= expiresAt;
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

	if (authentication === 'bearerAuth' || isMcpGatewayAuthentication(authentication)) {
		// A gateway-hosted server's synthetic credential carries the minted Gateway
		// token as `token`, sent as a plain bearer to the gateway's MCP endpoint.
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

/** Covers `mcpGatewayApi` and registry-specific variants like `firecrawlMcpGatewayApi`. */
export type McpGatewayCredentialType = 'mcpGatewayApi' | `${string}McpGatewayApi`;

/**
 * Returns `true` for `mcpGatewayApi` and any type ending in `McpGatewayApi`
 * (e.g. `firecrawlMcpGatewayApi`). Tells the MCP runtime to read a bearer token
 * from the credential; the `__aiGatewayManaged` marker on the entry is what
 * decides the token is minted per execution rather than loaded.
 */
export function isMcpGatewayAuthentication(
	authentication: string,
): authentication is McpGatewayCredentialType {
	return authentication === 'mcpGatewayApi' || authentication.endsWith('McpGatewayApi');
}
