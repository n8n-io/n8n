import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { IUser, IWebhookFunctions, N8nOAuth2FlowResult, Logger } from '../src/interfaces';
import { n8nBrowserOAuth2Flow } from '../src/n8n-browser-oauth2-flow';

const RESOURCE_URL = 'https://n8n.example.com/webhook/abc?method=GET';
const AUTHORIZE_URL = 'https://n8n.example.com/oauth/authorize?client_id=…&state=s1';
const USER = { id: 'u1', email: 'user@example.com' } as IUser;

const VALID_COMPLETION = {
	valid: true,
	token: 'fresh-token',
	refreshToken: 'refresh-token',
	expiresIn: 3600,
	user: USER,
} satisfies N8nOAuth2FlowResult;

const buildContext = (
	req: {
		method?: string;
		protocol?: string;
		accept?: string;
		headers?: Record<string, string>;
		cookie?: string;
		query?: Record<string, string>;
		originalUrl?: string;
	} = {},
) => {
	const response = mock<Response>();
	response.writeHead.mockReturnValue(response);
	response.end.mockReturnValue(response);
	response.status.mockReturnValue(response);
	response.send.mockReturnValue(response);
	response.cookie.mockReturnValue(response);
	response.clearCookie.mockReturnValue(response);

	const context = mock<IWebhookFunctions>();
	context.logger = mock<Logger>();
	context.getResponseObject.mockReturnValue(response);
	const request = {
		method: req.method ?? 'GET',
		protocol: req.protocol ?? 'https',
		headers: {
			...(req.accept === undefined ? { accept: 'text/html' } : { accept: req.accept }),
			...(req.cookie ? { cookie: req.cookie } : {}),
			...req.headers,
		} as Record<string, string>,
		query: req.query ?? {},
		originalUrl: req.originalUrl ?? '/webhook/abc?ref=email',
	};
	context.getRequestObject.mockReturnValue(request as never);
	context.beginN8nOAuth2Flow.mockResolvedValue(AUTHORIZE_URL);

	return { context, response, request };
};

