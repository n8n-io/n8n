import { isRecord } from '@n8n/utils/is-record';

import type { CredentialOAuth2Options, ICredentialDataDecryptedObject } from './interfaces';
import { getOAuth2AuthHeaders } from './oauth2-helpers';

/** Covers MCP-specific and existing native OAuth2 credential type names. */
export type McpOAuth2CredentialType = 'oAuth2Api' | `${string}OAuth2Api` | `${string}OAuth2`;

export interface McpRegistryConnection {
	nodeTypeName: string;
	endpointUrl: string;
	endpointHostname: string;
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

export interface PrepareMcpRegistryConnectionInput {
	connection: McpRegistryConnection;
	credentialType: McpOAuth2CredentialType;
	credentialData: ICredentialDataDecryptedObject;
	oauth2?: CredentialOAuth2Options;
	headers?: Record<string, string>;
}

export type PrepareMcpRegistryConnectionResult =
	| {
			ok: true;
			value: McpRegistryConnection & {
				credentialType: McpOAuth2CredentialType;
				headers: Record<string, string>;
				allowedDomains: string;
			};
	  }
	| {
			ok: false;
			error: {
				code: 'missing_access_token' | 'unsupported_credential' | 'not_registered';
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
	oauth2?: CredentialOAuth2Options,
): Record<string, string> {
	if (isMcpOAuth2Authentication(authentication)) {
		return getOAuth2AuthHeaders(credentialData, oauth2);
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
