import { createHash } from 'node:crypto';

import {
	requestPath,
	type IDataObject,
	type IHttpRequestOptions,
	type WithRequestTarget,
} from 'n8n-workflow';

import type { QualysCredential, QualysPlane, QualysRequestContext } from './types';

/**
 * How a request authenticates, chosen by the credential's Authentication field.
 *
 *   API                       username and password      API client
 *   ot, gateway (`/ot/*`)     `userToken`                `client`
 *   csam (`/rest/2.0/`)       `userToken`                `client` (rejected for now)
 *   fo (`qualysapi` `/api/`)  `basic`                    `client`
 *
 * `userToken` and `basic` both use the username and password. The gateway does
 * not take HTTP Basic, so there they buy a token from `POST /auth`. The platform
 * API takes HTTP Basic directly.
 *
 * Asset Management answers a client token with `400 Invalid Subscription Id`.
 * Qualys support confirms client support there is a work in progress, so the
 * client path stays wired and `explain()` in ./index.ts points to the username
 * and password method instead.
 */
export type AuthMode = 'client' | 'userToken' | 'basic';

const TOKEN_CACHE = new Map<string, { token: string; expiresAt: number }>();

/** Refresh this many milliseconds before the token actually expires. */
const EXPIRY_MARGIN_MS = 60_000;
/** Qualys tokens live 4 hours; used when the JWT carries no readable `exp`. */
const DEFAULT_TTL_MS = 4 * 60 * 60 * 1000;

/** `authType` is set from the node's Authentication field when the credential is loaded. */
export function usesApiClient(credentials: QualysCredential): boolean {
	return credentials.authType === 'apiClient';
}

export function hasClient(credentials: QualysCredential): boolean {
	return Boolean(credentials.clientId?.trim() && credentials.clientSecret?.trim());
}

export function hasUser(credentials: QualysCredential): boolean {
	return Boolean(credentials.username?.trim() && credentials.password);
}

export function clientGrant(credentials: QualysCredential): 'oidc' | 'oauth' {
	return credentials.clientGrant === 'oauth' ? 'oauth' : 'oidc';
}

/** Whether the credential has the fields the selected method needs. */
export function isConfigured(credentials: QualysCredential, mode: AuthMode): boolean {
	return mode === 'client' ? hasClient(credentials) : hasUser(credentials);
}

export function selectAuthMode(credentials: QualysCredential, plane: QualysPlane): AuthMode {
	if (usesApiClient(credentials)) {
		return 'client';
	}

	return plane === 'fo' ? 'basic' : 'userToken';
}

export function describeMissingAuth(credentials: QualysCredential): string {
	return usesApiClient(credentials)
		? 'The Qualys credential has no API client ID or secret.'
		: 'The Qualys credential has no username or password.';
}

function cacheKey(baseUrl: string, mode: AuthMode, credentials: QualysCredential): string {
	const identity = mode === 'client' ? credentials.clientId : credentials.username;
	const secret = mode === 'client' ? credentials.clientSecret : credentials.password;

	// Rotating a secret while keeping the same ID must not keep serving the token
	// minted from the old one, so the secret is fingerprinted into the key.
	return `${baseUrl}|${mode}|${identity ?? ''}|${fingerprint(secret ?? '')}`;
}

/**
 * Distinguishes one secret from another in the cache key without holding the
 * secret itself.
 *
 * This has to be collision resistant, not merely fast. The cache is module
 * scoped, so every credential in the n8n process shares it, and the rest of the
 * key is guessable - host, mode and client ID. A 32-bit non-cryptographic hash
 * would let someone who knows another tenant's client ID craft a secret that
 * collides with theirs and be served their cached token.
 */
