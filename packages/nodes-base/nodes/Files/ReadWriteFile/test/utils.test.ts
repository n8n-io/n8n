import { escapeSpecialCharacters } from '../helpers/utils';

describe('Read/Write Files from Disk, escapeSpecialCharacters', () => {
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
