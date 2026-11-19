import { arrayExtensions } from '../src/extensions/array-extensions';

const chunk = arrayExtensions.functions.chunk as (
	value: unknown[],
	extraArgs: number[],
) => unknown[][];

describe('chunk() validates the size is a positive integer', () => {
	it('rejects a fractional chunk size instead of producing uneven groups', () => {
		expect(() => chunk([1, 2, 3, 4, 5], [2.5])).toThrow();
	});

	it('rejects a non-finite chunk size', () => {
		expect(() => chunk([1, 2, 3], [Infinity])).toThrow();
	});

	// Regression boundaries: behaviour that already works must stay unchanged.
	it('still splits into fixed-size groups for a positive integer size', () => {
		expect(chunk([1, 2, 3, 4, 5], [2])).toEqual([[1, 2], [3, 4], [5]]);
	});

	it('still rejects zero, negative, NaN and non-numeric sizes', () => {
		expect(() => chunk([1, 2, 3], [0])).toThrow();
		expect(() => chunk([1, 2, 3], [-1])).toThrow();
		expect(() => chunk([1, 2, 3], [NaN])).toThrow();
		expect(() => chunk([1, 2, 3], ['5' as unknown as number])).toThrow();
	});
});
