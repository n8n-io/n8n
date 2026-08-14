import type { APIResponse } from '@playwright/test';

import type { ApiHelpers } from './api-helper';

/** RFC 8693 token-exchange grant type advertised by the token endpoint. */
const TOKEN_EXCHANGE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:token-exchange';

/**
 * Helper for the token-exchange and embed-login auth surface.
 *
 * - `exchange` hits the OAuth token endpoint (form-encoded, RFC 6749) and
 *   returns the raw response so error-case tests can assert on status/body.
 * - The issued-token helpers call the public API with the `x-n8n-api-key`
 *   header so tests don't hand-roll the header each time.
 * - `embedLogin` covers both the POST (token in body) and GET (token in query)
 *   variants of the embed endpoint.
 */
export class TokenExchangeApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	/**
	 * Exchanges an external JWT (optionally with an actor token for delegation)
	 * for an access token. Returns the raw response so callers can assert on
	 * `status()` / `body.error` for the error and expiry cases.
	 */
	async exchange(params: { subjectToken: string; actorToken?: string }): Promise<APIResponse> {
		return await this.api.request.post('/rest/auth/oauth/token', {
			form: {
				grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
				subject_token: params.subjectToken,
				...(params.actorToken ? { actor_token: params.actorToken } : {}),
			},
		});
	}

	/** Calls a public API endpoint with an issued access token via the `x-n8n-api-key` header. */
	async callWithIssuedToken(
		method: 'GET' | 'POST',
		path: string,
		options: { accessToken: string; data?: unknown },
	): Promise<APIResponse> {
		if (method === 'POST') {
			return await this.api.request.post(path, {
				headers: {
					'x-n8n-api-key': options.accessToken,
					'content-type': 'application/json',
				},
				data: options.data,
			});
		}
		return await this.api.request.get(path, {
			headers: { 'x-n8n-api-key': options.accessToken },
		});
	}

	/** Lists workflows via the public API using an issued access token. */
	async getWorkflows(accessToken: string): Promise<APIResponse> {
		return await this.callWithIssuedToken('GET', '/api/v1/workflows', { accessToken });
	}

	/** Lists users via the public API using an issued access token. */
	async getUsers(accessToken: string): Promise<APIResponse> {
		return await this.callWithIssuedToken('GET', '/api/v1/users', { accessToken });
	}

	/** Creates a workflow via the public API using an issued access token. */
	async createWorkflow(accessToken: string, workflow: unknown): Promise<APIResponse> {
		return await this.callWithIssuedToken('POST', '/api/v1/workflows', {
			accessToken,
			data: workflow,
		});
	}

	/**
	 * Logs in via the embed endpoint. POST sends the token in the body, GET sends
	 * it as a query param. Redirects are not followed by default so the caller
	 * can assert on the 302 and the `set-cookie` header.
	 */
	async embedLogin(
		token: string,
		options?: { method?: 'POST' | 'GET'; maxRedirects?: number },
	): Promise<APIResponse> {
		const maxRedirects = options?.maxRedirects ?? 0;
		if (options?.method === 'GET') {
			return await this.api.request.get(`/rest/auth/embed?token=${encodeURIComponent(token)}`, {
				maxRedirects,
			});
		}
		return await this.api.request.post('/rest/auth/embed', { data: { token }, maxRedirects });
	}

	/** Verifies an embed-login session cookie works against an authenticated endpoint. */
	async getSettingsWithCookie(cookie: string): Promise<APIResponse> {
		return await this.api.request.get('/rest/settings', { headers: { cookie } });
	}
}
