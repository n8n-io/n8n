import type { IDataObject, IHttpRequestMethods, RequestPath } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

import { DEFAULT_GRAPH_BASE_URL } from './constants';

export type GraphRequestError = {
	httpCode?: string | number | null;
	statusCode?: string | number | null;
	message?: string;
	code?: string;
	error?: { error?: GraphRequestError };
	// Once `httpRequestWithAuthentication` has already wrapped a failure in a
	// NodeApiError (the normal case for a real request), Graph's parsed body
	// lives here instead of under `error.error`.
	context?: { data?: { error?: GraphRequestError } };
};

/** Normalizes Graph's inconsistent status-code fields (string, number, or absent) into a clean number. */
export function toHttpCode(raw: string | number | null | undefined): number | undefined {
	if (raw === undefined || raw === null) return undefined;
	const code = Number(raw);
	return Number.isNaN(code) ? undefined : code;
}

/** Resolves the credential's Graph base URL, defaulting to the public cloud and trimming trailing slashes. */
export function toGraphBaseUrl(graphApiBaseUrl: unknown): string {
	const base =
		typeof graphApiBaseUrl === 'string' && graphApiBaseUrl !== ''
			? graphApiBaseUrl
			: DEFAULT_GRAPH_BASE_URL;
	return base.replace(/\/+$/, '');
}

/**
 * Graph nests its real error one level under `error.error` on a raw HTTP client error, or
 * under `context.data.error` once n8n has already wrapped the failure in a NodeApiError
 * (the case for every request that goes through `httpRequestWithAuthentication`). Unwraps
 * whichever is present while preserving the outer status code.
 */
export function unwrapGraphError(error: GraphRequestError): GraphRequestError {
	const nested = error.error?.error ?? error.context?.data?.error;
	if (!nested) return error;
	return { ...nested, statusCode: error.statusCode };
}

/** Builds the `REQUIRED_PERMISSIONS` lookup key for a resource/operation pair. */
export function toPermissionKey(resource: string, operation: string): string {
	return `${resource}:${operation}`;
}

export type RequestOptionsParams = {
	method: IHttpRequestMethods;
	resource: RequestPath;
	body: IDataObject;
	qs: IDataObject;
	uri?: string;
	headers: IDataObject;
	graphApiBaseUrl: unknown;
};

/** Shapes the raw call args into Graph request options, resolving the base URL and merging in any extra headers. */
export function buildRequestOptions(params: RequestOptionsParams) {
	const baseUrl = toGraphBaseUrl(params.graphApiBaseUrl);
	const headers: IDataObject = {
		'Content-Type': 'application/json',
	};
	const options = {
		headers,
		method: params.method,
		body: params.body,
		qs: params.qs,
		// An explicit `uri` (e.g. a next-page link from Graph) is used verbatim
		...(params.uri ? { url: params.uri } : { url: requestUrl`${baseUrl}${params.resource}` }),
		json: true,
	};
	if (Object.keys(params.headers).length !== 0) {
		options.headers = Object.assign({}, options.headers, params.headers);
	}
	return options;
}
