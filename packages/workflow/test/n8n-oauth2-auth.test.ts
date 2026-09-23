import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { REDACTED, redactedHeaders } from '../src/auth-redaction';
import type { IWebhookFunctions, N8nOAuth2ValidationResult } from '../src/interfaces';
import { n8nOAuth2Auth, resolveOAuthClientMode } from '../src/n8n-oauth2-auth';

const WEBHOOK_URL = 'https://n8n.example.com/webhook/protected-path';
const USER = { id: 'u1', email: 'u@example.com', firstName: 'U', lastName: 'One' };

const AUTHORIZE_URL = 'https://n8n.example.com/oauth/authorize?client_id=…&state=s1';

const buildContext = (opts: {
	authorization?: string;
	otherHeaders?: Record<string, string>;
	validation?: N8nOAuth2ValidationResult;
	webhookUrl?: string | undefined;
	method?: string;
	originalUrl?: string;
	query?: Record<string, string>;
}) => {
	const response = mock<Response>();
	response.writeHead.mockReturnValue(response);
	response.end.mockReturnValue(response);
	response.status.mockReturnValue(response);
	response.send.mockReturnValue(response);
	response.cookie.mockReturnValue(response);
	response.clearCookie.mockReturnValue(response);

	const context = mock<IWebhookFunctions>();
	context.getWebhookResourceUrl.mockReturnValue(
		'webhookUrl' in opts ? opts.webhookUrl : WEBHOOK_URL,
	);
	context.getResponseObject.mockReturnValue(response);
	const request = {
		method: opts.method ?? 'GET',
		protocol: 'https',
		headers: {
			...(opts.authorization ? { authorization: opts.authorization } : {}),
			...opts.otherHeaders,
		} as Record<string, string>,
		query: opts.query ?? {},
		originalUrl: opts.originalUrl ?? '/webhook/protected-path',
	};
	context.getRequestObject.mockReturnValue(request as never);
	context.validateN8nOAuth2Token.mockResolvedValue(opts.validation ?? { valid: true, user: USER });
	context.beginN8nOAuth2Flow.mockResolvedValue(AUTHORIZE_URL);

	return { context, response, request, validateN8nOAuth2Token: context.validateN8nOAuth2Token };
};

