import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INode,
	IRequestOptions,
	IWebhookFunctions,
	JsonObject,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, requestPath, requestUrl } from 'n8n-workflow';

const DEFAULT_API_DOMAIN = 'api.jotform.com';

// A custom domain is `host[:port]` with an optional `/path` prefix. These guard
// the value before it reaches requestUrl's base-URL slot: a non-http scheme or
// userinfo (`host@attacker`) would otherwise change the request destination.
const SCHEME = /^([a-z][a-z0-9+.-]*):\/\//i;
const HOST = /^[A-Za-z0-9.-]+(?::\d{1,5})?$/;

/**
 * Resolve the effective API domain from the credential.
 *
 * `apiDomain === 'custom'` is JotForm Enterprise, where the user supplies the
 * full host and optional `/API` path. An empty custom domain resolves to `''`
 * so the caller can reject it -- silently falling back to the public host would
 * send the API key to the wrong instance.
 */
function resolveApiDomain(apiDomain: unknown, customApiDomain: unknown): string {
	if (apiDomain === 'custom') {
		return typeof customApiDomain === 'string' ? customApiDomain : '';
	}
	if (typeof apiDomain === 'string' && apiDomain.trim() !== '') {
		return apiDomain;
	}
	return DEFAULT_API_DOMAIN;
}

/**
 * Turn a configured domain into `host[/path]` without a protocol or trailing
 * slash, e.g. `eu-api.jotform.com` or `subdomain.jotform.com/API`.
 *
 * The custom field is free text, so tolerate a pasted `http(s)://` and repeated
 * or trailing slashes.
 */
function normalizeApiDomain(apiDomain: string): string {
	return apiDomain
		.trim()
		.replace(/^https?:\/\//i, '')
		.replace(/\/{2,}/g, '/')
		.replace(/\/+$/, '');
}

/**
 * Split a normalized domain into the requestUrl authority (the host) and an
 * optional path prefix.
 *
 * JotForm Enterprise uses `subdomain.jotform.com/API`. The `/API` part must stay
 * in the path: in the authority slot requestUrl rejects it with "Invalid host".
 */
function splitApiDomain(normalized: string): { host: string; basePath: string } {
	const slash = normalized.indexOf('/');
	if (slash === -1) {
		return { host: normalized, basePath: '' };
	}

	return {
		host: normalized.slice(0, slash),
		basePath: normalized.slice(slash), // keeps its leading '/'
	};
}

/**
 * Strip userinfo and any query or fragment from a domain before it goes into an
 * error message, so an embedded credential is never echoed back to the user or
 * to the logs.
 */
function redactDomain(value: string): string {
	return value
		.replace(/\/\/[^/?#]*@/, '//')
		.replace(/^[^/?#]*@/, '')
		.replace(/[?#].*$/, '');
}

/**
 * Resolve the effective base URL, e.g. `https://api.jotform.com` or
 * `https://subdomain.jotform.com/API`.
 *
 * This is the single source of truth for the domain selection, normalization
 * and validation in the node request path. The credential test builds its base
 * URL with a declarative expression that mirrors this normalization.
 */
export function getJotFormBaseUrl(
	credentials: { apiDomain?: unknown; customApiDomain?: unknown },
	node: INode,
): string {
	const raw = resolveApiDomain(credentials.apiDomain, credentials.customApiDomain).trim();

	// Only http(s) is supported. A pasted `ftp://host/API` must fail here: the
	// normalization below strips only `http(s)://`, so it would otherwise rewrite
	// the value into a different host.
	const scheme = SCHEME.exec(raw)?.[1];
	if (scheme && !/^https?$/i.test(scheme)) {
		throw new NodeOperationError(
			node,
			`Invalid JotForm API domain "${redactDomain(raw)}". Use an http:// or https:// URL, or a bare host such as "your-subdomain.jotform.com/API".`,
		);
	}

	const domain = normalizeApiDomain(raw);

	if (domain === '') {
		throw new NodeOperationError(
			node,
			'JotForm Enterprise requires a custom API domain. Select "Custom" and enter your domain, for example "your-subdomain.jotform.com/API".',
		);
	}

	// A query string or fragment here would reach requestUrl's base-URL slot and
	// surface as a generic UserError. Reject it up front with a clear message.
	if (/[?#]/.test(domain)) {
		throw new NodeOperationError(
			node,
			`Invalid JotForm API domain "${redactDomain(domain)}". Do not include a query string or fragment.`,
		);
	}

	// Userinfo (`host@attacker`) makes everything after "@" the request host, so
	// the APIKEY header would go to that host. Reject it.
	if (domain.includes('@')) {
		throw new NodeOperationError(
			node,
			`Invalid JotForm API domain "${redactDomain(domain)}". Do not include credentials in the domain.`,
		);
	}

	const { host, basePath } = splitApiDomain(domain);

	if (!HOST.test(host)) {
		throw new NodeOperationError(
			node,
			`Invalid JotForm API domain "${redactDomain(domain)}". Enter a host such as "your-subdomain.jotform.com/API".`,
		);
	}

	return `https://${host}${basePath}`;
}

/**
 * Ensure the resource is a rooted request path.
 *
 * Defensive: production callers always pass rooted paths (requestPath`/...`).
 * RequestPath's type does not enforce rootedness, and a future caller should not
 * silently build a malformed URL. The non-rooted test row covers this branch.
 */
function toRootedResourcePath(resource: RequestPath): RequestPath {
	return resource.value.startsWith('/') ? resource : requestPath`/${resource}`;
}

export async function jotformApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,
	body: any = {},
	qs: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('jotFormApi');
	const node = this.getNode();

	// `requestUrl`'s leading hole is its base-URL slot: it parses the value into
	// protocol + host + path and rejects anything malformed. That keeps the `/API`
	// prefix in the path, where it belongs, instead of in the authority, where it
	// would trigger "Invalid host".
	const baseUrl = getJotFormBaseUrl(credentials, node);

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			APIKEY: credentials.apiKey,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method,
		qs,
		form: body,
		uri: requestUrl`${baseUrl}${toRootedResourcePath(resource)}`,
		json: true,
	};

	if (!Object.keys(body as IDataObject).length) {
		delete options.form;
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
