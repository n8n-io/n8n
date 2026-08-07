import type { IncomingHttpHeaders } from 'http';

type RequestWithHeaders = { headers: IncomingHttpHeaders };

/** The marker the HTTP Request node already shows users for a hidden value. */
export const REDACTED = '**hidden**';

/**
 * `Symbol.for`, not `Symbol`: this package ships both CJS and ESM builds, so recording and
 * reading back can happen through different module instances, and a module-local symbol would
 * leave the record invisible. Stored non-enumerable, so it is never spread or serialized into
 * node data along with the request.
 */
const CONSUMED_AUTH = Symbol.for('n8n.consumedAuth');

function readRecord(req: RequestWithHeaders): string[] | undefined {
	const record = (req as unknown as Record<symbol, unknown>)[CONSUMED_AUTH];

	// Shape-checked rather than truthy-checked: a deep-mocked request hands back a proxy
	// for any symbol, so `record` being set proves nothing on its own.
	return Array.isArray(record) ? (record as string[]) : undefined;
}

/**
 * Notes which headers n8n consumed to authenticate this request: they carry n8n's own shared
 * secret rather than caller payload. Which ones they are depends on the credential — a Header
 * Auth credential can name any header — so a static list cannot cover it.
 *
 * Recording on its own changes nothing. A trigger calls `redactedHeaders` to act on it.
 */
export function recordConsumedAuth(req: RequestWithHeaders, names: string[]): void {
	const existing = readRecord(req);

	if (existing) {
		existing.push(...names);
		return;
	}

	Object.defineProperty(req, CONSUMED_AUTH, {
		value: [...names],
		enumerable: false,
		writable: true,
		configurable: true,
	});
}

/**
 * The request's headers with everything `recordConsumedAuth` noted replaced by
 * {@link REDACTED}, so a trigger can hand them to nodes without leaking n8n's own secret.
 * The request is left untouched — later consumers still see the real values.
 */
export function redactedHeaders(req: RequestWithHeaders): IncomingHttpHeaders {
	const headers = { ...req.headers };

	for (const name of readRecord(req) ?? []) {
		if (name in headers) headers[name] = REDACTED;
	}

	return headers;
}
