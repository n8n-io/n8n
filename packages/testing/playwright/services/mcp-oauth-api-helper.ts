import type { APIResponse } from '@playwright/test';
import { createHash, randomBytes } from 'node:crypto';

import type { ApiHelpers } from './api-helper';

export interface OAuthAuthorizationServerMetadata {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	registration_endpoint: string;
	revocation_endpoint: string;
	response_types_supported: string[];
	grant_types_supported: string[];
	token_endpoint_auth_methods_supported: string[];
	code_challenge_methods_supported: string[];
	scopes_supported: string[];
}

export interface OAuthProtectedResourceMetadata {
	resource: string;
	bearer_methods_supported: string[];
	authorization_servers: string[];
	scopes_supported: string[];
}

export interface RegisteredOAuthClient {
	client_id: string;
	client_secret?: string;
	client_name: string;
	redirect_uris: string[];
	grant_types: string[];
	token_endpoint_auth_method: string;
}

export interface OAuthTokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
}

export interface PkcePair {
	codeVerifier: string;
	codeChallenge: string;
}

export interface AuthorizationCodeFlowResult {
	client: RegisteredOAuthClient;
	tokens: OAuthTokenResponse;
	redirectUri: string;
	resource: string;
}

const DEFAULT_REDIRECT_URI = 'http://localhost:3000/callback';

/**
 * Helper for the instance-MCP OAuth server (DCR, authorize → consent → token
 * with PKCE, discovery, refresh, revoke).
 *
 * Routes hit:
 * - `/.well-known/oauth-authorization-server` (RFC 8414)
 * - `/.well-known/oauth-protected-resource/mcp-server/http` (RFC 9728)
 * - `/mcp-oauth/{register,authorize,token,revoke}`
 * - `/consent/{details,approve}`
 *
 * The shared `api.request` context carries both the signed-in user cookie and the
 * `n8n-oauth-session` cookie that `authorize` sets, so the consent calls are
 * authenticated as the current user without extra plumbing.
 */