describe('n8nOAuth2Auth', () => {
	it('returns the token, resource and resolved user for a valid bearer token', async () => {
		const { context, validateN8nOAuth2Token } = buildContext({
			authorization: 'Bearer good-token',
			validation: { valid: true, user: USER },
		});

		const result = await n8nOAuth2Auth(context, { realm: 'n8n Webhook' });

		expect(validateN8nOAuth2Token).toHaveBeenCalledWith('good-token', WEBHOOK_URL);
		expect(result).toEqual({
			status: 'ok',
			token: 'good-token',
			resource: WEBHOOK_URL,
			user: USER,
		});
	});

	it('encodes the served method into the resource and the protected-resource metadata URL', async () => {
		const { context, validateN8nOAuth2Token } = buildContext({
			authorization: 'Bearer good-token',
		});

		// mixed-case input is canonicalised to the upper-cased `method` selector
		const result = await n8nOAuth2Auth(context, { realm: 'n8n Webhook', method: 'post' });

		const expectedResource = `${WEBHOOK_URL}?method=POST`;
		expect(validateN8nOAuth2Token).toHaveBeenCalledWith('good-token', expectedResource);
		expect(result).toEqual({
			status: 'ok',
			token: 'good-token',
			resource: expectedResource,
			user: USER,
		});
	});

	it('advertises the method-qualified metadata URL in WWW-Authenticate', async () => {
		const { context, response } = buildContext({});

		await n8nOAuth2Auth(context, { realm: 'n8n Webhook', method: 'GET' });

		expect(response.writeHead).toHaveBeenCalledWith(401, {
			'WWW-Authenticate': expect.stringContaining(
				'/.well-known/oauth-protected-resource/webhook/protected-path?method=GET',
			),
		});
	});

	it('responds 401 without WWW-Authenticate error when no bearer token is present', async () => {
		const { context, response, validateN8nOAuth2Token } = buildContext({});

		const result = await n8nOAuth2Auth(context, { realm: 'n8n Webhook' });

		expect(result).toBe('handled');
		expect(validateN8nOAuth2Token).not.toHaveBeenCalled();
		expect(response.writeHead).toHaveBeenCalledWith(401, {
			'WWW-Authenticate': expect.stringContaining('realm="n8n Webhook"'),
		});
	});

	// insufficient_scope → 403, invalid_token → 401; both carry the reason in WWW-Authenticate.
	it.each([
		['insufficient_scope', 403],
		['invalid_token', 401],
	] as const)('maps a %s validation failure to a %i response', async (reason, code) => {
		const { context, response } = buildContext({
			authorization: 'Bearer test-token',
			validation: { valid: false, reason },
		});

		const result = await n8nOAuth2Auth(context, { realm: 'n8n MCP Server' });

		expect(result).toBe('handled');
		expect(response.writeHead).toHaveBeenCalledWith(code, {
			'WWW-Authenticate': expect.stringContaining(`error="${reason}"`),
		});
	});

	it('responds 503 when the token verifier is unavailable', async () => {
		const { context, response } = buildContext({
			authorization: 'Bearer test-token',
			validation: { valid: false, reason: 'verifier_unavailable' },
		});

		const result = await n8nOAuth2Auth(context, { realm: 'n8n Webhook' });

		expect(result).toBe('handled');
		expect(response.status).toHaveBeenCalledWith(503);
		expect(response.send).toHaveBeenCalledWith('OAuth token validation is not available');
	});

	it('records the authorization header as consumed once the token is validated', async () => {
		const { context, request } = buildContext({
			authorization: 'Bearer good-token',
			otherHeaders: { 'x-tenant-id': 'acme' },
		});

		await n8nOAuth2Auth(context, { realm: 'n8n Webhook' });

		expect(request.headers).toEqual({
			authorization: 'Bearer good-token',
			'x-tenant-id': 'acme',
		});

		expect(redactedHeaders(request)).toEqual({
			authorization: REDACTED,
			'x-tenant-id': 'acme',
		});
	});

	it('records nothing when validation fails', async () => {
		const { context, request } = buildContext({
			authorization: 'Bearer bad-token',
			validation: { valid: false, reason: 'invalid_token' },
		});

		await n8nOAuth2Auth(context, { realm: 'n8n Webhook' });

		expect(redactedHeaders(request)).toEqual({ authorization: 'Bearer bad-token' });
	});

	it('throws when the webhook URL is unavailable', async () => {
		const { context } = buildContext({ webhookUrl: undefined });

		await expect(n8nOAuth2Auth(context, { realm: 'n8n Webhook' })).rejects.toThrow(
			'Webhook URL is not available',
		);
	});

	describe('browser flow', () => {
		it('redirects a tokenless browser navigation instead of 401ing, under auto-detect', async () => {
			const { context, response } = buildContext({
				otherHeaders: { accept: 'text/html' },
			});

			const result = await n8nOAuth2Auth(context, {
				realm: 'n8n Webhook',
				method: 'GET',
				browserFlow: 'auto',
			});

			expect(result).toBe('handled');
			expect(context.beginN8nOAuth2Flow).toHaveBeenCalled();
			expect(response.writeHead).toHaveBeenCalledWith(302, { Location: AUTHORIZE_URL });
		});

		it('still 401s a tokenless machine GET under auto-detect', async () => {
			const { context, response } = buildContext({ otherHeaders: { accept: 'application/json' } });

			const result = await n8nOAuth2Auth(context, {
				realm: 'n8n Webhook',
				method: 'GET',
				browserFlow: 'auto',
			});

			expect(result).toBe('handled');
			expect(context.beginN8nOAuth2Flow).not.toHaveBeenCalled();
			expect(response.writeHead).toHaveBeenCalledWith(401, {
				'WWW-Authenticate': expect.stringContaining('realm="n8n Webhook"'),
			});
		});

		it('never redirects when forced to bearer-only, even for a browser navigation', async () => {
			const { context, response } = buildContext({ otherHeaders: { accept: 'text/html' } });

			const result = await n8nOAuth2Auth(context, {
				realm: 'n8n Webhook',
				method: 'GET',
				browserFlow: 'bearer',
			});

			expect(result).toBe('handled');
			expect(context.beginN8nOAuth2Flow).not.toHaveBeenCalled();
			expect(response.writeHead).toHaveBeenCalledWith(401, expect.any(Object));
		});

		it('redirects a plain tokenless GET when forced to browser, without any browser signal', async () => {
			const { context, response } = buildContext({ otherHeaders: { accept: 'application/json' } });

			const result = await n8nOAuth2Auth(context, {
				realm: 'n8n Webhook',
				method: 'GET',
				browserFlow: 'browser',
			});

			expect(result).toBe('handled');
			expect(context.beginN8nOAuth2Flow).toHaveBeenCalled();
			expect(response.writeHead).toHaveBeenCalledWith(302, { Location: AUTHORIZE_URL });
		});

		it('still 401s a tokenless POST when forced to browser: a redirect cannot carry a body', async () => {
			const { context, response } = buildContext({ method: 'POST' });

			const result = await n8nOAuth2Auth(context, {
				realm: 'n8n Webhook',
				method: 'POST',
				browserFlow: 'browser',
			});

			expect(result).toBe('handled');
			expect(context.beginN8nOAuth2Flow).not.toHaveBeenCalled();
			expect(response.writeHead).toHaveBeenCalledWith(401, expect.any(Object));
		});

		it('leaves the 401 path unchanged when browserFlow is omitted (e.g. the MCP trigger)', async () => {
			const { context, response } = buildContext({ otherHeaders: { accept: 'text/html' } });

			const result = await n8nOAuth2Auth(context, { realm: 'n8n MCP Server', method: 'GET' });

			expect(result).toBe('handled');
			expect(context.beginN8nOAuth2Flow).not.toHaveBeenCalled();
			expect(response.writeHead).toHaveBeenCalledWith(401, expect.any(Object));
		});

		it('resolves ok from the one-hop cookie once the browser flow completes', async () => {
			const { context } = buildContext({
				otherHeaders: { cookie: 'n8n-webhook-oauth=cookie-token' },
			});
			context.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user: USER });

			const result = await n8nOAuth2Auth(context, {
				realm: 'n8n Webhook',
				method: 'GET',
				browserFlow: 'auto',
			});

			expect(result).toEqual({
				status: 'ok',
				token: 'cookie-token',
				resource: `${WEBHOOK_URL}?method=GET`,
				user: USER,
			});
			expect(context.validateN8nOAuth2Token).toHaveBeenCalledWith(
				'cookie-token',
				`${WEBHOOK_URL}?method=GET`,
			);
		});
	});
});

describe('resolveOAuthClientMode', () => {
	it('returns the explicit mode regardless of node version', () => {
		expect(resolveOAuthClientMode('bearer', 1)).toBe('bearer');
		expect(resolveOAuthClientMode('bearer', 2.2)).toBe('bearer');
		expect(resolveOAuthClientMode('browser', 1)).toBe('browser');
		expect(resolveOAuthClientMode('auto', 1)).toBe('auto');
	});

	it('defaults an unset mode to bearer below the version threshold, preserving prior behavior for workflows saved before the option existed', () => {
		expect(resolveOAuthClientMode(undefined, 1)).toBe('bearer');
		expect(resolveOAuthClientMode(undefined, 2.1)).toBe('bearer');
	});

	it('defaults an unset mode to auto at or above the version threshold', () => {
		expect(resolveOAuthClientMode(undefined, 2.2)).toBe('auto');
		expect(resolveOAuthClientMode(undefined, 3)).toBe('auto');
	});
});
