/**
 * @jest-environment jsdom
 */

import { evaluate } from './Helpers';

describe('Data Transformation Functions', () => {
	describe('Array Data Transformation Functions', () => {
		test('.random() should work correctly on an array', () => {
			expect(evaluate('={{ [1,2,3].random() }}')).not.toBeUndefined();
		});

		test('.randomItem() alias should work correctly on an array', () => {
			expect(evaluate('={{ [1,2,3].randomItem() }}')).not.toBeUndefined();
		});

		test('.isPresent() should work correctly on an array', () => {
			expect(evaluate('={{ [1,2,3, "imhere"].isPresent() }}')).toEqual(true);
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

		test('.isBlank() should work correctly on an array', () => {
			expect(evaluate('={{ [].isBlank() }}')).toEqual(true);
		});

		test('.isBlank() should work correctly on an array', () => {
			expect(evaluate('={{ [1].isBlank() }}')).toEqual(false);
		});

		test('.length() should work correctly on an array', () => {
			expect(evaluate('={{ [].length() }}')).toEqual(0);
		});

		test('.count() should work correctly on an array', () => {
			expect(evaluate('={{ [1].count() }}')).toEqual(1);
		});

		test('.size() should work correctly on an array', () => {
			expect(evaluate('={{ [1,2].size() }}')).toEqual(2);
		});

		test('.last() should work correctly on an array', () => {
			expect(evaluate('={{ ["repeat","repeat","a","b","c"].last() }}')).toEqual('c');
		});

		test('.first() should work correctly on an array', () => {
			expect(evaluate('={{ ["repeat","repeat","a","b","c"].first() }}')).toEqual('repeat');
		});

		test('.filter() should work correctly on an array', () => {
			expect(evaluate('={{ ["repeat","repeat","a","b","c"].filter("repeat") }}')).toEqual(
				expect.arrayContaining(['repeat', 'repeat']),
			);
		});
	});
});
