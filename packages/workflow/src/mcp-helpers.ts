/** Covers `mcpOAuth2Api` and registry-specific variants like `notionMcpOAuth2Api`. */
export type McpOAuth2CredentialType = 'mcpOAuth2Api' | `${string}McpOAuth2Api`;

/**
 * Returns `true` for `mcpOAuth2Api` and any credential type ending in
 * `McpOAuth2Api` (e.g. `notionMcpOAuth2Api`, `githubMcpOAuth2Api`).
 */
export function isMcpOAuth2Authentication(
	authentication: string,
): authentication is McpOAuth2CredentialType {
	return authentication === 'mcpOAuth2Api' || authentication.endsWith('McpOAuth2Api');
}

/** Covers `mcpGatewayApi` and registry-specific variants like `firecrawlMcpGatewayApi`. */
export type McpGatewayCredentialType = 'mcpGatewayApi' | `${string}McpGatewayApi`;

/**
 * Returns `true` for `mcpGatewayApi` and any credential type ending in
 * `McpGatewayApi` (e.g. `firecrawlMcpGatewayApi`).
 *
 * These credentials are billed to n8n credits and never stored: the credential
 * entry under `node.credentials` carries the `__aiGatewayManaged` marker, and
 * the token is minted per execution when that entry is decrypted. This predicate
 * is only how the MCP runtime knows to read a bearer token out of the result —
 * the marker on the entry is what decides that it is minted rather than loaded.
 */
export function isMcpGatewayAuthentication(
	authentication: string,
): authentication is McpGatewayCredentialType {
	return authentication === 'mcpGatewayApi' || authentication.endsWith('McpGatewayApi');
}
