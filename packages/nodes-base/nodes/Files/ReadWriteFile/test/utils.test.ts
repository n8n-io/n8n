import { escapeSpecialCharacters, normalizeFileSelector } from '../helpers/utils';

describe('Read/Write Files from Disk', () => {
	describe('escapeSpecialCharacters', () => {
		it('should return the string as-is for parentheses', () => {
			const input = '/home/michael/Desktop/test(1).txt';
			const expectedOutput = '/home/michael/Desktop/test(1).txt';
			expect(escapeSpecialCharacters(input)).toBe(expectedOutput);
		});

		it('should not modify strings that do not contain parentheses', () => {
			const input = '/home/michael/Desktop/test.txt';
			const expectedOutput = '/home/michael/Desktop/test.txt';
			expect(escapeSpecialCharacters(input)).toBe(expectedOutput);
		});

		it('should return the string as-is for square brackets', () => {
			const input = '/home/michael/Desktop/[release]/test.txt';
			const expectedOutput = '/home/michael/Desktop/[release]/test.txt';
			expect(escapeSpecialCharacters(input)).toBe(expectedOutput);
		});
	});

	describe('normalizeFileSelector', () => {
		it('should normalize UNIX file selector with parentheses', () => {
			const input = '/home/michael/Desktop/test(1).txt';
			const expectedOutput = '/home/michael/Desktop/test(1).txt';
			expect(normalizeFileSelector(input)).toBe(expectedOutput);
		});

		it('should normalize Windows file selector with \\ and parentheses', () => {
			const input = 'C:\\Users\\michael\\Desktop\	est(1).txt';
			const expectedOutput = 'C:/Users/michael/Desktop/test(1).txt';
			expect(normalizeFileSelector(input)).toBe(expectedOutput);
		});

		it('should normalize Windows file selector with \\\\\\\\', () => {
			const input = 'C:\\\\\\\\Users\\\\\\\\michael\\\\\\\\Desktop\\\\\\\	est.txt';
			const expectedOutput = 'C:/Users/michael/Desktop/test.txt';
			expect(normalizeFileSelector(input)).toBe(expectedOutput);
		});

		it('should normalize Windows file selector with /', () => {
			const input = 'C:/Users/michael/Desktop/test.txt';
			const expectedOutput = 'C:/Users/michael/Desktop/test.txt';
			expect(normalizeFileSelector(input)).toBe(expectedOutput);
		});

		it('should return Windows file selector with forward slashes and unescaped brackets', () => {
			const input =
				'C:\\Users\\Administrator\\Desktop\\Manga\\Complete\\VTuber Legend [J-Novel Club]\\list.txt';
			const expectedOutput =
				'C:/Users/Administrator/Desktop/Manga/Complete/VTuber Legend [J-Novel Club]/list.txt';
			expect(normalizeFileSelector(input)).toBe(expectedOutput);
		});

		it('should return UNIX file selector with unescaped brackets', () => {
			const input = '/home/user/VTuber Legend [J-Novel Club]/list.txt';
			const expectedOutput = '/home/user/VTuber Legend [J-Novel Club]/list.txt';
			expect(normalizeFileSelector(input)).toBe(expectedOutput);
		});
	});
});
