import { UserError } from './errors';

const DOT_SEGMENT = /(^|[/\\])\.{1,2}([/\\]|$)/;

/**
 * Encode an id as a single URL path segment. The empty string and values
 * with a `.` or `..` segment, such as `..`, `../x`, or `a/../b`, are rejected:
 * they survive encodeURIComponent but are removed during path
 * normalisation, so they cannot be encoded safely. Nullish values are
 * rejected before encoding, since they would otherwise become the literal
 * string "null" or "undefined".
 */
export function toPathSegment(id: unknown): string {
	if (id === null || id === undefined) {
		throw new UserError('Invalid identifier: a value is required');
	}
	const value = String(id);
	if (value === '' || DOT_SEGMENT.test(value)) {
		throw new UserError(`Invalid identifier: "${value}" is not allowed`);
	}
	return encodeURIComponent(value);
}
