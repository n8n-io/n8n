import { sleep } from '@n8n/utils/sleep';
import {
	NodeApiError,
	NodeOperationError,
	decodePathValue,
	requestPath,
	type IDataObject,
	type IHttpRequestOptions,
	type RequestPath,
	type WithRequestTarget,
} from 'n8n-workflow';

import {
	describeMissingAuth,
	getToken,
	invalidateToken,
	isConfigured,
	selectAuthMode,
	type AuthMode,
} from './auth';
import { API_CLIENT_CREDENTIAL, BASIC_AUTH_CREDENTIAL } from './authentication';
import { resolveHosts } from './hosts';
import type {
	QualysApiRequestOptions,
	QualysApiResponse,
	QualysCredential,
	QualysPlane,
	QualysRequestContext,
} from './types';
import {
	asNodeError,
	describeFailure,
	describeOversizedResponse,
	extractQualysCode,
	isOversizedResponse,
	sanitizeForError,
	type FailureContext,
} from './errors';
import { extractXmlErrorMessage, parseQualysXml } from './xml';

export { buildBaseUrl, derivePlatformUrl, resolveHosts, POD_HOSTS } from './hosts';
export {
	clearTokenCache,
	describeMissingAuth,
	isConfigured,
	readJwtClaims,
	readJwtExpiry,
	selectAuthMode,
} from './auth';
export { findNextBatchUrl, parseQualysXml, pluck } from './xml';
export {
	REDACTED,
	asNodeError,
	describeFailure,
	describeOversizedResponse,
	extractQualysCode,
	isOversizedResponse,
	redactSecretsInText,
	sanitizeForError,
} from './errors';
export type {
	QualysApiRequestOptions,
	QualysApiResponse,
	QualysCredential,
	QualysPlane,
} from './types';

export {
	API_CLIENT_CREDENTIAL,
	BASIC_AUTH_CREDENTIAL,
	authenticationProperties,
	qualysCredentials,
} from './authentication';

/**
 * Read the credential the node's Authentication field selects. The username and
 * password credential has no host field, so its platform comes from the node.
 */
async function loadCredentials(this: QualysRequestContext): Promise<QualysCredential> {
	const authentication = this.getNodeParameter('authentication', 0, 'apiClient') as string;

	if (authentication !== 'basicAuth') {
		const stored = await this.getCredentials<QualysCredential>(API_CLIENT_CREDENTIAL);
		return { ...stored, authType: 'apiClient' };
	}

	const stored = await this.getCredentials<QualysCredential>(BASIC_AUTH_CREDENTIAL);
	return {
		username: stored.username,
		password: stored.password,
		requestedWith: stored.requestedWith,
		authType: 'basicAuth',
		pod: this.getNodeParameter('pod', 0, 'us1') as string,
		baseUrl: this.getNodeParameter('baseUrl', 0, '') as string,
		platformUrl: this.getNodeParameter('platformUrl', 0, '') as string,
	};
}

/** Beyond this the node fails with the wait time rather than blocking a workflow. */
const MAX_RATE_LIMIT_WAIT_MS = 90_000;

function header(headers: IDataObject, name: string): string | undefined {
	const target = name.toLowerCase();
	for (const [key, value] of Object.entries(headers ?? {})) {
		if (key.toLowerCase() === target) {
			return Array.isArray(value) ? String(value[0]) : String(value);
		}
	}
	return undefined;
}

/**
 * Only an actual rejection is worth waiting on. `X-RateLimit-Remaining: 0` on a
 * successful response is informational - it says the NEXT call will be refused,
 * not that this one failed - so retrying on it would discard a good response and
 * spend another call from an already empty budget.
 */
export function isRateLimited(response: QualysApiResponse): boolean {
	return response.statusCode === 409 || response.statusCode === 429;
}

export function rateLimitWaitMs(response: QualysApiResponse): number {
	const wait = Number(header(response.headers, 'x-ratelimit-towait-sec'));
	return Number.isFinite(wait) && wait > 0 ? wait * 1000 : 0;
}

