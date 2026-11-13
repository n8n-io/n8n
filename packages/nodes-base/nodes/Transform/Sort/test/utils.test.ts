import { compareNumericStrings, compareSortValues } from '../utils';

describe('compareSortValues', () => {
	it('keeps the version 1 order for numeric strings', () => {
		expect(compareSortValues('9', '10')).toBe(1);
	});

	it('compares two numeric strings by value when enabled', () => {
		expect(compareSortValues('9', '10', true)).toBe(-1);
		expect(compareSortValues('452.8', '450.96', true)).toBe(1);
		expect(compareSortValues('10', '10.0', true)).toBe(0);
	});

	it('compares large and precise numeric strings exactly', () => {
		expect(compareSortValues('9007199254740993', '9007199254740992', true)).toBe(1);
		expect(compareSortValues('0.10000000000000001', '0.1', true)).toBe(1);
		expect(compareSortValues('9.5', '9.10', true)).toBe(1);
		expect(compareSortValues('1e3', '1000', true)).toBe(0);
	});

	it('compares negative numeric strings by value', () => {
		expect(compareSortValues('-9', '-10', true)).toBe(1);
		expect(compareSortValues('-10', '-9', true)).toBe(-1);
		expect(compareSortValues('0', '-0', true)).toBe(0);
	});

	it('compares numbers by value', () => {
		expect(compareSortValues(9, 10)).toBe(-1);
		expect(compareSortValues(10, 9)).toBe(1);
	});

	it('compares strings case-insensitively', () => {
		expect(compareSortValues('apple', 'Banana')).toBe(-1);
		expect(compareSortValues('Apple', 'apple')).toBe(0);
	});

	it('keeps a stable order when numeric and non-numeric strings mix', () => {
		expect(compareSortValues('9', '10', true)).toBe(-1);
		expect(compareSortValues('9', '1st', true)).toBe(-1);
		expect(compareSortValues('10', '1st', true)).toBe(-1);
		expect(compareSortValues('1st', '9', true)).toBe(1);
	});

	it('does not treat non-decimal strings as numbers', () => {
		expect(compareSortValues('0x10', '9', true)).toBe(1);
		expect(compareSortValues('1e999', '9', true)).toBe(1);
		expect(compareSortValues(' ', '0', true)).toBe(1);
		expect(compareSortValues('', '0', true)).toBe(1);
	});
});

describe('compareNumericStrings', () => {
	it('compares distinct large values exactly', () => {
		expect(compareNumericStrings('9007199254740993', '9007199254740992')).toBe(1);
	});

	it('treats equivalent decimal forms as equal', () => {
		expect(compareNumericStrings('-1.2', '-1.20')).toBe(0);
	});
});
