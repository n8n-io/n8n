/** Covers `mcpOAuth2Api` and registry-specific variants like `notionMcpOAuth2Api`. */
export type McpOAuth2CredentialType = 'mcpOAuth2Api' | `${string}McpOAuth2Api`;

/** Every credential type that authenticates with an OAuth2 bearer token. */
export type OAuth2CredentialType = 'oAuth2Api' | McpOAuth2CredentialType;

/**
 * Returns `true` for `mcpOAuth2Api` and any credential type ending in
 * `McpOAuth2Api` (e.g. `notionMcpOAuth2Api`, `githubMcpOAuth2Api`).
 *
 * Deliberately narrow: it means "an MCP-registry credential variant", which is
 * what the registry naming logic keys off. Use `isOAuth2Authentication` when
 * you mean "this is an OAuth2 bearer flow".
 */
export function isMcpOAuth2Authentication(
	authentication: string,
): authentication is McpOAuth2CredentialType {
	return authentication === 'mcpOAuth2Api' || authentication.endsWith('McpOAuth2Api');
}

/**
 * Returns `true` for the generic `oAuth2Api` credential and for every MCP
 * OAuth2 variant matched by {@link isMcpOAuth2Authentication}.
 */
export function isOAuth2Authentication(
	authentication: string,
): authentication is OAuth2CredentialType {
	return authentication === 'oAuth2Api' || isMcpOAuth2Authentication(authentication);
}