export async function qualysApiRequest(
	this: QualysRequestContext,
	requestOptions: QualysApiRequestOptions,
): Promise<QualysApiResponse> {
	const credentials = await loadCredentials.call(this);

	// These run before the request is attempted, so they are configuration
	// problems rather than API failures - and they sit outside the try below,
	// which only wraps transport errors.
	let hosts: Hosts;
	try {
		hosts = resolveHosts(credentials);
	} catch (error) {
		throw new NodeOperationError(this.getNode(), (error as Error).message, {
			description: 'Check the platform and base URLs on the Qualys credential or node.',
		});
	}

	const mode = selectAuthMode(credentials, requestOptions.plane);

	if (!isConfigured(credentials, mode)) {
		throw new NodeOperationError(this.getNode(), describeMissingAuth(credentials), {
			description: 'Complete the authentication fields on the Qualys credential.',
		});
	}

	const failure: FailureContext = {
		plane: requestOptions.plane,
		method: requestOptions.method ?? 'GET',
		endpoint: requestOptions.endpoint,
		mode,
	};

	const attempt: Attempt = { credentials, hosts, requestOptions, mode, forceRefresh: false };

	try {
		let response = await send.call(this, attempt);

		// A cached token can be revoked server-side before it expires; retry once.
		// HTTP Basic has no token, so a 401 there is final.
		if (response.statusCode === 401 && mode !== 'basic') {
			response = await send.call(this, { ...attempt, forceRefresh: true });
		}

		// Qualys reports the wait in a header rather than a Retry-After, and a
		// rolling window means retrying immediately just burns the next allowance.
		if (isRateLimited(response)) {
			const wait = rateLimitWaitMs(response);
			if (wait > 0 && wait <= MAX_RATE_LIMIT_WAIT_MS) {
				await sleep(wait);
				response = await send.call(this, attempt);
			}
		}

		if (requestOptions.emptyOn404 && response.statusCode === 404) {
			return { ...response, body: {} };
		}

		assertSuccessfulResponse.call(this, response, failure);
		return await finalizeBody(response, requestOptions.xml === true);
	} catch (error) {
		// Anything raised below is already a node error carrying the Qualys message
		// and the diagnostic block. A transport failure (DNS, TLS, socket) is not:
		// it arrives as an axios-shaped error carrying the outgoing request,
		// including the Authorization header, so it is sanitized and wrapped with
		// the failure's context before n8n renders it into the execution data.
		if (error instanceof NodeApiError || error instanceof NodeOperationError) {
			throw asNodeError(this.getNode(), error);
		}

		const message = (error as Error | undefined)?.message;

		throw new NodeApiError(this.getNode(), sanitizeForError(error), {
			message: message ? `Qualys request failed: ${message}` : 'Qualys request failed',
			description: describeTransportFailure(error, failure),
		});
	}
}

/**
 * A body too large to hold in a string never reaches the status check, so it
 * lands here as a bare transport failure. Its own message names no endpoint and
 * no remedy, so the diagnostic block supplies both.
 */
function describeTransportFailure(error: unknown, failure: FailureContext): string {
	return isOversizedResponse(error) ? describeOversizedResponse(failure) : describeFailure(failure);
}

type Hosts = { gateway: string; platform: string };

/** Everything one attempt needs. Grouped so the signature stays readable. */
type Attempt = {
	credentials: QualysCredential;
	hosts: Hosts;
	requestOptions: QualysApiRequestOptions;
	mode: AuthMode;
	forceRefresh: boolean;
};

/** Where a request goes: the plane's host, a path, and any query a paging link carried. */
type RequestTarget = { baseURL: string; url: RequestPath; qs?: IDataObject };

/**
 * Re-encode a path one segment at a time. A segment can arrive encoded already,
 * such as an asset ID, so each one is decoded first and is not encoded twice.
 * Qualys platform paths end in "/", and that slash is kept.
 */
function toRequestPath(path: string): RequestPath {
	let result = requestPath``;

	for (const segment of path.split('/').slice(1)) {
		result = segment ? requestPath`${result}/${decodePathValue(segment)}` : requestPath`${result}/`;
	}

	return result;
}

