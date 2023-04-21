/**
 * @jest-environment jsdom
 */

import { evaluate } from './Helpers';

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
			).toEqual(
				expect.arrayContaining([1, 2, 3, 4, 5, 6, { something: 'else' }]),
			);
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
				expect.arrayContaining([["John", "Doe"],["Jane", "Doe"]]),
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
					{ value: { something: 'else' } }
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
				evaluate(
					'={{ [1, 2, 3, "as", {}, {}, 1, 2, [1,2], "[sad]", "[sad]", null].unique() }}',
				),
			).toEqual([1, 2, 3, "as", {}, [1,2], "[sad]", null]);
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
			).toEqual({"test1": 1, "test2": 2, "test3": 3, "test4": 4});
		});

		test('.merge() should work correctly without arguments', () => {
			expect(
				evaluate(
					'={{ [{ a: 1, some: null }, { a: 2, c: "something" }, 2, "asds", { b: 23 }, null, [1, 2]].merge() }}',
				),
			).toEqual({"a": 1, "some": null, "c": "something", "b": 23});
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
			expect(
				evaluate(
					'={{ [1, 2, "dd", {}, null].union([1, {}, null, 3]) }}',
				),
			).toEqual([1, 2, "dd", {}, null, 3]);
		});

		test('.intersection() should work on an array of objects', () => {
			expect(
				evaluate(
					'={{ [{ test1: 1 }, { test2: 2 }].intersection([{ test1: 1, test3: 3 }, { test2: 2 }, { test4: 4 }]) }}',
				),
			).toEqual([{ test2: 2 }]);
		});

		test('.intersection() should work on an arrays containing nulls, objects and arrays', () => {
			expect(
				evaluate(
					'={{ [1, 2, "dd", {}, null].intersection([1, {}, null]) }}',
				),
			).toEqual([1, {}, null]);
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
				evaluate(
					'={{ [1, 2, "dd", {}, null, ["a", 1]].difference([1, {}, null, ["a", 1]]) }}',
				),
			).toEqual([2, "dd"]);
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
	});
});
