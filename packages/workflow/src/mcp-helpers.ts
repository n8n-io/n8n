/** Covers MCP-specific and existing native OAuth2 credential type names. */
export type McpOAuth2CredentialType =
	| 'oAuth2Api'
	| `${string}OAuth2Api`
	| `${string}OAuth2`;

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
