import { recordConsumedAuth } from './auth-redaction';
import { UnexpectedError } from './errors';
import type { IUser, IWebhookFunctions } from './interfaces';
import { n8nBrowserOAuth2Flow } from './n8n-browser-oauth2-flow';

/**
 * How a tokenless request is handled:
 * - `auto`: redirect a browser navigation, 401 everything else.
 * - `browser`: always redirect a GET, skipping the navigation heuristic.
 * - `bearer`: never redirect, always 401 — the resource is also not first-party
 *   (see the webhook resolvers), so the AS refuses its URL as a virtual client too.
 *
 * An unset value resolves to `auto` or `bearer` depending on node version — see
 * {@link resolveOAuthClientMode}.
 */
export type N8nOAuth2BrowserFlowMode = 'auto' | 'browser' | 'bearer';

/**
 * The Webhook node's `typeVersion` at which an unset `oauthClient` starts
 * defaulting to `'auto'` instead of `'bearer'`. Below this version the option
 * didn't exist yet, so a workflow saved before it did must keep its original,
 * narrower (bearer-only, non-first-party) behavior on upgrade; only a node
 * created — or explicitly re-saved — at this version or newer opts in
 * automatically.
 */
export const WEBHOOK_OAUTH_CLIENT_DEFAULT_VERSION = 2.2;

/**
 * Resolves the effective `oauthClient` mode: an explicit value always wins; an
 * unset one defaults to `'auto'` for nodes at or above
 * `WEBHOOK_OAUTH_CLIENT_DEFAULT_VERSION` and to `'bearer'` below it. Shared by the
 * Webhook node (the runtime redirect decision) and its protected-resource
 * resolvers (the static `isFirstParty` grant) so the two can't diverge.
 */
export function resolveOAuthClientMode(
	oauthClient: N8nOAuth2BrowserFlowMode | undefined,
	typeVersion: number,
): N8nOAuth2BrowserFlowMode {
	return oauthClient ?? (typeVersion >= WEBHOOK_OAUTH_CLIENT_DEFAULT_VERSION ? 'auto' : 'bearer');
}

function trimTrailingSlash(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
}

function getBearerToken(headerValue: string | undefined): string | null {
	if (!headerValue) return null;
	const split = headerValue.split(' ');
	if (split.length !== 2 || split[0].toLowerCase() !== 'bearer') {
		return null;
	}
	return split[1];
}

function sendUnauthorizedResponse(
	resp: ReturnType<IWebhookFunctions['getResponseObject']>,
	code: number,
	prmUrl: string,
	realm: string,
	error?: string,
) {
	const authenticateHeader =
		`Bearer realm="${realm}", resource_metadata="${prmUrl}"` + (error ? `, error="${error}"` : '');
	resp.writeHead(code, {
		'WWW-Authenticate': authenticateHeader,
	});
	resp.end();
}

/**
 * Validates a webhook caller's OAuth2 bearer token and resolves it to an n8n user —
 * the first step of the "identity" webhook auth flow shared by the Webhook node
 * and the MCP trigger — both expose it as the `n8nOAuth2` authentication mode.
 *
 * On success returns the validated `token` and `resource` URL, which the caller
 * passes to `context.establishTriggerIdentity` to run the workflow as that user,
 * plus the resolved `user` for triggers that surface the caller in their output.
 * When the token is missing or invalid the response is written here (401/403/503,
 * advertising the OAuth protected-resource metadata URL in `WWW-Authenticate`) and
 * `'handled'` is returned, so the request never reaches workflow execution.
 *
 * The only per-node difference is the `realm` shown in the `WWW-Authenticate`
 * header (e.g. `n8n Webhook` vs `n8n MCP Server`); everything else — token
 * parsing, protected-resource-metadata URL, error-code mapping — is identical and
 * kept here so the two auth modes can't drift.
 *
 * With `browserFlow` set to anything but `'bearer'`, a tokenless request that
 * looks like a browser navigation is redirected through this instance's own
 * authorization server instead of being 401'd (see {@link n8nBrowserOAuth2Flow}).
 * Machine callers are unaffected: anything that isn't a browser navigation still
 * gets the 401.
 */
export const n8nOAuth2Auth = async (
	context: IWebhookFunctions,
	options: { realm: string; method?: string; browserFlow?: N8nOAuth2BrowserFlowMode },
): Promise<
	| {
			status: 'ok';
			token: string;
			resource: string;
			user: IUser;
	  }
	| 'handled'
> => {
	const webhookUrl = context.getWebhookResourceUrl('default');
	if (!webhookUrl) {
		throw new UnexpectedError('Webhook URL is not available');
	}

	// One webhook path can host several disjoint-method triggers, so the method being
	// served selects which one a resource URL names. It has to be carried on both the
	// token audience (`resourceUrl`) and the metadata URL advertised in
	// `WWW-Authenticate` (`prmUrl`), keeping mint and verify consistent. Omitted for
	// MCP, which is always POST and needs no selector.
	const resourceUrl =
		trimTrailingSlash(webhookUrl) +
		(options.method ? `?method=${options.method.toUpperCase()}` : '');

	const u = new URL(resourceUrl);
	const prmUrl = `${u.origin}/.well-known/oauth-protected-resource${u.pathname}${u.search}`;

	const resp = context.getResponseObject();
	const req = context.getRequestObject();

	const token = getBearerToken(req.headers.authorization);
	if (!token) {
		if (options.browserFlow && options.browserFlow !== 'bearer') {
			const outcome = await n8nBrowserOAuth2Flow(
				context,
				resourceUrl,
				options.browserFlow === 'browser',
			);
			if (outcome === 'handled') return 'handled';
			if (outcome !== 'not-applicable') {
				recordConsumedAuth(req, ['cookie']);
				return { status: 'ok', token: outcome.token, resource: resourceUrl, user: outcome.user };
			}
		}
		sendUnauthorizedResponse(resp, 401, prmUrl, options.realm);
		return 'handled';
	}

	const validationResult = await context.validateN8nOAuth2Token(token, resourceUrl);
	if (!validationResult.valid) {
		if (validationResult.reason === 'invalid_token') {
			sendUnauthorizedResponse(resp, 401, prmUrl, options.realm, 'invalid_token');
		} else if (validationResult.reason === 'insufficient_scope') {
			sendUnauthorizedResponse(resp, 403, prmUrl, options.realm, 'insufficient_scope');
		} else {
			resp.status(503).send('OAuth token validation is not available');
		}
		return 'handled';
	}

	recordConsumedAuth(req, ['authorization']);

	return {
		status: 'ok',
		token,
		resource: resourceUrl,
		user: validationResult.user,
	};
};
