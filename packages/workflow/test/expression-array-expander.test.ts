import { expandArraysToObjects } from '../src/expression-array-expander';

describe('Expression Array Expander', () => {
	describe('expandArraysToObjects', () => {
		test('zips arrays into multiple objects', () => {
			expect(
				expandArraysToObjects(
					{
						name: ['A', 'B', 'C'],
						price: [10, 20, 30],
					},
					['name', 'price'],
				),
			).toEqual([
				{ name: 'A', price: 10 },
				{ name: 'B', price: 20 },
				{ name: 'C', price: 30 },
			]);
		});

		test('preserves scalar values in all expanded objects', () => {
			expect(
				expandArraysToObjects(
					{
						name: ['A', 'B'],
						price: [10, 20],
						currency: 'USD',
					},
					['name', 'price'],
				),
			).toEqual([
				{ name: 'A', price: 10, currency: 'USD' },
				{ name: 'B', price: 20, currency: 'USD' },
			]);
		});

		test('handles mismatched array lengths by using longest array', () => {
			expect(
				expandArraysToObjects(
					{
						name: ['A', 'B', 'C'],
						price: [10, 20],
					},
					['name', 'price'],
				),
			).toEqual([
				{ name: 'A', price: 10 },
				{ name: 'B', price: 20 },
				{ name: 'C', price: undefined },
			]);
		});

		test('handles empty arrays', () => {
			expect(
				expandArraysToObjects(
					{
						name: [],
						price: [],
					},
					['name', 'price'],
				),
			).toEqual([]);
		});

		test('returns original object wrapped in array when no arrays present', () => {
			expect(expandArraysToObjects({ name: 'A', price: 10 }, ['name', 'price'])).toEqual([
				{ name: 'A', price: 10 },
			]);
		});

		test('handles single array with multiple scalar values', () => {
			expect(
				expandArraysToObjects(
					{
						name: ['A', 'B', 'C'],
						type: 'product',
						active: true,
					},
					['name'],
				),
			).toEqual([
				{ name: 'A', type: 'product', active: true },
				{ name: 'B', type: 'product', active: true },
				{ name: 'C', type: 'product', active: true },
			]);
		});

		test('handles arrays with nested objects', () => {
			expect(
				expandArraysToObjects(
					{
						item: [{ id: 1 }, { id: 2 }],
						qty: [5, 10],
					},
					['item', 'qty'],
				),
			).toEqual([
				{ item: { id: 1 }, qty: 5 },
				{ item: { id: 2 }, qty: 10 },
			]);
		});

		test('copies arrays that are not listed in keys unchanged', () => {
			expect(expandArraysToObjects({ name: ['A', 'B'], tags: ['x', 'y', 'z'] }, ['name'])).toEqual([
				{ name: 'A', tags: ['x', 'y', 'z'] },
				{ name: 'B', tags: ['x', 'y', 'z'] },
			]);
		});
	});
});
