import { compareSortValues } from '../utils';

describe('compareSortValues', () => {
	it('keeps the version 1 order for numeric strings', () => {
		expect(compareSortValues('9', '10')).toBe(1);
	});

	it('compares two numeric strings by value when enabled', () => {
		expect(compareSortValues('9', '10', true)).toBe(-1);
		expect(compareSortValues('452.8', '450.96', true)).toBe(1);
		expect(compareSortValues('10', '10.0', true)).toBe(0);
	});

	it('compares numbers by value', () => {
		expect(compareSortValues(9, 10)).toBe(-1);
		expect(compareSortValues(10, 9)).toBe(1);
	});

	it('compares strings case-insensitively', () => {
		expect(compareSortValues('apple', 'Banana')).toBe(-1);
		expect(compareSortValues('Apple', 'apple')).toBe(0);
	});

	it('does not treat non-decimal strings as numbers', () => {
		expect(compareSortValues('0x10', '9', true)).toBe(-1);
		expect(compareSortValues('1e999', '9', true)).toBe(-1);
		expect(compareSortValues(' ', '0', true)).toBe(-1);
		expect(compareSortValues('', '0', true)).toBe(-1);
	});
});
