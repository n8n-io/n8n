/**
 * Utilities for recognizing and resolving expressions that are a plain field
 * reference into webhook request data, e.g. `={{ $json.body.campaign_id }}`
 * or `={{ $json.headers['x-api-key'] }}`. Such references can be resolved
 * natively — without the expression engine — which lets busy webhook
 * endpoints filter requests without acquiring an isolate.
 */

import type { IDataObject } from '../interfaces';

const SIMPLE_REQUEST_FIELD_RE =
	/^=\s*\{\{\s*\$json((?:\.[A-Za-z_$][\w$]*|\[\s*(?:'[^']*'|"[^"]*"|\d+)\s*\])+)\s*\}\}\s*$/;

/**
 * Returns the `$json`-relative path (e.g. `.body.campaign_id`) if the given
 * raw parameter value is a simple request-field reference, `null` otherwise.
 */
export function matchSimpleRequestFieldPath(value: string): string | null {
	const match = SIMPLE_REQUEST_FIELD_RE.exec(value);
	return match ? match[1] : null;
}

/**
 * Resolves a path returned by `matchSimpleRequestFieldPath` against the
 * request data (`{ body, headers, params, query }`). Returns `undefined` for
 * nullish segments, like optional chaining would; property access on
 * primitives (e.g. `.length` on a string) behaves like plain JS so results
 * match what the expression engine would produce for the same reference.
 */
export function resolveRequestFieldPath(source: IDataObject, pathExpr: string): unknown {
	const tokenRe = /\.([A-Za-z_$][\w$]*)|\[\s*(?:'([^']*)'|"([^"]*)"|(\d+))\s*\]/g;
	let current: unknown = source;
	for (const match of pathExpr.matchAll(tokenRe)) {
		if (current === null || current === undefined) return undefined;
		const key = match[1] ?? match[2] ?? match[3] ?? match[4] ?? '';
		current = (current as IDataObject)[key];
	}
	return current;
}
