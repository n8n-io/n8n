// @vitest-environment jsdom

import { evaluate } from './helpers';
import { arrayExtensions } from '../../src/extensions/array-extensions';
import { jsonParse } from '../../src/utils';

describe('Data Transformation Functions', () => {
	describe('Array Data Transformation Functions', () => {
		test('.randomItem() should work correctly on an array', () => {
			expect(evaluate('={{ [1,2,3].randomItem() }}')).not.toBeUndefined();
		});

		test('.isNotEmpty() should work correctly on an array', () => {
			expect(evaluate('={{ [1,2,3, "imhere"].isNotEmpty() }}')).toEqual(true);
		});

		test('.pluck() should work correctly on an array', () => {
			expect(
				evaluate(`={{ [
				{ value: 1, string: '1' },
				{ value: 2, string: '2' },
				{ value: 3, string: '3' },
				{ value: 4, string: '4' },
				{ value: 5, string: '5' },
				{ value: 6, string: '6' },
				{ value: { something: 'else' } }
			].pluck("value") }}`),
			).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6, { something: 'else' }]));
		});

		test('.pluck() should work correctly for multiple values', () => {
			expect(
				evaluate(`={{ [
					{
						firstName: 'John',
						lastName: 'Doe',
						phone: {
							home: '111-222',
							office: '333-444'
						}
					},
					{
						firstName: 'Jane',
						lastName: 'Doe',
						phone: {
							office: '555-666'
						}
					}
			].pluck("firstName", "lastName") }}`),
			).toEqual(
				expect.arrayContaining([
					['John', 'Doe'],
					['Jane', 'Doe'],
				]),
			);
		});

		test('.pluck() should work return everything with no args', () => {
			expect(
				evaluate(`={{ [
				{ value: 1, string: '1' },
				{ value: 2, string: '2' },
				{ value: 3, string: '3' },
				{ value: 4, string: '4' },
				{ value: 5, string: '5' },
				{ value: 6, string: '6' },
				{ value: { something: 'else' } }
			].pluck() }}`),
			).toEqual(
				expect.arrayContaining([
					{ value: 1, string: '1' },
					{ value: 2, string: '2' },
					{ value: 3, string: '3' },
					{ value: 4, string: '4' },
					{ value: 5, string: '5' },
					{ value: 6, string: '6' },
					{ value: { something: 'else' } },
				]),
			);
		});

		test('.unique() should work correctly on an array', () => {
			expect(evaluate('={{ ["repeat","repeat","a","b","c"].unique() }}')).toEqual(
				expect.arrayContaining(['repeat', 'repeat', 'a', 'b', 'c']),
			);
		});

		test('.unique() should work on an arrays containing nulls, objects and arrays', () => {
			expect(
				evaluate('={{ [1, 2, 3, "as", {}, {}, 1, 2, [1,2], "[sad]", "[sad]", null].unique() }}'),
			).toEqual([1, 2, 3, 'as', {}, [1, 2], '[sad]', null]);
		});

		test('.unique() should work on an arrays of objects', () => {
			expect(
				evaluate(
					"={{ [{'name':'Nathan', age:42}, {'name':'Jan', age:16}, {'name':'Nathan', age:21}].unique('name') }}",
				),
			).toEqual([
				{ name: 'Nathan', age: 42 },
				{ name: 'Jan', age: 16 },
			]);
		});

		describe('.unique()', () => {
			const unique = arrayExtensions.functions.unique as (
				value: unknown[],
				extraArgs: string[],
			) => unknown[];

			test('should keep an element that does not own the compared field', () => {
				const inherited = Object.create({ name: 'Nathan' }) as object;

				expect(unique([{ name: 'Nathan' }, inherited], ['name'])).toHaveLength(2);
			});

			test('should read a compared field served by a proxy without a getOwnPropertyDescriptor trap', () => {
				const proxyFor = (name: string) => {
					const fields: Record<string, unknown> = { name };
					return new Proxy(
						{},
						{
							has: (_target, key) => typeof key === 'string' && Object.hasOwn(fields, key),
							get: (_target, key) => (typeof key === 'string' ? fields[key] : undefined),
						},
					);
				};

				expect(unique([proxyFor('Nathan'), proxyFor('Jan')], ['name'])).toHaveLength(2);
			});
		});

		test('.isEmpty() should work correctly on an array', () => {
			expect(evaluate('={{ [].isEmpty() }}')).toEqual(true);
		});

		test('.isEmpty() should work correctly on an array', () => {
			expect(evaluate('={{ [1].isEmpty() }}')).toEqual(false);
		});

		test('.last() should work correctly on an array', () => {
			expect(evaluate('={{ ["repeat","repeat","a","b","c"].last() }}')).toEqual('c');
		});

		test('.first() should work correctly on an array', () => {
			expect(evaluate('={{ ["repeat","repeat","a","b","c"].first() }}')).toEqual('repeat');
		});

		test('.merge() should work correctly on an array', () => {
			expect(
				evaluate(
					'={{ [{ test1: 1, test2: 2 }, { test1: 1, test3: 3 }].merge([{ test1: 2, test3: 3 }, { test4: 4 }]) }}',
				),
			).toEqual({ test1: 1, test2: 2, test3: 3, test4: 4 });
		});

		test('.merge() should work correctly without arguments', () => {
			expect(
				evaluate(
					'={{ [{ a: 1, some: null }, { a: 2, c: "something" }, 2, "asds", { b: 23 }, null, [1, 2]].merge() }}',
				),
			).toEqual({ a: 1, some: null, c: 'something', b: 23 });
		});

		describe('.merge()', () => {
			const merge = arrayExtensions.functions.merge as (
				value: unknown[],
				extraArgs: unknown[][],
			) => Record<string, unknown>;

			describe.each([['.merge()', merge]])('%s', (_name, mergeFn) => {
				test('should merge an incoming field named toString', () => {
					const result = mergeFn([{ a: 1 }], [[{ toString: 'value' }]]);

					expect(Object.prototype.hasOwnProperty.call(result, 'toString')).toBe(true);
					expect(result.toString).toBe('value');
				});

				test('should treat an own __proto__ field of a source object as an ordinary field', () => {
					const source = jsonParse<Record<string, unknown>>('{"__proto__": {"marker": "set"}}');

					const result = mergeFn([source], [[{ a: 1 }]]);

					expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
					expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true);
					expect(({} as Record<string, unknown>).marker).toBeUndefined();
				});
			});
		});

		test('.smartJoin() should work correctly on an array of objects', () => {
			expect(
				evaluate(
					'={{ [{ name: "test1", value: "value1" }, { name: "test2", value: null }].smartJoin("name", "value") }}',
				),
			).toEqual({
				test1: 'value1',
				test2: null,
			});
		});

		describe('.smartJoin()', () => {
			const smartJoin = arrayExtensions.functions.smartJoin as (
				value: unknown[],
				extraArgs: string[],
			) => Record<string, unknown>;

			test('should join own key and value fields', () => {
				expect(
					smartJoin(
						[
							{ field: 'age', value: 2 },
							{ field: 'city', value: 'Berlin' },
						],
						['field', 'value'],
					),
				).toEqual({ age: 2, city: 'Berlin' });
			});

			test('should ignore inherited key and value fields', () => {
				const source = Object.create({ field: 'age', value: 2 }) as object;

				expect(smartJoin([source], ['field', 'value'])).toEqual({});
			});

			test('should read key and value fields served by a proxy without a getOwnPropertyDescriptor trap', () => {
				const fields: Record<string, unknown> = { field: 'age', value: 2 };
				const source = new Proxy(
					{},
					{
						has: (_target, key) => typeof key === 'string' && Object.hasOwn(fields, key),
						get: (_target, key) => (typeof key === 'string' ? fields[key] : undefined),
					},
				);

				expect(smartJoin([source], ['field', 'value'])).toEqual({ age: 2 });
			});

			test('should treat a key named __proto__ as an ordinary field', () => {
				const result = smartJoin(
					[{ field: '__proto__', value: { marker: 'set' } }],
					['field', 'value'],
				);

				expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
				expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true);
				expect(({} as Record<string, unknown>).marker).toBeUndefined();
			});
		});

		test('.renameKeys() should work correctly on an array of objects', () => {
			expect(
				evaluate(
					'={{ [{ test1: 1, test2: 2 }, { test1: 1, test3: 3 }].renameKeys("test1", "rename1", "test3", "rename3") }}',
				),
			).toEqual([
				{ rename1: 1, test2: 2 },
				{ rename1: 1, rename3: 3 },
			]);
		});

		describe('.renameKeys()', () => {
			const renameKeys = arrayExtensions.functions.renameKeys as (
				value: unknown[],
				extraArgs: string[],
			) => Array<Record<string, unknown>>;

			test('should rename nothing when the source name is not an own field', () => {
				const [result] = renameKeys([{ name: 'test' }], ['toString', 'renamed']);

				expect(result).toEqual({ name: 'test' });
				expect(Object.prototype.hasOwnProperty.call(result, 'renamed')).toBe(false);
			});

			test('should treat a target name of __proto__ as an ordinary field', () => {
				const [result] = renameKeys([{ name: { marker: 'set' } }], ['name', '__proto__']);

				expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
				expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true);
				expect(({} as Record<string, unknown>).marker).toBeUndefined();
			});
		});

		test('.sum() should work on an array of numbers', () => {
			expect(evaluate('={{ [1, 2, 3, 4, 5, 6].sum() }}')).toEqual(21);
			expect(() => evaluate('={{ ["1", 2, 3, 4, 5, "bad"].sum() }}')).toThrow();
		});

		test('.average() should work on an array of numbers', () => {
			expect(evaluate('={{ [1, 2, 3, 4, 5, 6].average() }}')).toEqual(3.5);
			expect(() => evaluate('={{ ["1", 2, 3, 4, 5, "bad"].average() }}')).toThrow();
		});

		test('.min() should work on an array of numbers', () => {
			expect(evaluate('={{ [1, 2, 3, 4, 5, 6].min() }}')).toEqual(1);
			expect(() => evaluate('={{ ["1", 2, 3, 4, 5, "bad"].min() }}')).toThrow();
		});

		test('.max() should work on an array of numbers', () => {
			expect(evaluate('={{ [1, 2, 3, 4, 5, 6].max() }}')).toEqual(6);
			expect(() => evaluate('={{ ["1", 2, 3, 4, 5, "bad"].max() }}')).toThrow();
		});

		test('.union() should work on an array of objects', () => {
			expect(
				evaluate(
					'={{ [{ test1: 1 }, { test2: 2 }].union([{ test1: 1, test3: 3 }, { test2: 2 }, { test4: 4 }]) }}',
				),
			).toEqual([{ test1: 1 }, { test2: 2 }, { test1: 1, test3: 3 }, { test4: 4 }]);
		});

		test('.union() should work on an arrays containing nulls, objects and arrays', () => {
			expect(evaluate('={{ [1, 2, "dd", {}, null].union([1, {}, null, 3]) }}')).toEqual([
				1,
				2,
				'dd',
				{},
				null,
				3,
			]);
		});

		test('.intersection() should work on an array of objects', () => {
			expect(
				evaluate(
					'={{ [{ test1: 1 }, { test2: 2 }].intersection([{ test1: 1, test3: 3 }, { test2: 2 }, { test4: 4 }]) }}',
				),
			).toEqual([{ test2: 2 }]);
		});

		test('.intersection() should work on an arrays containing nulls, objects and arrays', () => {
			expect(evaluate('={{ [1, 2, "dd", {}, null].intersection([1, {}, null]) }}')).toEqual([
				1,
				{},
				null,
			]);
		});

		test('.difference() should work on an array of objects', () => {
			expect(
				evaluate(
					'={{ [{ test1: 1 }, { test2: 2 }].difference([{ test1: 1, test3: 3 }, { test2: 2 }, { test4: 4 }]) }}',
				),
			).toEqual([{ test1: 1 }]);

			expect(
				evaluate('={{ [{ test1: 1 }, { test2: 2 }].difference([{ test1: 1 }, { test2: 2 }]) }}'),
			).toEqual([]);
		});

		test('.difference() should work on an arrays containing nulls, objects and arrays', () => {
			expect(
				evaluate('={{ [1, 2, "dd", {}, null, ["a", 1]].difference([1, {}, null, ["a", 1]]) }}'),
			).toEqual([2, 'dd']);
		});

		test('.compact() should work on an array', () => {
			expect(
				evaluate(
					'={{ [{ test1: 1, test2: undefined, test3: null }, null, undefined, 1, 2, 0, { test: "asdf" }].compact() }}',
				),
			).toEqual([{ test1: 1 }, 1, 2, 0, { test: 'asdf' }]);
		});

		test('.chunk() should work on an array', () => {
			expect(evaluate('={{ numberList(1, 20).chunk(5) }}')).toEqual([
				[1, 2, 3, 4, 5],
				[6, 7, 8, 9, 10],
				[11, 12, 13, 14, 15],
				[16, 17, 18, 19, 20],
			]);
		});

		test('.toJsonString() should work on an array', () => {
			expect(evaluate('={{ [true, 1, "one", {foo: "bar"}].toJsonString() }}')).toEqual(
				'[true,1,"one",{"foo":"bar"}]',
			);
		});

		test('.append() should work on an array', () => {
			expect(evaluate('={{ [1,2,3].append(4,5,"done") }}')).toEqual([1, 2, 3, 4, 5, 'done']);
		});

		describe('Conversion methods', () => {
			test('should exist but return undefined (to not break expressions with mixed data)', () => {
				expect(evaluate('={{ numberList(1, 20).toInt() }}')).toBeUndefined();
				expect(evaluate('={{ numberList(1, 20).toFloat() }}')).toBeUndefined();
				expect(evaluate('={{ numberList(1, 20).toBoolean() }}')).toBeUndefined();
				expect(evaluate('={{ numberList(1, 20).toDateTime() }}')).toBeUndefined();
			});

			test('should not have a doc (hidden from autocomplete)', () => {
				expect(arrayExtensions.functions.toInt.doc).toBeUndefined();
				expect(arrayExtensions.functions.toFloat.doc).toBeUndefined();
				expect(arrayExtensions.functions.toBoolean.doc).toBeUndefined();
				expect(arrayExtensions.functions.toDateTime.doc).toBeUndefined();
			});
		});
	});
});
