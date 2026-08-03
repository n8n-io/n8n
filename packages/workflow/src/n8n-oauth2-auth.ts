import { UnexpectedError } from './errors';
import type { IWebhookFunctions } from './interfaces';

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
 * passes to `context.establishTriggerIdentity` to run the workflow as that user.
 * When the token is missing or invalid the response is written here (401/403/503,
 * advertising the OAuth protected-resource metadata URL in `WWW-Authenticate`) and
 * `'handled'` is returned, so the request never reaches workflow execution.
 *
 * The only per-node difference is the `realm` shown in the `WWW-Authenticate`
 * header (e.g. `n8n Webhook` vs `n8n MCP Server`); everything else — token
 * parsing, protected-resource-metadata URL, error-code mapping — is identical and
 * kept here so the two auth modes can't drift.
 */
export const n8nOAuth2Auth = async (
	context: IWebhookFunctions,
	options: { realm: string; method?: string },
): Promise<
	| {
			status: 'ok';
			token: string;
			resource: string;
	  }
	| 'handled'
> => {
	const webhookUrl = context.getNodeWebhookUrl('default');
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

	return {
		status: 'ok',
		token,
		resource: resourceUrl,
	};
};
