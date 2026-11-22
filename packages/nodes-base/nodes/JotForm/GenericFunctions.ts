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

// Guard the custom domain before it reaches requestUrl's base-URL slot: a
// non-http scheme or userinfo (`host@attacker`) changes the request destination.
const SCHEME = /^([a-z][a-z0-9+.-]*):\/\//i;
const HOST = /^[A-Za-z0-9.-]+(?::\d{1,5})?$/;

/**
 * Resolve the configured domain. `apiDomain === 'custom'` is JotForm Enterprise,
 * where the user supplies the host. An empty custom domain resolves to `''` so
 * the caller rejects it instead of falling back to the public host.
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

/** Normalize free text into `host[/path]` without a protocol or trailing slash. */
function normalizeApiDomain(apiDomain: string): string {
	return apiDomain
		.trim()
		.replace(/^https?:\/\//i, '')
		.replace(/\/{2,}/g, '/')
		.replace(/\/+$/, '');
}

/**
 * Split into the requestUrl authority (host) and an optional path prefix.
 *
 * The `/API` of `subdomain.jotform.com/API` must stay in the path: the authority
 * slot rejects it with "Invalid host".
 */
function splitApiDomain(normalized: string): { host: string; basePath: string } {
	const slash = normalized.indexOf('/');
	if (slash === -1) {
		return { host: normalized, basePath: '' };
	}

	return {
		host: normalized.slice(0, slash),
		basePath: normalized.slice(slash),
	};
}

/** Strip userinfo, query, and fragment so an error never echoes a credential. */
function redactDomain(value: string): string {
	return value
		.replace(/\/\/[^/?#]*@/, '//')
		.replace(/^[^/?#]*@/, '')
		.replace(/[?#].*$/, '');
}

/**
 * Resolve the base URL for the node request path. The credential test mirrors this
 * in a declarative expression.
 */
export function getJotFormBaseUrl(
	credentials: { apiDomain?: unknown; customApiDomain?: unknown },
	node: INode,
): string {
	const raw = resolveApiDomain(credentials.apiDomain, credentials.customApiDomain).trim();

	// Reject a non-http scheme. The normalization below strips only `http(s)://`,
	// so it would otherwise rewrite `ftp://host/API` into a different host.
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

	// requestUrl's base-URL slot rejects these with a generic error; fail earlier.
	if (/[?#]/.test(domain)) {
		throw new NodeOperationError(
			node,
			`Invalid JotForm API domain "${redactDomain(domain)}". Do not include a query string or fragment.`,
		);
	}

	// Userinfo makes everything after "@" the request host, which would leak the key.
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
 * Ensure the resource is rooted. Callers always pass rooted paths; this guards a
 * future caller, because RequestPath does not enforce rootedness.
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

	// requestUrl's base-URL slot keeps the `/API` prefix in the path, not the authority.
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
