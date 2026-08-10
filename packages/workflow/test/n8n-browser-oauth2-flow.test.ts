import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { IUser, IWebhookFunctions, N8nOAuth2FlowResult, Logger } from '../src/interfaces';
import { n8nBrowserOAuth2Flow } from '../src/n8n-browser-oauth2-flow';

const RESOURCE_URL = 'https://n8n.example.com/webhook/abc?method=GET';
const AUTHORIZE_URL = 'https://n8n.example.com/oauth/authorize?client_id=…&state=s1';

const VALID_COMPLETION = {
	valid: true,
	token: 'fresh-token',
	user: { id: 'u1', email: 'user@example.com' } as IUser,
} satisfies N8nOAuth2FlowResult;

const buildContext = (
	req: {
		method?: string;
		accept?: string;
		cookie?: string;
		query?: Record<string, string>;
		originalUrl?: string;
		fetchMetadata?: Record<string, string>;
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
	context.getRequestObject.mockReturnValue({
		method: req.method ?? 'GET',
		protocol: 'https',
		headers: {
			...(req.accept === undefined ? { accept: 'text/html' } : { accept: req.accept }),
			...(req.cookie ? { cookie: req.cookie } : {}),
			// A clicked link from another site: navigation with user activation.
			...(req.fetchMetadata ?? {
				'sec-fetch-mode': 'navigate',
				'sec-fetch-site': 'cross-site',
				'sec-fetch-user': '?1',
			}),
		},
		query: req.query ?? {},
		originalUrl: req.originalUrl ?? '/webhook/abc?ref=email',
	} as never);
	context.beginN8nOAuth2Flow.mockResolvedValue(AUTHORIZE_URL);

	return { context, response };
};

describe('n8nBrowserOAuth2Flow', () => {
	it('redirects a fresh browser GET to the authorization server, preserving the caller query', async () => {
		const { context, response } = buildContext();

		const outcome = await n8nBrowserOAuth2Flow(context, RESOURCE_URL);

		expect(outcome).toBe('handled');
		expect(context.beginN8nOAuth2Flow).toHaveBeenCalledWith(RESOURCE_URL, {
			returnTo: '/webhook/abc?ref=email',
			intent: 'user-navigation',
		});
		expect(response.writeHead).toHaveBeenCalledWith(302, { Location: AUTHORIZE_URL });
	});

	// The consent step may only skip re-prompting for a flow a human actually started,
	// so the classification travels with the flow (server-side, never in the URL).
	it.each([
		[
			'a link clicked on another site',
			{ 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'cross-site', 'sec-fetch-user': '?1' },
			'user-navigation',
		],
		[
			'a typed URL or bookmark',
			{ 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'none' },
			'user-navigation',
		],
		[
			'a link from n8n itself',
			{ 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'same-origin' },
			'user-navigation',
		],
		// `location = …` from a cross-site page: a navigation nobody asked for.
		[
			'a script-driven navigation',
			{ 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'cross-site' },
			'unknown',
		],
		[
			'a sibling-subdomain script navigation',
			{ 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'same-site' },
			'unknown',
		],
		[
			'an embedded (non-navigation) load',
			{ 'sec-fetch-mode': 'no-cors', 'sec-fetch-site': 'cross-site', 'sec-fetch-user': '?1' },
			'unknown',
		],
		['a client sending no fetch metadata', {}, 'unknown'],
	] as const)('records %s as %s', async (_label, fetchMetadata, expected) => {
		const { context } = buildContext({ fetchMetadata: { ...fetchMetadata } });

		await n8nBrowserOAuth2Flow(context, RESOURCE_URL);

		expect(context.beginN8nOAuth2Flow).toHaveBeenCalledWith(
			RESOURCE_URL,
			expect.objectContaining({ intent: expected }),
		);
	});

	it.each([
		['a non-browser GET', { accept: 'application/json' }],
		['a POST', { method: 'POST', accept: '*/*' }],
	])('leaves %s to bearer-token auth', async (_label, req) => {
		const { context, response } = buildContext(req);

		expect(await n8nBrowserOAuth2Flow(context, RESOURCE_URL)).toBe('not-applicable');
		expect(context.beginN8nOAuth2Flow).not.toHaveBeenCalled();
		expect(response.writeHead).not.toHaveBeenCalled();
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

	it('scopes the cookie to the resolved request path, not the templated resourceUrl path', async () => {
		const DYNAMIC_RESOURCE_URL = 'https://n8n.example.com/webhook/abc/user/:id?method=GET';
		const { context, response } = buildContext({
			query: { code: 'c1', state: 's1' },
			originalUrl: '/webhook/abc/user/42?method=GET&code=c1&state=s1',
		});
		context.completeN8nOAuth2Flow.mockResolvedValue(VALID_COMPLETION);

		await n8nBrowserOAuth2Flow(context, DYNAMIC_RESOURCE_URL);

		expect(response.cookie).toHaveBeenCalledWith(
			'n8n-webhook-oauth',
			'fresh-token',
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
		const { context, response } = buildContext({ cookie: 'n8n-webhook-oauth=fresh-token' });
		context.validateN8nOAuth2Token.mockResolvedValue({
			valid: true,
			user: { id: 'u1' } as never,
		});

		const outcome = await n8nBrowserOAuth2Flow(context, RESOURCE_URL);

		expect(outcome).toEqual({ status: 'ok', token: 'fresh-token' });
		expect(context.validateN8nOAuth2Token).toHaveBeenCalledWith('fresh-token', RESOURCE_URL);
		expect(response.clearCookie).toHaveBeenCalledWith('n8n-webhook-oauth', expect.anything());
		expect(context.beginN8nOAuth2Flow).not.toHaveBeenCalled();
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
			intent: 'user-navigation',
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
