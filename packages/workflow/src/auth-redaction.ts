import type { IncomingHttpHeaders } from 'http';

type RequestWithHeaders = { headers: IncomingHttpHeaders };

export const REDACTED = '**hidden**';
const CONSUMED_AUTH = Symbol.for('n8n.consumedAuth');

function readRecord(req: RequestWithHeaders): string[] {
	const record = CONSUMED_AUTH in req ? req[CONSUMED_AUTH] : [];
	return Array.isArray(record) ? (record as string[]) : [];
}

/**
 * Saves which headers n8n consumed to authenticate this request, so that they can be redacted later
 */
export function recordConsumedAuth(req: RequestWithHeaders, names: string[]): void {
	Object.defineProperty(req, CONSUMED_AUTH, {
		value: [...readRecord(req), ...names],
		enumerable: false,
		writable: true,
		configurable: true,
	});
}

export function redactedHeaders(req: RequestWithHeaders): IncomingHttpHeaders {
	const headers = { ...req.headers };

	for (const name of readRecord(req)) {
		if (name in headers) headers[name] = REDACTED;
	}

	return headers;
}
