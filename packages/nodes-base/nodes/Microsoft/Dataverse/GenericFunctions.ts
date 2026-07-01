// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, sleep } from 'n8n-workflow';
import { DATAVERSE_API_PATH, USER_AGENT } from './constants';

/** Headers we send to Dataverse must be string-valued. */
export type DataverseHeaders = Record<string, string>;
/** Query-string parameters Dataverse accepts. Numbers cover `$top`. */
export type DataverseQuery = Record<string, string | number>;

/**
 * Static OData v4 headers attached to every Dataverse request unless the
 * caller overrides them. Pulled into a constant so the headers stay in sync
 * between single-shot and paged requests.
 */
const ODATA_DEFAULT_HEADERS: DataverseHeaders = {
	Accept: 'application/json',
	'OData-MaxVersion': '4.0',
	'OData-Version': '4.0',
	'User-Agent': USER_AGENT,
};

const CONTENT_TYPE_JSON = 'application/json; charset=utf-8';

/**
 * Per-request HTTP timeout (milliseconds). Dataverse occasionally takes 30+
 * seconds for large list / metadata queries; a generous one-minute cap keeps
 * a hung request from blocking an n8n executor indefinitely while still
 * allowing legitimately slow operations to complete.
 */
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * HTTP status codes we treat as transient and retry. 429 covers Dataverse
 * per-app throttling; 503/504 cover transient service/gateway failures.
 */
const RETRYABLE_STATUS_CODES: ReadonlySet<number> = new Set([429, 503, 504]);

/**
 * Socket-level error codes we treat as transient and retry. These arrive with
 * no `statusCode` (the request never got an HTTP response), so without this set
 * they would bypass the back-off logic and fail on the first attempt. Covers
 * the connection drops / DNS / timeout failures that internet-facing Dataverse
 * calls hit most often. A bare "socket hang up" (no `code`) is handled
 * separately in {@link getNetworkErrorCode}.
 */
const RETRYABLE_NETWORK_CODES: ReadonlySet<string> = new Set([
	'ECONNRESET',
	'ETIMEDOUT',
	'ECONNREFUSED',
	'EPIPE',
	'EAI_AGAIN',
	'ENOTFOUND',
	'ENETUNREACH',
	'EHOSTUNREACH',
	'EHOSTDOWN',
]);

/**
 * Retry policy: up to `MAX_RETRIES` extra attempts (so 1 + 3 = 4 total
 * dispatches in the worst case). Back-off is exponential starting from
 * `BASE_DELAY_MS` with full jitter, capped at `MAX_DELAY_MS`. The upstream
 * `Retry-After` header (seconds or HTTP-date) overrides the computed delay.
 */
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 30_000;

interface TransientErrorShape {
	statusCode?: number;
	httpCode?: number | string;
	code?: string;
	message?: string;
	cause?: { code?: string };
	response?: { headers?: Record<string, string | string[] | undefined> };
}

function getStatusCode(error: unknown): number | undefined {
	const e = error as TransientErrorShape | null | undefined;
	const raw = e?.statusCode ?? e?.httpCode;
	if (typeof raw === 'number') return raw;
	if (typeof raw === 'string') {
		const n = Number(raw);
		return Number.isFinite(n) ? n : undefined;
	}
	return undefined;
}

/**
 * Extract a transient network error code from an error. Reads `error.code`
 * directly, falls back to `error.cause.code` (undici / got wrap the socket
 * error under `cause`), and recognizes the classic message-only "socket hang
 * up" failure that arrives without a `code`. Normalized to upper-case.
 */
function getNetworkErrorCode(error: unknown): string | undefined {
	const e = error as TransientErrorShape | null | undefined;
	const code = e?.code ?? e?.cause?.code;
	if (typeof code === 'string' && code) return code.toUpperCase();
	if (typeof e?.message === 'string' && /socket hang up/i.test(e.message)) return 'ECONNRESET';
	return undefined;
}

/**
 * Whether a failed request should be retried. True when the HTTP status is a
 * known-transient code (429 / 503 / 504) OR the error is a transient socket /
 * DNS failure with no HTTP response at all.
 */
function isRetryable(error: unknown): boolean {
	const status = getStatusCode(error);
	if (status !== undefined && RETRYABLE_STATUS_CODES.has(status)) return true;
	const networkCode = getNetworkErrorCode(error);
	return networkCode !== undefined && RETRYABLE_NETWORK_CODES.has(networkCode);
}

function parseRetryAfter(error: unknown): number | undefined {
	const headers = (error as TransientErrorShape | null | undefined)?.response?.headers;
	if (!headers) return undefined;
	const raw = headers['retry-after'] ?? headers['Retry-After'];
	if (!raw) return undefined;
	const value = Array.isArray(raw) ? raw[0] : raw;
	if (value === undefined) return undefined;
	const seconds = Number(value);
	if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
	const dateMs = Date.parse(String(value));
	if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
	return undefined;
}

function backoffDelay(attempt: number): number {
	const exponential = BASE_DELAY_MS * 2 ** attempt;
	const jitter = Math.floor(Math.random() * BASE_DELAY_MS);
	return Math.min(MAX_DELAY_MS, exponential + jitter);
}