function fingerprint(value: string): string {
	return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Read `exp` out of a JWT without verifying it; the server is the authority. */
export function readJwtExpiry(token: string): number | undefined {
	const segments = token.split('.');
	if (segments.length < 2) {
		return undefined;
	}

	try {
		const payload = Buffer.from(
			segments[1].replace(/-/g, '+').replace(/_/g, '/'),
			'base64',
		).toString('utf8');
		const { exp } = JSON.parse(payload) as IDataObject;
		return typeof exp === 'number' ? exp * 1000 : undefined;
	} catch {
		return undefined;
	}
}

export function readJwtClaims(token: string): IDataObject {
	const segments = token.split('.');
	if (segments.length < 2) {
		return {};
	}

	try {
		const payload = Buffer.from(
			segments[1].replace(/-/g, '+').replace(/_/g, '/'),
			'base64',
		).toString('utf8');
		return JSON.parse(payload) as IDataObject;
	} catch {
		return {};
	}
}

function extractToken(body: unknown): string {
	if (typeof body === 'string') {
		return body.trim();
	}

	if (body && typeof body === 'object') {
		const data = body as IDataObject;
		for (const candidate of [
			data.access_token,
			data.accessToken,
			data.token,
			data.id_token,
			data.idToken,
			data.jwt,
		]) {
			if (typeof candidate === 'string' && candidate.trim()) {
				return candidate.trim();
			}
		}
	}

	return '';
}

/** Shared by both token endpoints; neither should throw on a rejection. */
const TOKEN_REQUEST_DEFAULTS = {
	method: 'POST',
	json: false,
	returnFullResponse: true,
	ignoreHttpStatusErrors: true,
} as const;

function tokenRequest(
	credentials: QualysCredential,
	gatewayUrl: string,
	mode: AuthMode,
): WithRequestTarget<IHttpRequestOptions> {
	if (mode === 'userToken') {
		return {
			...TOKEN_REQUEST_DEFAULTS,
			baseURL: gatewayUrl,
			url: requestPath`/auth`,
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				username: (credentials.username ?? '').trim(),
				password: credentials.password ?? '',
				token: 'true',
			}).toString(),
		};
	}

	return {
		...TOKEN_REQUEST_DEFAULTS,
		baseURL: gatewayUrl,
		url: requestPath`/auth/${clientGrant(credentials)}`,
		headers: {
			clientId: (credentials.clientId ?? '').trim(),
			clientSecret: (credentials.clientSecret ?? '').trim(),
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: '',
	};
}

/** Whatever the endpoint said about the rejection, in one line. */
function describeTokenFailure(body: unknown, statusCode: number): string {
	if (typeof body === 'string' && body.trim()) {
		return body.trim();
	}

	if (body && typeof body === 'object') {
		const message = String((body as IDataObject).message ?? '');
		if (message) {
			return message;
		}
	}

	return `HTTP ${statusCode}`;
}

async function mintToken(
	this: QualysRequestContext,
	credentials: QualysCredential,
	gatewayUrl: string,
	mode: AuthMode,
): Promise<string> {
	const request: WithRequestTarget<IHttpRequestOptions> = tokenRequest(
		credentials,
		gatewayUrl,
		mode,
	);
	const response = (await this.helpers.httpRequest(request)) as {
		statusCode?: number;
		body?: unknown;
	};

	// POST /auth answers 201, POST /auth/oidc answers 200.
	const statusCode = response.statusCode ?? 0;
	if (statusCode < 200 || statusCode > 299) {
		throw new Error(
			`Qualys authentication failed (${mode}): ${describeTokenFailure(response.body, statusCode)}`,
		);
	}

	const token = extractToken(response.body);
	if (!token) {
		throw new Error(`Qualys authentication (${mode}) returned no token`);
	}

	return token;
}

export async function getToken(
	this: QualysRequestContext,
	credentials: QualysCredential,
	gatewayUrl: string,
	mode: AuthMode,
	forceRefresh = false,
): Promise<string> {
	const key = cacheKey(gatewayUrl, mode, credentials);
	const cached = TOKEN_CACHE.get(key);
	const now = Date.now();

	if (!forceRefresh && cached && cached.expiresAt > now + EXPIRY_MARGIN_MS) {
		return cached.token;
	}

	const token = await mintToken.call(this, credentials, gatewayUrl, mode);
	TOKEN_CACHE.set(key, {
		token,
		expiresAt: readJwtExpiry(token) ?? now + DEFAULT_TTL_MS,
	});

	return token;
}

export function invalidateToken(
	credentials: QualysCredential,
	gatewayUrl: string,
	mode: AuthMode,
): void {
	TOKEN_CACHE.delete(cacheKey(gatewayUrl, mode, credentials));
}

/** Exposed for tests; the cache is module scoped so it survives executions. */
export function clearTokenCache(): void {
	TOKEN_CACHE.clear();
}
