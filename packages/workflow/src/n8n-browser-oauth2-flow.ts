import type { IUser, IWebhookFunctions } from './interfaces';

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

export type N8nBrowserOAuth2Outcome =
	/** Authenticated: the caller should establish the trigger identity and run the workflow. */
	| { status: 'ok'; token: string; user: IUser }
	/** The response has already been written (302 to the AS, 302 to the clean URL, or 403). */
	| 'handled'
	/** Not a browser navigation — the caller falls back to bearer-token auth. */
	| 'not-applicable';

/** The path part of a same-origin URL, normalized to a single leading slash. */
function pathOf(url: string): string {
	const path = url.split('?')[0];
	return `/${path.replace(/^\/+/, '')}`;
}

/**
 * `path` must be where the browser will *read* the cookie, which is not always where
 * it is set: a dynamic webhook's resource URL — and therefore its `redirect_uri` —
 * is the templated path (`/webhook/<id>/user/:id`), so the callback hop lands on that
 * literal path while the hop that consumes the cookie sits on the resolved one
 * (`/webhook/<id>/user/42`). Scoping to the redirect target is what makes it
 * round-trip; scoping to either request's own path does not.
 */
function cookieOptions(req: Request, path: string) {
	// Derive `secure` from the request scheme (honouring x-forwarded-proto) rather than
	// config, so the cookie is actually sent back on the follow-up GET over http in dev
	// while staying Secure over https.
	const forwardedProto = req.headers['x-forwarded-proto'];
	const proto = (typeof forwardedProto === 'string' ? forwardedProto.trim() : '') || req.protocol;
	return {
		httpOnly: true,
		sameSite: 'lax' as const, // must be Lax: sent on our own top-level 302 → GET
		secure: proto === 'https',
		path,
	};
}

/** A cookie value that isn't valid percent-encoding is treated as no cookie at all. */
function readCookie(req: Request): string | null {
	const match = (req.headers.cookie ?? '').match(
		new RegExp(`(?:^|;\\s*)${BROWSER_OAUTH_COOKIE_NAME}=([^;]+)`),
	);
	if (!match) return null;
	try {
		return decodeURIComponent(match[1].trim());
	} catch {
		return null;
	}
}

/**
 * True for a request that only a *top-level* browser navigation can produce —
 * the address bar changing, not a page embedding the URL in a frame. `Sec-Fetch-Mode:
 * navigate` alone doesn't distinguish those: an `<iframe src="...">` on someone
 * else's page reports `navigate` too, so a hidden iframe could otherwise ride the
 * victim's own session into a silent, no-click redirect through `/oauth/authorize`.
 * `Sec-Fetch-Dest` closes that: only `document` (or its absence, for the
 * Fetch-Metadata-less fallback below) is a real top-level load; `iframe`/`frame` is
 * rejected outright before the `Sec-Fetch-Mode`/`Accept` checks even run.
 *
 * `force` skips this check entirely for the "always redirect" node setting. Callers
 * must check the request method separately: this function assumes it is already GET.
 */
function isBrowserNavigation(req: Request, force: boolean): boolean {
	if (force) return true;
	const dest = req.headers['sec-fetch-dest'];
	if (typeof dest === 'string' && dest !== 'document') return false;
	const mode = req.headers['sec-fetch-mode'];
	if (typeof mode === 'string') return mode === 'navigate';
	return (req.headers.accept ?? '').includes('text/html');
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
	const [, query] = req.originalUrl.split('?');
	const params = new URLSearchParams(query ?? '');
	for (const param of CALLBACK_PARAMS) params.delete(param);
	const search = params.toString();
	const safePath = pathOf(req.originalUrl);
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
 * 1. **Fresh GET** (no bearer token, browser navigation) → 302 to `/oauth/authorize`.
 * 2. **Callback** (`code` + `state`) → exchange server-to-server, stash the token in a
 *    one-hop cookie, 302 back to the URL originally asked for.
 * 3. **Clean GET** (cookie present) → validate, consume the cookie, run the workflow.
 *
 * Everything but the last step is just getting a human authenticated. Only a
 * redirect-driven GET can work this way: a redirect carries a URL and nothing else,
 * so a system POSTing a payload has no browser to bounce and must still present a
 * bearer token up front. Hence `'not-applicable'` for anything that isn't a browser
 * navigation — the caller falls back to the existing 401 + `WWW-Authenticate` path.
 *
 * `force` mirrors the Webhook node's "Browser (Virtual Client)" setting: skip the
 * navigation heuristic on a GET and always run the flow, for callers who know their
 * traffic is browser-driven even without Fetch Metadata or an HTML `Accept`.
 */
export const n8nBrowserOAuth2Flow = async (
	context: IWebhookFunctions,
	resourceUrl: string,
	force = false,
): Promise<N8nBrowserOAuth2Outcome> => {
	const req = context.getRequestObject();
	const res = context.getResponseObject();

	// GET-only for the whole flow, not just the navigation heuristic below: a redirect
	// carries a URL and nothing else, so nothing here — the AS callback, the one-hop
	// cookie — can legitimately arrive on another method. Checked first so a POST
	// carrying a stray cookie or spoofed `code`/`state` can't reach either branch.
	if (req.method !== 'GET') {
		return 'not-applicable';
	}

	const { code, state, error } = (req.query ?? {}) as Record<string, unknown>;
	const isCallback = typeof code === 'string' && typeof state === 'string';
	const cookieToken = readCookie(req);

	if (!isCallback && cookieToken === null && !isBrowserNavigation(req, force)) {
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
				const location = result.metadata?.returnTo ?? returnToUrl(req);
				res.cookie(BROWSER_OAUTH_COOKIE_NAME, result.token, {
					...cookieOptions(req, pathOf(location)),
					maxAge: 60_000, // one redirect hop; short by design
				});
				return redirect(res, location);
			}
			context.logger.warn('Webhook OAuth2 flow failed, restarting', { reason: result.reason });
		} catch (error) {
			context.logger.warn('Webhook OAuth2 flow failed, restarting', { error });
		}
		// Fall through to restart the flow.
	} else if (cookieToken !== null) {
		// Cleared at the path it was set for: this request *is* the redirect target.
		res.clearCookie(BROWSER_OAUTH_COOKIE_NAME, cookieOptions(req, pathOf(req.originalUrl)));
		const validation = await context.validateN8nOAuth2Token(cookieToken, resourceUrl);
		if (validation.valid) {
			return { status: 'ok', token: cookieToken, user: validation.user };
		}
		// Stale/invalid cookie — fall through to restart the flow.
	}

	const authorizationUrl = await context.beginN8nOAuth2Flow(resourceUrl, {
		returnTo: returnToUrl(req),
	});
	return redirect(res, authorizationUrl);
};