/**
 * A relative endpoint is resolved against the plane's host. An absolute one is
 * a paging link, and paging links come out of the response body - the platform
 * API hands back the next batch as a full URL in its WARNING element.
 *
 * Every request carries the credential, so following such a link to another
 * origin would hand it to whichever host the response named. The link is
 * therefore only followed back to the host this credential was configured to
 * talk to.
 */
function resolveTarget(endpoint: string, plane: QualysPlane, hosts: Hosts): RequestTarget {
	const base = plane === 'fo' ? hosts.platform : hosts.gateway;

	if (!/^https?:\/\//i.test(endpoint)) {
		return { baseURL: base, url: toRequestPath(endpoint) };
	}

	const target = new URL(endpoint);
	const expected = new URL(base);

	if (target.origin.toLowerCase() !== expected.origin.toLowerCase()) {
		throw new Error(
			`Refusing to follow a paging link to ${target.origin}: it does not match the configured Qualys host ${expected.origin}. The credential is only ever sent to that host.`,
		);
	}

	return {
		baseURL: expected.origin,
		url: toRequestPath(target.pathname),
		qs: Object.fromEntries(target.searchParams),
	};
}

/** JSON bodies are serialised here so the Content-Type cannot drift from them. */
function serializeBody(
	headers: IDataObject,
	body: QualysApiRequestOptions['body'],
): string | undefined {
	if (body === undefined || typeof body === 'string') {
		return body;
	}

	headers['Content-Type'] = 'application/json';
	return JSON.stringify(body);
}

async function applyAuth(
	this: QualysRequestContext,
	headers: IDataObject,
	attempt: Attempt,
): Promise<void> {
	const { credentials, hosts, mode, forceRefresh } = attempt;

	// The platform API takes the username and password on every request.
	if (mode === 'basic') {
		const user = `${(credentials.username ?? '').trim()}:${credentials.password ?? ''}`;
		headers.Authorization = `Basic ${Buffer.from(user, 'utf8').toString('base64')}`;
		return;
	}

	if (forceRefresh) {
		invalidateToken(credentials, hosts.gateway, mode);
	}

	headers.Authorization = `Bearer ${await getToken.call(
		this,
		credentials,
		hosts.gateway,
		mode,
		forceRefresh,
	)}`;
}

function buildRequestOptions(
	target: RequestTarget,
	headers: IDataObject,
	requestOptions: QualysApiRequestOptions,
): WithRequestTarget<IHttpRequestOptions> {
	const body = serializeBody(headers, requestOptions.body);

	return {
		method: requestOptions.method ?? 'GET',
		baseURL: target.baseURL,
		url: target.url,
		headers,
		qs: { ...target.qs, ...requestOptions.qs },
		...(body === undefined ? {} : { body }),
		json: false,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};
}

async function send(this: QualysRequestContext, attempt: Attempt): Promise<QualysApiResponse> {
	const { credentials, hosts, requestOptions } = attempt;
	const isFo = requestOptions.plane === 'fo';

	const headers: IDataObject = {
		Accept: requestOptions.xml ? 'application/xml' : 'application/json',
	};

	if (isFo) {
		headers['X-Requested-With'] = credentials.requestedWith?.trim() || 'n8n application';
	}

	const options: WithRequestTarget<IHttpRequestOptions> = buildRequestOptions(
		resolveTarget(requestOptions.endpoint, requestOptions.plane, hosts),
		headers,
		requestOptions,
	);

	await applyAuth.call(this, headers, attempt);

	const response = (await this.helpers.httpRequest(options)) as {
		statusCode?: number;
		body?: unknown;
		headers?: IDataObject;
	};

	return {
		statusCode: response.statusCode ?? 0,
		headers: response.headers ?? {},
		body: response.body,
	};
}

async function finalizeBody(response: QualysApiResponse, xml: boolean): Promise<QualysApiResponse> {
	const { body } = response;

	if (xml) {
		return {
			...response,
			body: typeof body === 'string' ? await parseQualysXml(body) : (body ?? {}),
		};
	}

	if (typeof body === 'string') {
		const trimmed = body.trim();
		if (!trimmed) {
			return { ...response, body: {} };
		}

		try {
			return { ...response, body: JSON.parse(trimmed) };
		} catch {
			return { ...response, body: trimmed };
		}
	}

	return response;
}

