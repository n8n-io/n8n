import type { APIResponse } from '@playwright/test';
import { createHash, randomBytes } from 'node:crypto';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

/**
 * The OAuth endpoints are mounted under both the legacy `/mcp-oauth` paths
 * (advertised in discovery, persisted by existing DCR clients) and the
 * neutral `/oauth` aliases that future, non-MCP protected resources will
 * advertise.
 */
export type OAuthEndpointBasePath = '/mcp-oauth' | '/oauth';

const DEFAULT_ENDPOINT_BASE_PATH: OAuthEndpointBasePath = '/mcp-oauth';

export interface PkcePair {
	verifier: string;
	challenge: string;
}

export interface OAuthClientRegistration {
	client_name: string;
	redirect_uris: string[];
	grant_types: string[];
	token_endpoint_auth_method: string;
}

export interface RegisteredOAuthClient extends OAuthClientRegistration {
	client_id: string;
	client_secret?: string;
}

export interface OAuthTokens {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
}

export interface AuthorizationFlowResult {
	client: RegisteredOAuthClient;
	tokens: OAuthTokens;
	pkce: PkcePair;
	redirectUri: string;
	state: string;
}

/**
 * Helper for the instance-level MCP OAuth2 server (authorization code + PKCE flow).
 *
 * Endpoint layout:
 * - Discovery, register, authorize, token and revoke are root-level (no /rest prefix).
 * - Consent endpoints are REST controllers (/rest/consent/*) and require the
 *   authenticated user's session cookie plus the OAuth session cookie set by
 *   the authorize redirect. Both live in this request context's cookie jar.
 */
