import { normalizeFileSelector } from '../helpers/utils';

describe('Read/Write Files from Disk', () => {
	describe('normalizeFileSelector', () => {
		it('should normalize Windows file selector with \\', () => {
			const input = 'C:\\Users\\michael\\Desktop\\test.txt';
			const expectedOutput = 'C:/Users/michael/Desktop/test.txt';
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

		it('should normalize a Windows drive-root selector', () => {
			const input = 'C:\\[01]*';
			const expectedOutput = 'C:/[01]*';
			expect(normalizeFileSelector(input)).toBe(expectedOutput);
		});

		it('should normalize a Windows path whose directory name contains brackets', () => {
			const input = 'C:\\Users\\Administrator\\Desktop\\VTuber Legend [J-Novel Club]\\list.txt';
			const expectedOutput = 'C:/Users/Administrator/Desktop/VTuber Legend [J-Novel Club]/list.txt';
			expect(normalizeFileSelector(input)).toBe(expectedOutput);
		});

		it('should leave glob metacharacters untouched', () => {
			const input = '/home/user/VTuber Legend [J-Novel Club]/list.txt';
			expect(normalizeFileSelector(input)).toBe(input);
		});
	});
});
