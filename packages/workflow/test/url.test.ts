import { toPathSegment, UserError } from '../src';

describe('toPathSegment', () => {
	it.each([
		['my-id', 'my-id'],
		[123, '123'],
		['a/b c', 'a%2Fb%20c'],
		['a?b#c\\d', 'a%3Fb%23c%5Cd'],
		['already%2Fencoded', 'already%252Fencoded'],
		['café', 'caf%C3%A9'],
	])('encodes %s as one path segment', (input, expected) => {
		expect(toPathSegment(input)).toBe(expected);
	});

	it.each(['', '.', '..', null, undefined])('rejects %s', (input) => {
		expect(() => toPathSegment(input)).toThrow(UserError);
	});
});
