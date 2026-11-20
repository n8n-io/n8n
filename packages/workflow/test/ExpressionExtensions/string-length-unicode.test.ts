// @vitest-environment jsdom
import { stringExtensions } from '../../src/extensions/string-extensions';

const length = stringExtensions.functions.length as (value: string) => number;
const emoji = String.fromCodePoint(0x1f600);
const astralCjk = String.fromCodePoint(0x20000);

describe('string .length() character count', () => {
	describe('astral-plane (surrogate pair) characters', () => {
		test('counts a single emoji as one character', () => {
			expect(length(emoji)).toBe(1);
		});

		test('counts a string mixing ASCII and emoji characters', () => {
			expect(length(`a${emoji}b`)).toBe(3);
		});

		test('counts an astral CJK ideograph as one character', () => {
			expect(length(astralCjk)).toBe(1);
		});
	});

	describe('regression: BMP and empty strings are unchanged', () => {
		test('still counts ASCII characters', () => {
			expect(length('String')).toBe(6);
		});

		test('still counts BMP non-ASCII characters', () => {
			expect(length('你好')).toBe(2);
		});

		test('returns zero for an empty string', () => {
			expect(length('')).toBe(0);
		});
	});
});
