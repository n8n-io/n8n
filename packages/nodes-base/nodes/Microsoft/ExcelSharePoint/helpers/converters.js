import { DEFAULT_GRAPH_BASE_URL } from './constants';
/** Normalizes Graph's inconsistent status-code fields (string, number, or absent) into a clean number. */
export function toHttpCode(raw) {
    if (raw === undefined || raw === null)
        return undefined;
    const code = Number(raw);
    return Number.isNaN(code) ? undefined : code;
}
/** Resolves the credential's Graph base URL, defaulting to the public cloud and trimming trailing slashes. */
export function toGraphBaseUrl(graphApiBaseUrl) {
    const base = typeof graphApiBaseUrl === 'string' && graphApiBaseUrl !== ''
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
export function unwrapGraphError(error) {
    const nested = error.error?.error ?? error.context?.data?.error;
    if (!nested)
        return error;
    return { ...nested, statusCode: error.statusCode };
}
/** Builds the `REQUIRED_PERMISSIONS` lookup key for a resource/operation pair. */
export function toPermissionKey(resource, operation) {
    return `${resource}:${operation}`;
}
/** Shapes the raw call args into Graph request options, resolving the base URL and merging in any extra headers. */
export function buildRequestOptions(params) {
    const baseUrl = toGraphBaseUrl(params.graphApiBaseUrl);
    const options = {
        headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'application/json',
        },
        method: params.method,
        body: params.body,
        qs: params.qs,
        // An explicit `uri` (e.g. a next-page link from Graph) is used verbatim
        url: params.uri ?? `${baseUrl}${params.resource}`,
        json: true,
    };
    if (Object.keys(params.headers).length !== 0) {
        options.headers = Object.assign({}, options.headers, params.headers);
    }
    return options;
}
//# sourceMappingURL=converters.js.map