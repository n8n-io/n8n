import type { IWebhookFunctions } from './interfaces';

type Request = ReturnType<IWebhookFunctions['getRequestObject']>;
type Response = ReturnType<IWebhookFunctions['getResponseObject']>;

/**
 * Carries the access token across the single same-site redirect from the OAuth
 * callback to the clean webhook URL, so `code`/`state` never reach the workflow's
 * query data. Mirrors the form trigger's `n8n-form-oauth` cookie.
 */
const BROWSER_OAUTH_COOKIE_NAME = 'n8n-webhook-oauth';

/** Query params owned by the OAuth callback, stripped before handing the URL back. */
const CALLBACK_PARAMS = ['code', 'state', 'error', 'error_description', 'iss'];

/**
 * How the request that started an OAuth flow was initiated.
 *
 * - `user-navigation`: a top-level navigation the person actually performed —
 *   clicking a link (from anywhere), typing the URL, or a bookmark.
 * - `unknown`: everything else, including script-driven navigation
 *   (`location = …`, meta refresh, iframes, prefetch) and requests from clients
 *   that send no fetch metadata at all.
 *
 * Only used to decide whether a *previously consented* flow may complete without
 * re-prompting, so `unknown` degrades to showing the consent screen — never to a
 * hard failure.
 */
export type N8nOAuth2NavigationIntent = 'user-navigation' | 'unknown';

/** Flow-metadata key carrying {@link N8nOAuth2NavigationIntent} to the consent step. */
export const N8N_OAUTH2_INTENT_KEY = 'intent';

const firstHeaderValue = (header: string | string[] | undefined): string | undefined =>
	typeof header === 'string' ? header : header?.[0];

/**
 * Classify how a browser request was initiated, from Fetch Metadata headers.
 *
 * `Sec-Fetch-*` are forbidden header names, so page scripts cannot spoof them
 * (same property `push/origin-validator.ts` relies on). The distinction that
 * matters here is *user activation*, not origin: a click from an email or a chat
 * message is cross-site and must qualify, because that is the whole point of a
 * clickable trigger URL. What must not qualify is a navigation no one asked for —
 * a page setting `location` to a webhook URL would otherwise run a workflow as
 * whoever happens to be logged in.
 */
export function classifyNavigationIntent(headers: Request['headers']): N8nOAuth2NavigationIntent {
	if (firstHeaderValue(headers['sec-fetch-mode']) !== 'navigate') return 'unknown';

	// `none` = typed/bookmarked, `same-origin` = from n8n itself, `?1` = user activation.
	const site = firstHeaderValue(headers['sec-fetch-site']);
	if (site === 'none' || site === 'same-origin') return 'user-navigation';
	return firstHeaderValue(headers['sec-fetch-user']) === '?1' ? 'user-navigation' : 'unknown';
}

export type N8nBrowserOAuth2Outcome =
	/** Authenticated: the caller should establish the trigger identity and run the workflow. */
	| { status: 'ok'; token: string }
	/** The response has already been written (302 to the AS, 302 to the clean URL, or 403). */
	| 'handled'
	/** Not a browser navigation — the caller falls back to bearer-token auth. */
	| 'not-applicable';

function cookieOptions(req: Request, resourceUrl: string) {
	// Derive `secure` from the request scheme (honouring x-forwarded-proto) rather than
	// config, so the cookie is actually sent back on the follow-up GET over http in dev
	// while staying Secure over https.
	const forwardedProto = req.headers['x-forwarded-proto'];
	const proto = (typeof forwardedProto === 'string' ? forwardedProto.trim() : '') || req.protocol;
	return {
		httpOnly: true,
		sameSite: 'lax' as const, // must be Lax: sent on our own top-level 302 → GET
		secure: proto === 'https',
		path: new URL(resourceUrl).pathname, // scope the token to this webhook
	};
}

function readCookie(req: Request): string | null {
	const match = (req.headers.cookie ?? '').match(
		new RegExp(`(?:^|;\\s*)${BROWSER_OAUTH_COOKIE_NAME}=([^;]+)`),
	);
	return match ? decodeURIComponent(match[1].trim()) : null;
}

function isBrowserNavigation(req: Request): boolean {
	const accept = req.headers.accept ?? '';
	return req.method === 'GET' && accept.includes('text/html');
}

/**
 * Where to send the browser once it is authenticated: the URL it originally asked
 * for, minus the callback's own params. Path-relative so dynamic webhook paths
 * (`/webhook/<id>/user/42`) and the caller's own query survive the round trip.
 *
 * Server-side only — it is stashed against the flow `state` and never travels
 * through the browser, but it is still normalized to a single-slash path so it can
 * never become a protocol-relative (off-instance) redirect.
 */
