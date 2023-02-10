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
				{ value: 6, string: '6' }
			].pluck("value") }}`),
			).toEqual(
				expect.arrayContaining([
					{ value: 1 },
					{ value: 2 },
					{ value: 3 },
					{ value: 4 },
					{ value: 5 },
					{ value: 6 },
				]),
			);
		});

		test('.unique() should work correctly on an array', () => {
			expect(evaluate('={{ ["repeat","repeat","a","b","c"].unique() }}')).toEqual(
				expect.arrayContaining(['repeat', 'repeat', 'a', 'b', 'c']),
			);
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
			).toEqual([
				{ test1: 1, test2: 2, test3: 3 },
				{ test1: 1, test3: 3, test4: 4 },
			]);
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

		test('.intersection() should work on an array of objects', () => {
			expect(
				evaluate(
					'={{ [{ test1: 1 }, { test2: 2 }].intersection([{ test1: 1, test3: 3 }, { test2: 2 }, { test4: 4 }]) }}',
				),
			).toEqual([{ test2: 2 }]);
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