describe('n8nBrowserOAuth2Flow', () => {
	it('redirects a fresh browser GET to the authorization server, preserving the caller query', async () => {
		const { context, response } = buildContext();

		const outcome = await n8nBrowserOAuth2Flow(context, RESOURCE_URL);

		expect(outcome).toBe('handled');
		expect(context.beginN8nOAuth2Flow).toHaveBeenCalledWith(RESOURCE_URL, {
			returnTo: '/webhook/abc?ref=email',
		});
		expect(response.writeHead).toHaveBeenCalledWith(302, { Location: AUTHORIZE_URL });
	});

	// The gate: only a top-level browser navigation on a GET enters the flow. Everything
	// else stays with bearer-token auth, whatever it carries. A redirect can never carry
	// a POST body; SameSite=Lax still sends the one-hop cookie on a same-origin fetch();
	// and a hidden <iframe> reports `navigate` too, so `Sec-Fetch-Dest` tells it apart
	// from the address bar changing. `force` skips the heuristic, never the GET rule.
	const COOKIE = 'n8n-webhook-oauth=fresh-token';
	const CALLBACK = { code: 'c1', state: 's1' };
	const NAV = { 'sec-fetch-mode': 'navigate' };
	const CORS = { 'sec-fetch-mode': 'cors' };
	const JSON_ACCEPT = { accept: 'application/json' };
	it.each([
		['a non-browser GET', JSON_ACCEPT, false],
		['a POST', { method: 'POST', accept: '*/*' }, false],
		['a POST with the one-hop cookie', { method: 'POST', cookie: COOKIE }, false],
		['a POST with callback code/state', { method: 'POST', query: CALLBACK }, false],
		['Sec-Fetch-Mode: cors with an HTML Accept', { headers: CORS }, false],
		['Sec-Fetch-Dest: iframe', { headers: { ...NAV, 'sec-fetch-dest': 'iframe' } }, false],
		['Sec-Fetch-Dest: iframe, Accept fallback', { headers: { 'sec-fetch-dest': 'iframe' } }, false],
		['a non-navigation GET with the one-hop cookie', { cookie: COOKIE, headers: CORS }, false],
		['a non-navigation GET with callback code/state', { query: CALLBACK, headers: CORS }, false],
		['a POST, even when forced', { method: 'POST', accept: '*/*' }, true],
	])('leaves %s to bearer-token auth', async (_label, req, force) => {
		const { context, response } = buildContext(req);

		expect(await n8nBrowserOAuth2Flow(context, RESOURCE_URL, force)).toBe('not-applicable');
		expect(context.completeN8nOAuth2Flow).not.toHaveBeenCalled();
		expect(context.validateN8nOAuth2Token).not.toHaveBeenCalled();
		expect(response.clearCookie).not.toHaveBeenCalled();
		expect(response.writeHead).not.toHaveBeenCalled();
	});

	it.each([
		['Sec-Fetch-Mode: navigate without an HTML Accept', { ...JSON_ACCEPT, headers: NAV }, false],
		['Sec-Fetch-Dest: document', { headers: { ...NAV, 'sec-fetch-dest': 'document' } }, false],
		['no browser signal at all, when forced', JSON_ACCEPT, true],
	])('redirects a GET carrying %s', async (_label, req, force) => {
		const { context, response } = buildContext(req);

		expect(await n8nBrowserOAuth2Flow(context, RESOURCE_URL, force)).toBe('handled');
		expect(response.writeHead).toHaveBeenCalledWith(302, { Location: AUTHORIZE_URL });
	});

	it('exchanges the callback code, then bounces to the clean URL with a one-hop cookie', async () => {
		const { context, response } = buildContext({
			query: { code: 'c1', state: 's1', iss: 'https://n8n.example.com' },
			originalUrl: '/webhook/abc?method=GET&code=c1&state=s1&iss=https%3A%2F%2Fn8n.example.com',
		});
		context.completeN8nOAuth2Flow.mockResolvedValue({
			...VALID_COMPLETION,
			metadata: { returnTo: '/webhook/abc?ref=email' },
		});

		const outcome = await n8nBrowserOAuth2Flow(context, RESOURCE_URL);

		expect(outcome).toBe('handled');
		expect(context.completeN8nOAuth2Flow).toHaveBeenCalledWith('c1', 's1');
		expect(response.cookie).toHaveBeenCalledWith(
			'n8n-webhook-oauth',
			'fresh-token',
			expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/webhook/abc' }),
		);
		// the workflow never sees `code`/`state`: they are dropped on the bounce
		expect(response.writeHead).toHaveBeenCalledWith(302, { Location: '/webhook/abc?ref=email' });
	});

	// `secure` follows the request scheme, not config: over plain http in dev a Secure
	// cookie would never come back on the follow-up GET and the flow would loop.
	it.each([
		['https', 'https', {}, true],
		['http', 'http', {}, false],
		['http behind a TLS-terminating proxy', 'http', { 'x-forwarded-proto': 'https' }, true],
	])(
		'sets the cookie Secure flag from the request scheme (%s)',
		async (_label, protocol, headers, secure) => {
			const { context, response } = buildContext({
				protocol,
				headers,
				query: { code: 'c1', state: 's1' },
				originalUrl: '/webhook/abc?method=GET&code=c1&state=s1',
			});
			context.completeN8nOAuth2Flow.mockResolvedValue(VALID_COMPLETION);

			await n8nBrowserOAuth2Flow(context, RESOURCE_URL);

			expect(response.cookie).toHaveBeenCalledWith(
				'n8n-webhook-oauth',
				'fresh-token',
				expect.objectContaining({ secure }),
			);
		},
	);

	// A dynamic webhook's resource URL is the templated path, so it is also the
	// registered redirect_uri — the callback hop lands on the literal `:id` path while
	// the hop that consumes the cookie sits on the resolved one. Scoping the cookie to
	// either request's own path leaves it unreadable and the flow redirect-loops.
	it('scopes the cookie to the redirect target, not the templated callback path', async () => {
		const DYNAMIC_RESOURCE_URL = 'https://n8n.example.com/webhook/abc/user/:id?method=GET';
		const { context, response } = buildContext({
			query: { code: 'c1', state: 's1' },
			originalUrl: '/webhook/abc/user/:id?method=GET&code=c1&state=s1',
		});
		context.completeN8nOAuth2Flow.mockResolvedValue({
			...VALID_COMPLETION,
			metadata: { returnTo: '/webhook/abc/user/42?ref=email' },
		});

		await n8nBrowserOAuth2Flow(context, DYNAMIC_RESOURCE_URL);

		expect(response.cookie).toHaveBeenCalledWith(
			'n8n-webhook-oauth',
			'fresh-token',
			expect.objectContaining({ path: '/webhook/abc/user/42' }),
		);
		expect(response.writeHead).toHaveBeenCalledWith(302, {
			Location: '/webhook/abc/user/42?ref=email',
		});
	});

	it('consumes the cookie at the resolved path on the follow-up GET', async () => {
		const { context, response } = buildContext({
			cookie: 'n8n-webhook-oauth=fresh-token',
			originalUrl: '/webhook/abc/user/42?ref=email',
		});
		context.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user: USER });

		const outcome = await n8nBrowserOAuth2Flow(
			context,
			'https://n8n.example.com/webhook/abc/user/:id?method=GET',
		);

		expect(outcome).toEqual({ status: 'ok', token: 'fresh-token', user: USER });
		// Same path the callback hop set it for, so the clear actually removes it.
		expect(response.clearCookie).toHaveBeenCalledWith(
			'n8n-webhook-oauth',
			expect.objectContaining({ path: '/webhook/abc/user/42' }),
		);
	});

	it('falls back to the request URL (minus callback params) when no returnTo was stashed', async () => {
		const { context, response } = buildContext({
			query: { code: 'c1', state: 's1' },
			originalUrl: '/webhook/abc?method=GET&code=c1&state=s1',
		});
		context.completeN8nOAuth2Flow.mockResolvedValue(VALID_COMPLETION);

		await n8nBrowserOAuth2Flow(context, RESOURCE_URL);

		expect(response.writeHead).toHaveBeenCalledWith(302, { Location: '/webhook/abc?method=GET' });
	});

	it('authenticates the follow-up GET from the cookie and consumes it', async () => {
		const { context, response, request } = buildContext({
			cookie: 'theme=dark; n8n-webhook-oauth=fresh-token; lang=en',
		});
		context.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user: USER });

		const outcome = await n8nBrowserOAuth2Flow(context, RESOURCE_URL);

		expect(outcome).toEqual({ status: 'ok', token: 'fresh-token', user: USER });
		expect(context.validateN8nOAuth2Token).toHaveBeenCalledWith('fresh-token', RESOURCE_URL);
		expect(response.clearCookie).toHaveBeenCalledWith('n8n-webhook-oauth', expect.anything());
		expect(context.beginN8nOAuth2Flow).not.toHaveBeenCalled();
		// The token never reaches the workflow's header data; unrelated cookies stay.
		expect(request.headers.cookie).toBe('theme=dark; lang=en');
	});

	it('removes the cookie header entirely when the one-hop cookie was the only cookie', async () => {
		const { context, request } = buildContext({ cookie: 'n8n-webhook-oauth=fresh-token' });
		context.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user: USER });

		await n8nBrowserOAuth2Flow(context, RESOURCE_URL);

		expect(request.headers).not.toHaveProperty('cookie');
	});

	it('restarts the flow when the cookie token no longer validates', async () => {
		const { context, response } = buildContext({ cookie: 'n8n-webhook-oauth=stale-token' });
		context.validateN8nOAuth2Token.mockResolvedValue({ valid: false, reason: 'invalid_token' });

		expect(await n8nBrowserOAuth2Flow(context, RESOURCE_URL)).toBe('handled');
		expect(response.writeHead).toHaveBeenCalledWith(302, { Location: AUTHORIZE_URL });
	});

	it('restarts the flow when the callback cannot be completed, without replaying code/state', async () => {
		const { context, response } = buildContext({
			query: { code: 'c1', state: 'replayed' },
			originalUrl: '/webhook/abc?method=GET&code=c1&state=replayed',
		});
		context.completeN8nOAuth2Flow.mockResolvedValue({ valid: false, reason: 'invalid_state' });

		expect(await n8nBrowserOAuth2Flow(context, RESOURCE_URL)).toBe('handled');
		expect(context.beginN8nOAuth2Flow).toHaveBeenCalledWith(RESOURCE_URL, {
			returnTo: '/webhook/abc?method=GET',
		});
		expect(response.writeHead).toHaveBeenCalledWith(302, { Location: AUTHORIZE_URL });
	});

	it('stops with 403 when the user denied consent, instead of looping', async () => {
		const { context, response } = buildContext({
			query: { error: 'access_denied', error_description: 'User denied the request' },
		});

		expect(await n8nBrowserOAuth2Flow(context, RESOURCE_URL)).toBe('handled');
		expect(response.status).toHaveBeenCalledWith(403);
		expect(context.beginN8nOAuth2Flow).not.toHaveBeenCalled();
	});
});