function returnToUrl(req: Request): string {
	const [path, query] = req.originalUrl.split('?');
	const params = new URLSearchParams(query ?? '');
	for (const param of CALLBACK_PARAMS) params.delete(param);
	const search = params.toString();
	const safePath = `/${path.replace(/^\/+/, '')}`;
	return search ? `${safePath}?${search}` : safePath;
}

function redirect(res: Response, location: string): 'handled' {
	res.writeHead(302, { Location: location });
	res.end();
	return 'handled';
}

/**
 * Authenticates a *browser* hitting an `n8nOAuth2` webhook, with zero setup on the
 * caller's side: no client registration, no token handling, just a link someone can
 * click. Reuses the authorization server this instance already runs — the webhook is
 * its own protected resource, and its URL doubles as the virtual first-party
 * client_id and redirect_uri, so PKCE + `state` are generated server-side.
 *
 * Three shapes of GET reach this helper, and it tells them apart by query and cookie:
 *
 * 1. **Fresh GET** (no bearer token, `Accept: text/html`) → 302 to `/oauth/authorize`.
 * 2. **Callback** (`code` + `state`) → exchange server-to-server, stash the token in a
 *    one-hop cookie, 302 back to the URL originally asked for.
 * 3. **Clean GET** (cookie present) → validate, consume the cookie, run the workflow.
 *
 * Everything but the last step is just getting a human authenticated. Only a
 * redirect-driven GET can work this way: a redirect carries a URL and nothing else,
 * so a system POSTing a payload has no browser to bounce and must still present a
 * bearer token up front. Hence `'not-applicable'` for anything that isn't a browser
 * navigation — the caller falls back to the existing 401 + `WWW-Authenticate` path.
 */
export const n8nBrowserOAuth2Flow = async (
	context: IWebhookFunctions,
	resourceUrl: string,
): Promise<N8nBrowserOAuth2Outcome> => {
	const req = context.getRequestObject();
	const res = context.getResponseObject();

	const { code, state, error } = (req.query ?? {}) as Record<string, unknown>;
	const isCallback = typeof code === 'string' && typeof state === 'string';
	const cookieToken = readCookie(req);

	if (!isCallback && cookieToken === null && !isBrowserNavigation(req)) {
		return 'not-applicable';
	}

	if (typeof error === 'string') {
		// The user denied consent (or the AS refused). Restarting here would loop straight
		// back into the same denial, so stop and report.
		context.logger.warn('Webhook OAuth2 authorization was denied or failed', {
			error,
			error_description: req.query.error_description,
		});
		res.status(403).send('Access denied');
		res.end();
		return 'handled';
	}

	if (isCallback) {
		try {
			const result = await context.completeN8nOAuth2Flow(code, state);
			if (result.valid) {
				// Don't run the workflow on the callback URL itself: it still carries
				// `code`/`state`, which would land in the webhook's query data. Stash the
				// token in a one-hop cookie and bounce to the clean URL — the follow-up GET
				// picks the cookie up below.
				res.cookie(BROWSER_OAUTH_COOKIE_NAME, result.token, {
					...cookieOptions(req, resourceUrl),
					maxAge: 60_000, // one redirect hop; short by design
				});
				return redirect(res, result.metadata?.returnTo ?? returnToUrl(req));
			}
			context.logger.warn('Webhook OAuth2 flow failed, restarting', { reason: result.reason });
		} catch (error) {
			context.logger.warn('Webhook OAuth2 flow failed, restarting', { error });
		}
		// Fall through to restart the flow.
	} else if (cookieToken !== null) {
		res.clearCookie(BROWSER_OAUTH_COOKIE_NAME, cookieOptions(req, resourceUrl));
		const validation = await context.validateN8nOAuth2Token(cookieToken, resourceUrl);
		if (validation.valid) {
			return { status: 'ok', token: cookieToken };
		}
		// Stale/invalid cookie — fall through to restart the flow.
	}

	const authorizationUrl = await context.beginN8nOAuth2Flow(resourceUrl, {
		returnTo: returnToUrl(req),
		// Recorded server-side against this flow's `state`: the consent step needs to know
		// a human actually navigated here before it may skip re-prompting.
		[N8N_OAUTH2_INTENT_KEY]: classifyNavigationIntent(req.headers),
	});
	return redirect(res, authorizationUrl);
};
