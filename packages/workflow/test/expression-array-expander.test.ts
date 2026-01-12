import { hasExpandableArrays, expandArraysToObjects } from '../src/expression-array-expander';

describe('Expression Array Expander', () => {
	describe('hasExpandableArrays', () => {
		test('returns true for object with array properties', () => {
			expect(hasExpandableArrays({ name: ['A', 'B', 'C'], price: [10, 20, 30] })).toBe(true);
		});

		test('returns true for object with single array property', () => {
			expect(hasExpandableArrays({ name: ['A', 'B', 'C'], price: 100 })).toBe(true);
		});

		test('returns false for object with no arrays', () => {
			expect(hasExpandableArrays({ name: 'A', price: 10 })).toBe(false);
		});

		test('returns false for empty object', () => {
			expect(hasExpandableArrays({})).toBe(false);
		});
	});

	describe('expandArraysToObjects', () => {
		test('zips arrays into multiple objects', () => {
			expect(
				expandArraysToObjects({
					name: ['A', 'B', 'C'],
					price: [10, 20, 30],
				}),
			).toEqual([
				{ name: 'A', price: 10 },
				{ name: 'B', price: 20 },
				{ name: 'C', price: 30 },
			]);
		});

		test('preserves scalar values in all expanded objects', () => {
			expect(
				expandArraysToObjects({
					name: ['A', 'B'],
					price: [10, 20],
					currency: 'USD',
				}),
			).toEqual([
				{ name: 'A', price: 10, currency: 'USD' },
				{ name: 'B', price: 20, currency: 'USD' },
			]);
		});

		test('handles mismatched array lengths by using longest array', () => {
			expect(
				expandArraysToObjects({
					name: ['A', 'B', 'C'],
					price: [10, 20],
				}),
			).toEqual([
				{ name: 'A', price: 10 },
				{ name: 'B', price: 20 },
				{ name: 'C', price: undefined },
			]);
		});

		test('handles empty arrays', () => {
			expect(
				expandArraysToObjects({
					name: [],
					price: [],
				}),
			).toEqual([]);
		});

		test('returns original object wrapped in array when no arrays present', () => {
			expect(expandArraysToObjects({ name: 'A', price: 10 })).toEqual([{ name: 'A', price: 10 }]);
		});

		test('handles single array with multiple scalar values', () => {
			expect(
				expandArraysToObjects({
					name: ['A', 'B', 'C'],
					type: 'product',
					active: true,
				}),
			).toEqual([
				{ name: 'A', type: 'product', active: true },
				{ name: 'B', type: 'product', active: true },
				{ name: 'C', type: 'product', active: true },
			]);
		});

		test('handles arrays with nested objects', () => {
			expect(
				expandArraysToObjects({
					item: [{ id: 1 }, { id: 2 }],
					qty: [5, 10],
				}),
			).toEqual([
				{ item: { id: 1 }, qty: 5 },
				{ item: { id: 2 }, qty: 10 },
			]);
		});
	});
});
