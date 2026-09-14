import { UserError } from 'n8n-workflow';

/**
 * Encode an id as a single URL path segment. `.`, `..`, and the empty string
 * are rejected: they survive encodeURIComponent but are removed during path
 * normalisation, so they cannot be encoded safely. Nullish values are
 * rejected before encoding, since they would otherwise become the literal
 * string "null" or "undefined".
 */
export function toPathSegment(id: unknown): string {
	if (id === null || id === undefined) {
		throw new UserError('Invalid identifier: a value is required');
	}
	const value = String(id);
	if (value === '' || value === '.' || value === '..') {
		throw new UserError(`Invalid identifier: "${value}" is not allowed`);
	}
	return encodeURIComponent(value);
}