/** Append a hint without doubling the punctuation Qualys already supplied. */
function withHint(message: string, hint: string): string {
	return `${message.replace(/\s*\.\s*$/, '')}. ${hint}`;
}

/**
 * Turn Qualys' terser failures into something a workflow author can act on.
 * The hint is appended to the message Qualys sent rather than replacing it, so
 * nothing the API said is lost.
 */
function explain(statusCode: number, plane: QualysPlane, mode: AuthMode, message: string): string {
	if (
		plane === 'csam' &&
		mode === 'client' &&
		statusCode === 400 &&
		/Invalid Subscription Id/i.test(message)
	) {
		return withHint(
			message,
			'The Asset Management API does not accept API client credentials yet, and reports that as a subscription problem. Set Authentication to Username and Password on this node for this operation.',
		);
	}

	if (plane === 'fo' && statusCode === 401 && /no access for the application/i.test(message)) {
		return withHint(
			message,
			'The VMDR platform API rejected the token. Check that the API client is entitled to VMDR.',
		);
	}

	if (statusCode === 403) {
		return withHint(
			message,
			'Check that the module is enabled for the subscription and that "App API Enabled" is set on the role of the user.',
		);
	}

	if (statusCode === 416) {
		return withHint(
			message,
			'Page Size is above the maximum the API allows (300 for IT Asset requests).',
		);
	}

	if (statusCode === 400 && plane === 'csam') {
		return withHint(
			message,
			'This is also returned when a filter uses an operator the field does not support.',
		);
	}

	if (statusCode === 401) {
		return withHint(
			message,
			`Authentication (${mode}) was rejected; check the credential and that SSO is disabled for the account.`,
		);
	}

	if (statusCode === 409 || statusCode === 429) {
		return withHint(
			message,
			'The API rate limit for this subscription is exhausted; Qualys reports the remaining wait in the X-RateLimit-ToWait-Sec header.',
		);
	}

	return message;
}

/** The headline Qualys put in an object body, whatever it called the field. */
function messageFromObject(body: object, fallback: string): string {
	const data = body as IDataObject;
	return String(data.responseMessage ?? data.message ?? data.error ?? fallback);
}

/**
 * Errors are raised before the body is parsed for the caller, so parse it here
 * too. Passing the payload on as a JSON string would stop a workflow branching
 * on, say, `error.body.responseCode`.
 */
function readFailureBody(body: unknown, fallback: string): { payload: unknown; message: string } {
	if (typeof body === 'string' && body.trim()) {
		const xmlMessage = extractXmlErrorMessage(body);
		if (xmlMessage) {
			return { payload: body, message: xmlMessage };
		}

		try {
			const parsed = JSON.parse(body) as IDataObject;
			return { payload: parsed, message: messageFromObject(parsed, body.trim()) };
		} catch {
			// The body still reaches the payload in full, so truncating only the
			// headline loses nothing.
			return { payload: body, message: body.trim().slice(0, 500) };
		}
	}

	if (body && typeof body === 'object') {
		return { payload: body, message: messageFromObject(body, fallback) };
	}

	return { payload: body, message: fallback };
}

function assertSuccessfulResponse(
	this: QualysRequestContext,
	response: QualysApiResponse,
	failure: FailureContext,
): void {
	const { statusCode, body } = response;

	if (statusCode >= 200 && statusCode <= 299) {
		return;
	}

	const { payload, message } = readFailureBody(
		body,
		`Qualys API request failed with HTTP ${statusCode}`,
	);

	throw new NodeApiError(this.getNode(), sanitizeForError(payload ?? {}), {
		httpCode: String(statusCode),
		message: explain(statusCode, failure.plane, failure.mode, message),
		description: describeFailure({
			...failure,
			statusCode,
			qualysCode: extractQualysCode(body),
		}),
	});
}
