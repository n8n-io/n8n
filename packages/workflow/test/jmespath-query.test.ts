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

	it('throws JmespathQueryError on an unsafe property token', () => {
		expect(() => evaluateJmespathQuery({}, 'foo.__proto__')).toThrow(JmespathQueryError);
	});

	it('throws JmespathQueryError when the query contains a backslash', () => {
		expect(() => evaluateJmespathQuery({}, 'foo\\bar')).toThrow(JmespathQueryError);
	});

	it('throws (parser error) on an invalid query', () => {
		expect(() => evaluateJmespathQuery({ a: 1 }, '[[[')).toThrow();
	});
});
