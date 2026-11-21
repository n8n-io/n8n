import {
	NodeApiError,
	NodeOperationError,
	type IDataObject,
	type INode,
	type JsonObject,
} from 'n8n-workflow';

import type { AuthMode } from './auth';
import type { QualysPlane } from './types';

export const REDACTED = '[redacted]';

/**
 * Keys whose value is a credential. n8n renders an API error's payload into the
 * execution data, which is persisted and visible to anyone who can open the
 * execution, so these must never survive into it.
 */
const SECRET_KEYS =
	/^(authorization|proxy-authorization|auth|cookie|set-cookie|password|passwd|pwd|secret|clientsecret|client_secret|token|access_token|accesstoken|id_token|idtoken|jwt|apikey|api_key|x-api-key)$/i;

/** Transport internals that carry raw headers or sockets and no diagnostic value. */
const NOISE_KEYS = new Set([
	'request',
	'req',
	'res',
	'socket',
	'agent',
	'connection',
	'stream',
	'_header',
	'_httpMessage',
]);

const MAX_DEPTH = 6;
const MAX_ARRAY = 50;
const MAX_STRING = 2_000;

/** Strip credentials that appear inside free text rather than as a field. */
export function redactSecretsInText(text: string): string {
	return text
		.replace(/\b(Bearer|Basic)\s+[A-Za-z0-9\-._~+/]+=*/gi, `$1 ${REDACTED}`)
		.replace(/\beyJ[A-Za-z0-9\-_]*\.[A-Za-z0-9\-_]*\.[A-Za-z0-9\-_]*/g, REDACTED);
}

function truncate(text: string): string {
	return text.length > MAX_STRING ? `${text.slice(0, MAX_STRING)}… (truncated)` : text;
}

/** Anything that is not an object: redacted if a string, stringified otherwise. */
function sanitizeScalar(input: unknown): unknown {
	if (input === null || input === undefined) {
		return input ?? null;
	}

	if (typeof input === 'string') {
		return truncate(redactSecretsInText(input));
	}

	if (typeof input === 'number' || typeof input === 'boolean') {
		return input;
	}

	return String(input);
}

type Walk = (input: unknown, depth: number) => unknown;

function sanitizeArray(input: unknown[], depth: number, walk: Walk): unknown[] {
	const items = input.slice(0, MAX_ARRAY).map((entry) => walk(entry, depth + 1));

	if (input.length > MAX_ARRAY) {
		items.push(`… ${input.length - MAX_ARRAY} more`);
	}

	return items;
}

function sanitizeObject(input: object, depth: number, walk: Walk): IDataObject {
	const out: IDataObject = {};

	// Errors carry their useful parts on the prototype or as non-enumerable
	// properties, so pull those across explicitly.
	if (input instanceof Error) {
		out.name = input.name;
		out.message = truncate(redactSecretsInText(input.message));
	}

	for (const [key, entry] of Object.entries(input as Record<string, unknown>)) {
		if (NOISE_KEYS.has(key)) {
			continue;
		}

		out[key] = SECRET_KEYS.test(key) ? REDACTED : (walk(entry, depth + 1) as IDataObject['value']);
	}

	return out;
}

/**
 * Make an arbitrary thrown value safe to hand to NodeApiError: credentials
 * redacted, cycles broken, transport internals dropped, size bounded. Anything
 * with diagnostic value - status, url, method, response body - is kept.
 */
export function sanitizeForError(value: unknown): JsonObject {
	const seen = new WeakSet<object>();

	const walk: Walk = (input, depth) => {
		if (input === null || typeof input !== 'object') {
			return sanitizeScalar(input);
		}

		if (seen.has(input)) {
			return '[circular]';
		}
		seen.add(input);

		if (depth >= MAX_DEPTH) {
			return '[truncated]';
		}

		return Array.isArray(input)
			? sanitizeArray(input, depth, walk)
			: sanitizeObject(input, depth, walk);
	};

	const sanitized = walk(value, 0);

	if (sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)) {
		return sanitized as JsonObject;
	}

	return { value: sanitized } as JsonObject;
}

