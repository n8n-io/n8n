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
 * `path` must be where the browser will *read* the cookie: a dynamic webhook's
 * `redirect_uri` is the templated path (`/webhook/<id>/user/:id`), but the hop that
 * consumes the cookie sits on the resolved one (`/webhook/<id>/user/42`).
 */
function cookieOptions(req: Request, path: string) {
	// `secure` follows the request scheme (honouring x-forwarded-proto), so the cookie
	// still comes back over plain http in dev.
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
 * Drops the one-hop cookie from the request so its token never reaches the workflow's
 * `headers` data; unrelated cookies stay. The cli sanitizer runs before the node and
 * must leave it in place for the flow to read.
 */
function stripCookie(req: Request): void {
	const rest = (req.headers.cookie ?? '')
		.split(';')
		.map((cookie) => cookie.trim())
		.filter((cookie) => cookie && !cookie.startsWith(`${BROWSER_OAUTH_COOKIE_NAME}=`));
	if (rest.length) req.headers.cookie = rest.join('; ');
	else delete req.headers.cookie;
}

/**
 * True only for a *top-level* browser navigation. `Sec-Fetch-Mode: navigate` alone is
 * not enough: a hidden `<iframe>` on someone else's page reports it too and could ride
 * the victim's session through `/oauth/authorize` without a click, so `Sec-Fetch-Dest`
 * must be `document` (or absent, for the Accept fallback). `force` skips the check for
 * the "always redirect" node setting; the caller has already ruled out non-GETs.
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
 * Where to send the browser once authenticated: the URL it asked for, minus the
 * callback's own params. Stashed server-side against `state`, yet still normalized to
 * a single-slash path so it can never become a protocol-relative redirect.
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
 * Authenticates a *browser* hitting an `n8nOAuth2` webhook with no client setup: the
 * webhook URL doubles as virtual first-party client_id and redirect_uri against this
 * instance's own AS, with PKCE and `state` generated server-side. Three GET shapes:
 *
 * 1. **Fresh GET** (browser navigation) → 302 to `/oauth/authorize`.
 * 2. **Callback** (`code` + `state`) → exchange server-to-server, stash the token in a
 *    one-hop cookie, 302 back to the URL originally asked for.
 * 3. **Clean GET** (cookie present) → validate, consume the cookie, run the workflow.
 *
 * Anything that isn't a browser navigation on a GET is `'not-applicable'` and the
 * caller falls back to the 401 + `WWW-Authenticate` path. `force` (the node's
 * "Browser (Virtual Client)" setting) skips the navigation heuristic, never the GET rule.
 */
export const n8nBrowserOAuth2Flow = async (
	context: IWebhookFunctions,
	resourceUrl: string,
	force = false,
): Promise<N8nBrowserOAuth2Outcome> => {
	const req = context.getRequestObject();
	const res = context.getResponseObject();

	// The whole flow is GET-only and navigation-only, callback and cookie hops included:
	// a redirect can't carry a POST body, and a same-origin fetch() still sends the
	// Lax cookie, so neither may spend it.
	if (req.method !== 'GET' || !isBrowserNavigation(req, force)) {
		return 'not-applicable';
	}

	const { code, state, error } = (req.query ?? {}) as Record<string, unknown>;
	const isCallback = typeof code === 'string' && typeof state === 'string';
	const cookieToken = readCookie(req);

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
				// Not on the callback URL itself: `code`/`state` would land in the webhook's
				// query data. One-hop cookie, then bounce to the clean URL.
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
		stripCookie(req);
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
