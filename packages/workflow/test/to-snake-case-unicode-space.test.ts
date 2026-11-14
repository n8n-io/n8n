import { stringExtensions } from '../src/extensions/string-extensions';

const toSnakeCase = stringExtensions.functions.toSnakeCase as (value: string) => string;

describe('toSnakeCase with Unicode whitespace separators', () => {
	it('converts a non-breaking space into an underscore', () => {
		expect(toSnakeCase('first\u00A0name')).toBe('first_name');
	});

	it('converts tab and newline separators into underscores', () => {
		expect(toSnakeCase('first\tname')).toBe('first_name');
		expect(toSnakeCase('first\nname')).toBe('first_name');
	});

	it('does not silently drop words separated by Unicode spaces', () => {
		expect(toSnakeCase('first\u2003name')).toBe('first_name'); // em space
		expect(toSnakeCase('first\u3000name')).toBe('first_name'); // ideographic space
	});

	// Regression boundaries: existing behaviour must be preserved.
	it('still converts plain spaces and hyphens, and strips punctuation', () => {
		expect(toSnakeCase('I am a test!')).toBe('i_am_a_test');
		expect(toSnakeCase('a-b c')).toBe('a_b_c');
	});

	it('still keeps existing underscores and lowercases Unicode letters', () => {
		expect(toSnakeCase('i_am_a_test')).toBe('i_am_a_test');
		expect(toSnakeCase('Ä Ö Ü ß')).toBe('ä_ö_ü_ß');
	});
});
