import { escapeSpecialCharacters, normalizeFileSelector } from '../helpers/utils';

describe('Read/Write Files from Disk', () => {
	describe('escapeSpecialCharacters', () => {
		it('should escape parentheses in a string', () => {
			const input = '/home/michael/Desktop/test(1).txt';
			const expectedOutput = '/home/michael/Desktop/test\\(1\\).txt';
			expect(escapeSpecialCharacters(input)).toBe(expectedOutput);
		});

		it('should not modify strings that do not contain parentheses', () => {
			const input = '/home/michael/Desktop/test.txt';
			const expectedOutput = '/home/michael/Desktop/test.txt';
			expect(escapeSpecialCharacters(input)).toBe(expectedOutput);
		});
	});

	describe('normalizeFileSelector', () => {
		it('should normalize UNIX file selector with parentheses', () => {
			const input = '/home/michael/Desktop/test(1).txt';
			const expectedOutput = '/home/michael/Desktop/test\\(1\\).txt';
			expect(normalizeFileSelector(input)).toBe(expectedOutput);
		});

		it('should normalize Windows file selector with \\ and parentheses', () => {
			const input = 'C:\\Users\\michael\\Desktop\\test(1).txt';
			const expectedOutput = 'C:/Users/michael/Desktop/test\\(1\\).txt';
			expect(normalizeFileSelector(input)).toBe(expectedOutput);
		});

		it('should normalize Windows file selector with \\\\', () => {
			const input = 'C:\\\\Users\\\\michael\\\\Desktop\\\\test.txt';
			const expectedOutput = 'C:/Users/michael/Desktop/test.txt';
			expect(normalizeFileSelector(input)).toBe(expectedOutput);
		});

		it('should normalize Windows file selector with /', () => {
			const input = 'C:/Users/michael/Desktop/test.txt';
			const expectedOutput = 'C:/Users/michael/Desktop/test.txt';
			expect(normalizeFileSelector(input)).toBe(expectedOutput);
		});
	});
});
