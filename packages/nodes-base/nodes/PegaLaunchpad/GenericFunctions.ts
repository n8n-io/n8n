import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IRequestOptions,
	IDataObject,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Normalizes an ETag value for use in an If-Match header.
 *
 * Pega DX API returns weak ETags in the format `w/"2"` (lowercase prefix).
 * The Pega API also expects the If-Match header to use the same lowercase
 * `w/` prefix. Uppercase `W/` (per RFC 7232) is NOT accepted by Pega.
 *
 * This function trims surrounding whitespace and normalises an uppercase
 * `W/` prefix to the Pega-expected lowercase `w/`.
 *
 * Examples:
 *   w/"2"     → w/"2"     (already lowercase, Pega-native format)
 *   W/"3"     → w/"3"     (uppercase → lowercase for Pega compatibility)
 *   w/"123"   → w/"123"   (multi-digit, already lowercase)
 *   W/"123"   → w/"123"   (multi-digit uppercase → lowercase)
 */
export function normalizeETagForIfMatch(etag: string): string {
	const trimmed = etag.trim();
	// Normalise uppercase weak-ETag prefix to lowercase for Pega compatibility
	if (trimmed.startsWith('W/')) {
		return `w/${trimmed.slice(2)}`;
	}
	return trimmed;
}

export interface IPegaApiResponse {
	body: IDataObject;
	headers: IDataObject;
}

export async function pegaLaunchpadApiRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	option: IDataObject = {},
): Promise<IPegaApiResponse> {
	try {
		const baseUrl = this.getNodeParameter('baseUrl', 0) as string;

		if (!baseUrl) {
			throw new Error('Base URL is required');
		}

		const cleanBaseUrl = baseUrl.replace(/\/$/, '');
		const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
		const url = `${cleanBaseUrl}${cleanEndpoint}`;

		const options: IRequestOptions = {
			method,
			url,
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			json: true,
			resolveWithFullResponse: true,
		};

		if (Object.keys(body).length) {
			options.body = body;
		}

		if (Object.keys(qs).length) {
			options.qs = qs;
		}

		// Deep-merge headers so that custom headers (e.g. If-Match) are
		// added alongside the defaults (Content-Type, Accept) rather than
		// replacing them.
		if (option.headers) {
			options.headers = { ...options.headers, ...(option.headers as IDataObject) };
		}
		// Merge remaining option keys (excluding headers, already handled)
		const { headers: _headers, ...restOption } = option;
		Object.assign(options, restOption);

		this.logger.debug(`Pega Launchpad API Request: ${method} ${url}`);

		const response = await this.helpers.requestOAuth2.call(this, 'pegaOAuth2Api', options);

		// Extract only plain header key-value pairs to avoid circular
		// references (Node.js HTTP agent/socket objects) that would cause
		// "Converting circular structure to JSON" errors.
		const rawHeaders = (response.headers ?? {}) as Record<string, unknown>;
		const safeHeaders: IDataObject = {};
		for (const [key, value] of Object.entries(rawHeaders)) {
			if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
				safeHeaders[key] = value;
			} else if (Array.isArray(value)) {
				safeHeaders[key] = value.join(', ');
			}
		}

		// Extract the response body safely.
		// When body is undefined (e.g. 204 No Content) we return an empty object
		// rather than falling back to the full response which contains circular
		// references (request, socket, agent objects).
		let safeBody: IDataObject;
		if (
			response.body !== undefined &&
			response.body !== null &&
			typeof response.body === 'object'
		) {
			safeBody = response.body as IDataObject;
		} else if (typeof response.body === 'string') {
			try {
				safeBody = JSON.parse(response.body) as IDataObject;
			} catch {
				safeBody = { rawBody: response.body } as IDataObject;
			}
		} else {
			// No body or primitive body — return safe metadata instead
			safeBody = {
				statusCode: response.statusCode as number | undefined,
				statusMessage: (response.statusMessage as string) || 'OK',
			} as IDataObject;
		}

		return {
			body: safeBody,
			headers: safeHeaders,
		};
	} catch (error) {
		// The raw HTTP error may contain circular references (request/socket
		// objects). Extract a safe subset before passing to NodeApiError.
		const rawError = error as Record<string, unknown>;
		const safeError: Record<string, unknown> = {
			message: rawError.message ?? 'Unknown error',
			statusCode: rawError.statusCode ?? rawError.status,
		};

		// Try to extract a useful response body from the error
		if (rawError.response) {
			const errResp = rawError.response as Record<string, unknown>;
			if (typeof errResp.body === 'string') {
				try {
					safeError.body = JSON.parse(errResp.body);
				} catch {
					safeError.body = errResp.body;
				}
			} else if (typeof errResp.body === 'object' && errResp.body !== null) {
				// Only extract plain-serialisable properties
				try {
					safeError.body = JSON.parse(JSON.stringify(errResp.body));
				} catch {
					safeError.body = { error: String(errResp.body) };
				}
			}
			safeError.statusCode = safeError.statusCode ?? errResp.statusCode;
		}

		// If error itself is already a NodeApiError, re-throw directly
		if (rawError.httpCode) {
			safeError.httpCode = rawError.httpCode;
		}

		throw new NodeApiError(this.getNode(), safeError as JsonObject);
	}
}
