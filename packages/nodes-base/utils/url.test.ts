import { UserError } from 'n8n-workflow';

import { toPathSegment } from './url';

describe('toPathSegment', () => {
	it('should leave a plain id unchanged', () => {
		expect(toPathSegment('my-index')).toBe('my-index');
	});

	it('should encode an id so it stays a single path segment', () => {
		expect(toPathSegment('a/b/c')).toBe('a%2Fb%2Fc');
		expect(toPathSegment('other-index/_doc/x')).toBe('other-index%2F_doc%2Fx');
	});

	it.each([
		// A comma is percent-encoded, which Elasticsearch still reads as a multi-index
		// separator, so `a,b` keeps resolving to both indices.
		['a,b', 'a%2Cb'],
		// A wildcard is left alone, so index patterns keep working.
		['logs-*', 'logs-*'],
	])('should preserve multi-value and wildcard syntax (%s)', (id, expected) => {
		expect(toPathSegment(id)).toBe(expected);
	});

	it.each(['', '.', '..'])('should reject the identifier "%s"', (id) => {
		expect(() => toPathSegment(id)).toThrow(UserError);
	});

	it.each([null, undefined])('should reject the nullish identifier %s', (id) => {
		expect(() => toPathSegment(id)).toThrow(UserError);
	});
});