const PLANE_LABELS: Record<QualysPlane, string> = {
	ot: 'VMDR OT',
	gateway: 'Qualys gateway',
	csam: 'CyberSecurity Asset Management',
	fo: 'VMDR platform API',
};

const AUTH_LABELS: Record<AuthMode, string> = {
	client: 'API client',
	userToken: 'username and password (token)',
	basic: 'username and password (HTTP Basic)',
};

export type FailureContext = {
	plane: QualysPlane;
	method: string;
	endpoint: string;
	mode: AuthMode;
	statusCode?: number;
	qualysCode?: string;
};

/**
 * The diagnostic block shown beneath the error message. Everything here is
 * safe to display and is what makes a failure identifiable without having to
 * reproduce it.
 */
export function describeFailure(context: FailureContext): string {
	const lines = [
		`Request: ${context.method} ${redactSecretsInText(context.endpoint)}`,
		`API: ${PLANE_LABELS[context.plane]}`,
		`Authenticated with: ${AUTH_LABELS[context.mode]}`,
	];

	if (context.statusCode !== undefined && context.statusCode > 0) {
		lines.push(`HTTP status: ${context.statusCode}`);
	}

	if (context.qualysCode) {
		lines.push(`Qualys code: ${context.qualysCode}`);
	}

	return lines.join('\n');
}

/**
 * V8 refuses to build a string past ~512 MB, and the HTTP helper buffers a
 * response body into one before anything can parse it. An endpoint with no
 * paging of its own - the KnowledgeBase in full detail, above all - hits that
 * ceiling, and the raw message says nothing about which knobs narrow the pull.
 */
const OVERSIZED_RESPONSE =
	/cannot create a string longer than|invalid string length|err_string_too_long/i;

export function isOversizedResponse(error: unknown): boolean {
	const message = (error as Error | undefined)?.message;
	return typeof message === 'string' && OVERSIZED_RESPONSE.test(message);
}

/** The diagnostic block for a response too large to hold in memory. */
export function describeOversizedResponse(context: FailureContext): string {
	return [
		describeFailure(context),
		'',
		'The response was larger than the maximum string Node can hold (about 512 MB), so it could not be read at all.',
		'Narrow the request: set Detail Level to Basic, give QIDs or a Minimum/Maximum QID range, or filter by Modified After. Lowering Chunk Size splits a full KnowledgeBase pull into smaller responses.',
	].join('\n');
}

/** Pull a Qualys-specific status code out of a JSON or XML error body. */
export function extractQualysCode(body: unknown): string | undefined {
	if (typeof body === 'string') {
		const xml = /<CODE>(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?<\/CODE>/i.exec(body);
		if (xml) {
			return xml[1];
		}

		try {
			return extractQualysCode(JSON.parse(body));
		} catch {
			return undefined;
		}
	}

	if (body && typeof body === 'object') {
		const data = body as IDataObject;
		for (const key of ['responseCode', 'code', 'errorCode', 'status']) {
			const value = data[key];
			if (typeof value === 'string' && value.trim()) {
				return value.trim();
			}
			if (typeof value === 'number') {
				return String(value);
			}
		}
	}

	return undefined;
}

/**
 * Guarantee a caught value reaches n8n as a node error.
 *
 * An error raised further down is already a `NodeApiError` or
 * `NodeOperationError` carrying the Qualys message and the diagnostic block, so
 * it is passed through - re-wrapping would bury those. Anything else is a raw
 * throw that would reach the UI without node context, so it is wrapped, with
 * its payload sanitized first because n8n renders it into the execution data.
 *
 * Going through here rather than re-throwing the caught value directly is also
 * what satisfies `require-node-api-error`: every throw is provably a node error.
 */
export function asNodeError(node: INode, error: unknown): NodeApiError | NodeOperationError {
	if (error instanceof NodeApiError || error instanceof NodeOperationError) {
		return error;
	}

	const message = (error as Error | undefined)?.message;

	return new NodeApiError(node, sanitizeForError(error), {
		message: message ? `Qualys request failed: ${message}` : 'Qualys request failed',
	});
}