/**
 * Dispatch a request via `helpers.requestWithAuthentication`, retrying on
 * transient failures — HTTP 429 / 503 / 504 and socket-level network errors
 * (`ECONNRESET`, `ETIMEDOUT`, DNS failures, socket hang-ups). Non-transient
 * failures are re-thrown immediately so the caller can wrap them in
 * `NodeApiError` without an extra delay.
 */
async function dispatchWithRetry(
	ctx: IExecuteFunctions,
	credentialType: string,
	options: IHttpRequestOptions,
): Promise<unknown> {
	let lastError: unknown;
	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			return await ctx.helpers.requestWithAuthentication.call(ctx, credentialType, options);
		} catch (error) {
			lastError = error;
			if (!isRetryable(error) || attempt === MAX_RETRIES) {
				// Caller (`dataverseApiRequest` / `dataverseApiRequestAllItems`)
				// wraps the upstream failure in `NodeApiError`. Wrapping here
				// would double-wrap and lose the original Dataverse metadata.
				throw error;
			}
			const retryAfter = parseRetryAfter(error);
			await sleep(retryAfter ?? backoffDelay(attempt));
		}
	}
	// Unreachable — the loop either returns or throws — but the type checker
	// can't see that, so re-throw the last observed failure as a safety net.
	throw lastError as Error;
}

/**
 * Resolve the Dataverse environment base URL from the n8n-stored credential,
 * stripping a trailing slash so `${baseUrl}${DATAVERSE_API_PATH}…` always has
 * exactly one slash between segments.
 */
async function resolveBaseUrl(ctx: IExecuteFunctions, credentialType: string): Promise<string> {
	const credentials = await ctx.getCredentials(credentialType);
	return String(credentials.environmentUrl).replace(/\/$/, '');
}

/**
 * Make an authenticated request against the Dataverse Web API.
 *
 * Auth (OAuth2 token acquisition and the Bearer header) is handled by the
 * `microsoftDataverseOAuth2Api` credential, so this helper only builds the
 * request and delegates to `requestWithAuthentication` (via `dispatchWithRetry`,
 * which adds transient-failure retries with exponential back-off + jitter).
 *
 * The caller MUST pass the credential type explicitly so a future refactor
 * cannot accidentally fall back to a stale literal that does not match any
 * registered credential.
 */
export async function dataverseApiRequest(
	ctx: IExecuteFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: DataverseQuery = {},
	headers: DataverseHeaders = {},
	credentialType: string,
): Promise<IDataObject> {
	const baseUrl = await resolveBaseUrl(ctx, credentialType);

	const options: IHttpRequestOptions = {
		method,
		body,
		qs,
		url: `${baseUrl}${DATAVERSE_API_PATH}${resource}`,
		headers: {
			...ODATA_DEFAULT_HEADERS,
			'Content-Type': CONTENT_TYPE_JSON,
			...headers,
		},
		json: true,
		timeout: REQUEST_TIMEOUT_MS,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		return (await dispatchWithRetry(ctx, credentialType, options)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(ctx.getNode(), error as JsonObject);
	}
}

/**
 * Fetch all pages of a Dataverse collection, following ``@odata.nextLink``.
 *
 * Caller-supplied `Prefer` is merged comma-separated with the paging hint
 * `odata.maxpagesize=100` so the page-size cap is never accidentally dropped.
 * All other headers are forwarded as-is. Each page dispatch uses the same
 * retry-with-back-off policy as single-shot requests.
 */
export async function dataverseApiRequestAllItems(
	ctx: IExecuteFunctions,
	method: IHttpRequestMethods,
	resource: string,
	qs: DataverseQuery = {},
	limit = 0,
	credentialType: string,
	extraHeaders: DataverseHeaders = {},
): Promise<IDataObject[]> {
	const baseUrl = await resolveBaseUrl(ctx, credentialType);

	const PAGE_SIZE_PREFER = 'odata.maxpagesize=100';
	const callerPrefer = extraHeaders.Prefer ?? '';
	const mergedPrefer = callerPrefer ? `${callerPrefer},${PAGE_SIZE_PREFER}` : PAGE_SIZE_PREFER;
	const headers: DataverseHeaders = {
		...ODATA_DEFAULT_HEADERS,
		...extraHeaders,
		Prefer: mergedPrefer,
	};

	const results: IDataObject[] = [];
	let url = `${baseUrl}${DATAVERSE_API_PATH}${resource}`;
	let useQs: DataverseQuery | undefined = qs;

	do {
		const options: IHttpRequestOptions = {
			method,
			url,
			qs: useQs,
			headers,
			json: true,
			timeout: REQUEST_TIMEOUT_MS,
		};

		let response: IDataObject;
		try {
			response = (await dispatchWithRetry(ctx, credentialType, options)) as IDataObject;
		} catch (error) {
			throw new NodeApiError(ctx.getNode(), error as JsonObject);
		}

		const page = (response.value as IDataObject[]) ?? [];
		for (const item of page) {
			results.push(item);
			if (limit > 0 && results.length >= limit) {
				return results;
			}
		}

		url = (response['@odata.nextLink'] as string) ?? '';
		// nextLink already encodes the query string, so don't resend qs.
		useQs = undefined;
	} while (url);

	return results;
}
