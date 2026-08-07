type HeaderValue = string | string[] | undefined;

type RequestWithHeaders = { headers: Record<string, HeaderValue> };

type ConsumedAuth = { headers: string[]; cookies: string[] };

/** The marker the HTTP Request node already shows users for a hidden value. */
export const REDACTED = '**hidden**';

/**
 * Registered globally because this package ships both CJS and ESM builds — recording and
 * reading back can happen through different module instances, and a module-local symbol
 * would leave the record invisible to the trigger that has to act on it. Non-enumerable at
 * the property, so it cannot be spread or serialized into node data along with the request.
 */
const CONSUMED_AUTH = Symbol.for('n8n.consumedAuth');

function readRecord(req: RequestWithHeaders): ConsumedAuth | undefined {
	const record = (req as unknown as Record<symbol, unknown>)[CONSUMED_AUTH];

	// Shape-checked rather than truthy-checked: a deep-mocked request hands back a proxy
	// for any symbol, so `record` being set proves nothing on its own.
	if (
		typeof record !== 'object' ||
		record === null ||
		!Array.isArray((record as ConsumedAuth).headers) ||
		!Array.isArray((record as ConsumedAuth).cookies)
	) {
		return undefined;
	}

	return record as ConsumedAuth;
}

/**
 * Notes which headers and cookies n8n consumed to authenticate this request. They carry
 * n8n's own shared secret rather than caller payload, and which ones they are depends on
 * the credential — a Header Auth credential named `test` is just as sensitive as
 * `authorization`, so a static list cannot cover it.
 *
 * Recording on its own changes nothing. A trigger calls `redactedHeaders` to act on it.
 */
export function recordConsumedAuth(
	req: RequestWithHeaders,
	consumed: { headers?: string[]; cookies?: string[] },
): void {
	const existing = readRecord(req);

	if (existing) {
		existing.headers.push(...(consumed.headers ?? []));
		existing.cookies.push(...(consumed.cookies ?? []));
		return;
	}

	Object.defineProperty(req, CONSUMED_AUTH, {
		value: { headers: [...(consumed.headers ?? [])], cookies: [...(consumed.cookies ?? [])] },
		enumerable: false,
		writable: true,
		configurable: true,
	});
}

function withRedactedCookies(cookieHeader: string, names: string[]): string {
	return cookieHeader
		.split(';')
		.map((pair) => {
			const separator = pair.indexOf('=');
			if (separator === -1) return pair;

			const name = pair.slice(0, separator).trim();
			return names.includes(name) ? `${pair.slice(0, separator + 1)}${REDACTED}` : pair;
		})
		.join(';');
}

/**
 * The request's headers with everything `recordConsumedAuth` noted replaced by
 * {@link REDACTED}, so a trigger can hand them to nodes without leaking n8n's own secret.
 * The request is left untouched — later consumers still see the real values.
 *
 * Only the named cookies are redacted; unrelated cookies the caller sent are left alone.
 */
export function redactedHeaders(req: RequestWithHeaders): Record<string, HeaderValue> {
	const headers = { ...req.headers };
	const consumed = readRecord(req);
	if (!consumed) return headers;

	for (const name of consumed.headers) {
		if (name in headers) headers[name] = REDACTED;
	}

	if (consumed.cookies.length && typeof headers.cookie === 'string') {
		headers.cookie = withRedactedCookies(headers.cookie, consumed.cookies);
	}

	return headers;
}
