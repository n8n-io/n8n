import { evaluateJmespathQuery, JmespathQueryError } from '../src/jmespath-query';

describe('evaluateJmespathQuery', () => {
	it('selects a nested field from an object', () => {
		expect(evaluateJmespathQuery({ a: { b: 42 } }, 'a.b')).toBe(42);
	});

	it('selects across an array', () => {
		const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
		expect(evaluateJmespathQuery(data, '[*].id')).toEqual([1, 2, 3]);
	});

	it('returns null when nothing matches', () => {
		expect(evaluateJmespathQuery({ a: 1 }, 'b.c')).toBeNull();
	});

	it.each(['__proto__', 'prototype', 'constructor'])(
		'throws JmespathQueryError for unsafe token "%s"',
		(token) => {
			expect(() => evaluateJmespathQuery({}, `foo.${token}`)).toThrow(JmespathQueryError);
		},
	);

	it('throws JmespathQueryError when the query contains a backslash', () => {
		expect(() => evaluateJmespathQuery({}, 'foo\\bar')).toThrow(JmespathQueryError);
	});

	it('lets jmespath parser errors propagate unwrapped', () => {
		expect(() => evaluateJmespathQuery({ a: 1 }, '[[[')).toThrow();
		expect(() => evaluateJmespathQuery({ a: 1 }, '[[[')).not.toThrow(JmespathQueryError);
	});
});