export class McpOAuthApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	/** Generates a PKCE verifier and its S256 challenge (RFC 7636). */
	createPkcePair(): PkcePair {
		const verifier = randomBytes(32).toString('base64url');
		const challenge = createHash('sha256').update(verifier).digest('base64url');
		return { verifier, challenge };
	}

	async getAuthorizationServerMetadata(): Promise<APIResponse> {
		return await this.api.request.get('/.well-known/oauth-authorization-server');
	}

	async getProtectedResourceMetadata(): Promise<APIResponse> {
		return await this.api.request.get('/.well-known/oauth-protected-resource/mcp-server/http');
	}

	/** Dynamic client registration (RFC 7591). Unauthenticated. */
	async registerClient(
		registration: OAuthClientRegistration,
		basePath: OAuthEndpointBasePath = DEFAULT_ENDPOINT_BASE_PATH,
	): Promise<APIResponse> {
		return await this.api.request.post(`${basePath}/register`, { data: registration });
	}

	async registerClientOrFail(
		registration: OAuthClientRegistration,
		basePath: OAuthEndpointBasePath = DEFAULT_ENDPOINT_BASE_PATH,
	): Promise<RegisteredOAuthClient> {
		const response = await this.registerClient(registration, basePath);
		if (response.status() !== 201) {
			throw new TestError(
				`Failed to register OAuth client: ${response.status()} ${await response.text()}`,
			);
		}
		return (await response.json()) as RegisteredOAuthClient;
	}

	buildAuthorizeUrl(params: {
		clientId: string;
		redirectUri: string;
		challenge: string;
		state?: string;
		resource?: string;
		basePath?: OAuthEndpointBasePath;
	}): string {
		const query = new URLSearchParams({
			client_id: params.clientId,
			redirect_uri: params.redirectUri,
			response_type: 'code',
			code_challenge: params.challenge,
			code_challenge_method: 'S256',
			...(params.state && { state: params.state }),
			...(params.resource && { resource: params.resource }),
		});
		return `${params.basePath ?? DEFAULT_ENDPOINT_BASE_PATH}/authorize?${query.toString()}`;
	}

	/**
	 * Starts the authorization flow. Does not follow the redirect so tests can
	 * assert on it. The OAuth session cookie from the response is stored in the
	 * request context's cookie jar for the subsequent consent calls.
	 */
	async authorize(params: {
		clientId: string;
		redirectUri: string;
		challenge: string;
		state?: string;
		resource?: string;
		basePath?: OAuthEndpointBasePath;
	}): Promise<APIResponse> {
		return await this.api.request.get(this.buildAuthorizeUrl(params), { maxRedirects: 0 });
	}

	/** Requires a signed-in user and a pending OAuth session (see authorize). */
	async getConsentDetails(): Promise<APIResponse> {
		return await this.api.request.get('/rest/consent/details');
	}

	/** Requires a signed-in user and a pending OAuth session (see authorize). */
	async approveConsent(approved: boolean): Promise<APIResponse> {
		return await this.api.request.post('/rest/consent/approve', { data: { approved } });
	}

	/**
	 * Approves or denies the pending consent and returns the redirect URL the
	 * client would be sent back to (carrying either the code or the error).
	 */
	async submitConsentOrFail(approved: boolean): Promise<URL> {
		const response = await this.approveConsent(approved);
		if (!response.ok()) {
			throw new TestError(
				`Failed to submit consent: ${response.status()} ${await response.text()}`,
			);
		}
		const body = (await response.json()) as { data: { redirectUrl: string } };
		return new URL(body.data.redirectUrl);
	}

	/** Token endpoint expects application/x-www-form-urlencoded (RFC 6749). */
	async exchangeAuthorizationCode(params: {
		code: string;
		clientId: string;
		codeVerifier: string;
		redirectUri: string;
		resource?: string;
		basePath?: OAuthEndpointBasePath;
	}): Promise<APIResponse> {
		return await this.api.request.post(`${params.basePath ?? DEFAULT_ENDPOINT_BASE_PATH}/token`, {
			form: {
				grant_type: 'authorization_code',
				code: params.code,
				client_id: params.clientId,
				code_verifier: params.codeVerifier,
				redirect_uri: params.redirectUri,
				...(params.resource && { resource: params.resource }),
			},
		});
	}

	async exchangeAuthorizationCodeOrFail(params: {
		code: string;
		clientId: string;
		codeVerifier: string;
		redirectUri: string;
		resource?: string;
		basePath?: OAuthEndpointBasePath;
	}): Promise<OAuthTokens> {
		const response = await this.exchangeAuthorizationCode(params);
		if (!response.ok()) {
			throw new TestError(
				`Failed to exchange authorization code: ${response.status()} ${await response.text()}`,
			);
		}
		return (await response.json()) as OAuthTokens;
	}

	async refreshToken(params: {
		refreshToken: string;
		clientId: string;
		basePath?: OAuthEndpointBasePath;
	}): Promise<APIResponse> {
		return await this.api.request.post(`${params.basePath ?? DEFAULT_ENDPOINT_BASE_PATH}/token`, {
			form: {
				grant_type: 'refresh_token',
				refresh_token: params.refreshToken,
				client_id: params.clientId,
			},
		});
	}

	async revokeToken(params: {
		token: string;
		clientId: string;
		tokenTypeHint?: 'access_token' | 'refresh_token';
		basePath?: OAuthEndpointBasePath;
	}): Promise<APIResponse> {
		return await this.api.request.post(`${params.basePath ?? DEFAULT_ENDPOINT_BASE_PATH}/revoke`, {
			form: {
				token: params.token,
				client_id: params.clientId,
				...(params.tokenTypeHint && { token_type_hint: params.tokenTypeHint }),
			},
		});
	}

	/**
	 * Runs the full authorization code + PKCE flow for the signed-in user:
	 * register client → authorize → approve consent → exchange code for tokens.
	 */
	async completeAuthorizationCodeFlow(options?: {
		clientName?: string;
		redirectUri?: string;
		basePath?: OAuthEndpointBasePath;
	}): Promise<AuthorizationFlowResult> {
		const redirectUri = options?.redirectUri ?? 'https://example.com/callback';
		const state = randomBytes(16).toString('hex');
		const pkce = this.createPkcePair();
		const basePath = options?.basePath ?? DEFAULT_ENDPOINT_BASE_PATH;

		const client = await this.registerClientOrFail(
			{
				client_name: options?.clientName ?? 'n8n e2e OAuth client',
				redirect_uris: [redirectUri],
				grant_types: ['authorization_code', 'refresh_token'],
				token_endpoint_auth_method: 'none',
			},
			basePath,
		);

		const authorizeResponse = await this.authorize({
			clientId: client.client_id,
			redirectUri,
			challenge: pkce.challenge,
			state,
			basePath,
		});
		if (authorizeResponse.status() !== 302) {
			throw new TestError(
				`Authorize did not redirect to consent: ${authorizeResponse.status()} ${await authorizeResponse.text()}`,
			);
		}

		const callbackUrl = await this.submitConsentOrFail(true);
		const code = callbackUrl.searchParams.get('code');
		if (!code) {
			throw new TestError(`Consent approval returned no authorization code: ${callbackUrl.href}`);
		}

		const tokens = await this.exchangeAuthorizationCodeOrFail({
			code,
			clientId: client.client_id,
			codeVerifier: pkce.verifier,
			redirectUri,
			basePath,
		});

		return { client, tokens, pkce, redirectUri, state };
	}
}
