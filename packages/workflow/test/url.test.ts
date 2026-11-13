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

	it.each(['../x', 'a/../b', '..\\x', './x', 'x/..', 'a\\.\\b'])(
		'should reject a value with a dot segment: %s',
		(input) => {
			expect(() => toPathSegment(input)).toThrow(UserError);
		},
	);

	it.each([
		['..%252Fx', '..%25252Fx'],
		['a..b', 'a..b'],
		['...', '...'],
		['v1.0', 'v1.0'],
		['a/b', 'a%2Fb'],
	])('should accept a value without a dot segment: %s', (input, expected) => {
		expect(toPathSegment(input)).toBe(expected);
	});
});