export class McpOAuthApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	/** Generate an RFC 7636 PKCE pair (S256). */
	createPkcePair(): PkcePair {
		const codeVerifier = base64UrlEncode(randomBytes(32));
		const codeChallenge = base64UrlEncode(createHash('sha256').update(codeVerifier).digest());
		return { codeVerifier, codeChallenge };
	}

	// ===== Discovery =====

	async getAuthorizationServerMetadataResponse(): Promise<APIResponse> {
		return await this.api.request.get('/.well-known/oauth-authorization-server');
	}

	async getAuthorizationServerMetadata(): Promise<OAuthAuthorizationServerMetadata> {
		const response = await this.getAuthorizationServerMetadataResponse();
		return (await response.json()) as OAuthAuthorizationServerMetadata;
	}

	async optionsAuthorizationServerMetadata(): Promise<APIResponse> {
		return await this.api.request.fetch('/.well-known/oauth-authorization-server', {
			method: 'OPTIONS',
		});
	}

	async getProtectedResourceMetadataResponse(): Promise<APIResponse> {
		return await this.api.request.get('/.well-known/oauth-protected-resource/mcp-server/http');
	}

	async getProtectedResourceMetadata(): Promise<OAuthProtectedResourceMetadata> {
		const response = await this.getProtectedResourceMetadataResponse();
		return (await response.json()) as OAuthProtectedResourceMetadata;
	}

	/** Canonical RFC 8707 resource indicator advertised by the instance. */
	async getCanonicalResourceUrl(): Promise<string> {
		const metadata = await this.getProtectedResourceMetadata();
		return metadata.resource;
	}

	// ===== Dynamic Client Registration =====

	async registerClientResponse(
		overrides: Partial<{
			client_name: string;
			redirect_uris: string[];
			grant_types: string[];
			token_endpoint_auth_method: string;
		}> = {},
	): Promise<APIResponse> {
		return await this.api.request.post('/mcp-oauth/register', {
			data: {
				client_name: 'e2e-oauth-client',
				redirect_uris: [DEFAULT_REDIRECT_URI],
				grant_types: ['authorization_code', 'refresh_token'],
				token_endpoint_auth_method: 'none',
				...overrides,
			},
		});
	}

	async registerClient(
		overrides?: Parameters<McpOAuthApiHelper['registerClientResponse']>[0],
	): Promise<RegisteredOAuthClient> {
		const response = await this.registerClientResponse(overrides);
		return (await response.json()) as RegisteredOAuthClient;
	}

	// ===== Authorize / consent =====

	/**
	 * Start the authorization flow. Returns the raw response WITHOUT following the
	 * redirect, so the caller can read the `Location` header. The `n8n-oauth-session`
	 * cookie is stored on the request context as a side effect.
	 */
	async authorize(params: {
		clientId: string;
		codeChallenge: string;
		redirectUri?: string;
		state?: string;
		resource?: string;
		scope?: string;
	}): Promise<APIResponse> {
		const query = new URLSearchParams({
			response_type: 'code',
			client_id: params.clientId,
			redirect_uri: params.redirectUri ?? DEFAULT_REDIRECT_URI,
			code_challenge: params.codeChallenge,
			code_challenge_method: 'S256',
		});
		if (params.state) query.set('state', params.state);
		if (params.resource) query.set('resource', params.resource);
		if (params.scope) query.set('scope', params.scope);

		return await this.api.request.get(`/mcp-oauth/authorize?${query.toString()}`, {
			maxRedirects: 0,
		});
	}

	async getConsentDetailsResponse(): Promise<APIResponse> {
		return await this.api.request.get('/rest/consent/details');
	}

	async getConsentDetails(): Promise<{ clientName: string; clientId: string }> {
		const response = await this.getConsentDetailsResponse();
		const body = (await response.json()) as { data: { clientName: string; clientId: string } };
		return body.data;
	}

	async approveConsentResponse(approved: boolean): Promise<APIResponse> {
		return await this.api.request.post('/rest/consent/approve', {
			data: { approved },
		});
	}

	/** Approve or deny consent. Returns the redirect URL carrying `code`/`error`. */
	async submitConsent(approved: boolean): Promise<string> {
		const response = await this.approveConsentResponse(approved);
		const body = (await response.json()) as { data: { redirectUrl: string } };
		return body.data.redirectUrl;
	}

	// ===== Token endpoint =====

	async exchangeAuthorizationCodeResponse(params: {
		code: string;
		clientId: string;
		codeVerifier: string;
		redirectUri?: string;
		resource?: string;
	}): Promise<APIResponse> {
		const form: Record<string, string> = {
			grant_type: 'authorization_code',
			code: params.code,
			client_id: params.clientId,
			code_verifier: params.codeVerifier,
			redirect_uri: params.redirectUri ?? DEFAULT_REDIRECT_URI,
		};
		if (params.resource) form.resource = params.resource;
		return await this.api.request.post('/mcp-oauth/token', { form });
	}

	async exchangeAuthorizationCode(
		params: Parameters<McpOAuthApiHelper['exchangeAuthorizationCodeResponse']>[0],
	): Promise<OAuthTokenResponse> {
		const response = await this.exchangeAuthorizationCodeResponse(params);
		return (await response.json()) as OAuthTokenResponse;
	}

	async refreshTokenResponse(params: {
		refreshToken: string;
		clientId: string;
		resource?: string;
	}): Promise<APIResponse> {
		const form: Record<string, string> = {
			grant_type: 'refresh_token',
			refresh_token: params.refreshToken,
			client_id: params.clientId,
		};
		if (params.resource) form.resource = params.resource;
		return await this.api.request.post('/mcp-oauth/token', { form });
	}

	async refreshToken(
		params: Parameters<McpOAuthApiHelper['refreshTokenResponse']>[0],
	): Promise<OAuthTokenResponse> {
		const response = await this.refreshTokenResponse(params);
		return (await response.json()) as OAuthTokenResponse;
	}

	async revokeTokenResponse(params: {
		token: string;
		clientId: string;
		tokenTypeHint?: 'access_token' | 'refresh_token';
	}): Promise<APIResponse> {
		const form: Record<string, string> = {
			token: params.token,
			client_id: params.clientId,
		};
		if (params.tokenTypeHint) form.token_type_hint = params.tokenTypeHint;
		return await this.api.request.post('/mcp-oauth/revoke', { form });
	}

	// ===== High-level orchestration =====

	/**
	 * Run the full authorization-code + PKCE flow end-to-end (DCR → authorize →
	 * consent approve → token exchange) and return the issued tokens.
	 *
	 * Must run on a request context that is signed in as an n8n user (the consent
	 * endpoints require it). The default `api` fixture is signed in as owner.
	 */
	async completeAuthorizationCodeFlow(
		options: { resource?: string; state?: string } = {},
	): Promise<AuthorizationCodeFlowResult> {
		const client = await this.registerClient();
		const { codeVerifier, codeChallenge } = this.createPkcePair();
		const redirectUri = client.redirect_uris[0];
		const state = options.state ?? `state-${Math.random().toString(36).slice(2)}`;

		const authorizeResponse = await this.authorize({
			clientId: client.client_id,
			codeChallenge,
			redirectUri,
			state,
			resource: options.resource,
		});

		if (authorizeResponse.status() !== 302) {
			throw new Error(
				`Expected authorize to redirect to consent, got ${authorizeResponse.status()}: ${await authorizeResponse.text()}`,
			);
		}

		const redirectUrl = await this.submitConsent(true);
		const code = extractQueryParam(redirectUrl, 'code');
		if (!code) {
			throw new Error(`Authorization redirect did not contain a code: ${redirectUrl}`);
		}

		const tokens = await this.exchangeAuthorizationCode({
			code,
			clientId: client.client_id,
			codeVerifier,
			redirectUri,
			resource: options.resource,
		});

		return { client, tokens, redirectUri, resource: options.resource ?? '' };
	}
}

function base64UrlEncode(buffer: Buffer): string {
	return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function extractQueryParam(url: string, param: string): string | null {
	try {
		return new URL(url).searchParams.get(param);
	} catch {
		return null;
	}
}
