import { escapeBracketsAndParens, normalizeFileSelector } from '../helpers/utils';

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

		it('should normalize a Windows path whose directory name contains brackets', () => {
			const input = 'C:\\Users\\Administrator\\Desktop\\VTuber Legend [J-Novel Club]\\list.txt';
			const expectedOutput = 'C:/Users/Administrator/Desktop/VTuber Legend [J-Novel Club]/list.txt';
			expect(normalizeFileSelector(input)).toBe(expectedOutput);
		});

		it('should normalize a Windows drive-root selector', () => {
			expect(normalizeFileSelector('C:\\[01]*')).toBe('C:/[01]*');
			expect(normalizeFileSelector('C:\\(final)')).toBe('C:/(final)');
			expect(normalizeFileSelector('C:\\{a,b}')).toBe('C:/{a,b}');
		});

		it('should still collapse . and .. in a forward-slash Windows selector', () => {
			expect(normalizeFileSelector('C:/Users/../me//x.txt')).toBe('C:/me/x.txt');
		});

		it('should convert a mixed-separator Windows selector', () => {
			// only `( ) [ ]` are ever escaped, so a backslash before anything else separates
			expect(normalizeFileSelector('C:/data\\!important/note.txt')).toBe(
				'C:/data/!important/note.txt',
			);
			expect(normalizeFileSelector('C:/data\\{drafts}/note.txt')).toBe('C:/data/{drafts}/note.txt');
		});

		it('should keep escapes in a forward-slash Windows selector', () => {
			const input = 'C:/Users/me/VTuber Legend \\[J-Novel Club\\]/list.txt';
			expect(normalizeFileSelector(input)).toBe(input);
		});

		it('should treat a backslash before a bracket as a separator when separators are backslashes', () => {
			const input = 'C:\\data\\prompts\\[01]*';
			expect(normalizeFileSelector(input)).toBe('C:/data/prompts/[01]*');
		});

		it('should leave glob metacharacters untouched', () => {
			const input = '/home/user/VTuber Legend [J-Novel Club]/list.txt';
			expect(normalizeFileSelector(input)).toBe(input);
		});
	});

	describe('escapeBracketsAndParens', () => {
		it('should escape square brackets and parentheses', () => {
			expect(escapeBracketsAndParens('/home/user/[release] (final)/x.txt')).toBe(
				'/home/user/\\[release\\] \\(final\\)/x.txt',
			);
		});

		it('should not escape an already escaped selector twice', () => {
			const input = '/home/user/\\[release\\]/x.txt';
			expect(escapeBracketsAndParens(input)).toBe(input);
		});

		it('should leave braces alone so brace expansion keeps working', () => {
			const input = '/home/user/{alpha,beta}/x.txt';
			expect(escapeBracketsAndParens(input)).toBe(input);
		});

		it('should keep braces the user escaped themselves', () => {
			const input = '/home/user/\\{drafts\\}/x.txt';
			expect(escapeBracketsAndParens(input)).toBe(input);
		});

		it('should leave wildcards alone', () => {
			const input = '/home/user/**/*.txt';
			expect(escapeBracketsAndParens(input)).toBe(input);
		});
	});
});
