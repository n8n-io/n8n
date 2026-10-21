import { mock } from 'vitest-mock-extended';
import type { INode } from 'n8n-workflow';
import { chmod, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
	escapeBracketsAndParens,
	globWithDeadline,
	isTriviallyCheapSelector,
	normalizeFileSelector,
} from '../helpers/utils';

describe('Read/Write Files from Disk', () => {
	// The worker is loaded from the built `dist`; rebuild the package after editing
	// `glob.worker.ts` or these cases run against a stale worker.
	describe('globWithDeadline', () => {
		const node = mock<INode>();
		let directory: string;

		beforeAll(async () => {
			directory = await mkdtemp(path.join(tmpdir(), 'n8n-glob-'));
			await mkdir(path.join(directory, 'long'));
			await writeFile(path.join(directory, 'long', 'a'.repeat(250)), '');
			await writeFile(path.join(directory, 'note.txt'), '');
		});

		afterAll(async () => {
			await rm(directory, { recursive: true, force: true });
		});

		it('returns the matching files for a normal selector', async () => {
			expect(await globWithDeadline(node, `${directory}/*.txt`)).toEqual([`${directory}/note.txt`]);
		});

		// A selector with many `*` runs is slow to match against the long file name;
		// the budget must stop it instead of letting it run on.
		it('rejects a slow selector once the budget passes', async () => {
			const start = Date.now();
			const selector = `${directory}/long/${'*a'.repeat(10)}b`;

			await expect(globWithDeadline(node, selector, {}, 0, 200)).rejects.toThrow(
				'File(s) Selector is too complex',
			);
			expect(Date.now() - start).toBeLessThan(2000);
		});

		it('carries code and path back from the worker so the real path survives', async () => {
			// chmod 000 does not deny access for root or on Windows; nothing to assert there.
			if (process.platform === 'win32' || process.getuid?.() === 0) return;

			const secret = path.join(directory, 'secret');
			await mkdir(secret);
			await chmod(secret, 0o000);
			try {
				// `**` routes through the worker and walks into the unreadable directory
				const error = await globWithDeadline(node, `${secret}/**`).then(
					() => undefined,
					(thrown: NodeJS.ErrnoException) => thrown,
				);
				expect(error?.code).toBe('EACCES');
				expect(error?.path).toContain('secret');
			} finally {
				await chmod(secret, 0o700);
			}
		});

		it('rejects a non-trivial selector when the shared budget is already spent', async () => {
			// >2 `*` makes it a worker path; budget 0 means no work is started
			await expect(
				globWithDeadline(node, `${directory}/long/${'*a'.repeat(10)}b`, {}, 0, 0),
			).rejects.toThrow('File(s) Selector is too complex');
		});

		it('runs a trivial selector inline, bypassing the worker and the budget', async () => {
			// budget 0 would reject a worker path, but a plain selector never takes one
			expect(await globWithDeadline(node, `${directory}/*.txt`, {}, 0, 0)).toEqual([
				`${directory}/note.txt`,
			]);
		});
	});

	describe('isTriviallyCheapSelector', () => {
		it.each(['/d/file.txt', '/d/*.txt', '/d/*-*.log', '/d/report-????-??.csv', '/d/a/*/b/*.txt'])(
			'runs inline: %s',
			(selector) => {
				expect(isTriviallyCheapSelector(selector)).toBe(true);
			},
		);

		it.each([
			'/d/**/f.txt', // globstar: unbounded walk
			'/d/*a*a*b.txt', // more than two `*`
			'/d/{a,b}/f.txt', // brace
			'/d/(a|b).txt', // paren / extglob
			'/d/[a-z]*.txt', // character class
			'/d/a\\*b.txt', // escape
			'/d/!(a).txt', // negation / extglob
		])('defers to the worker: %s', (selector) => {
			expect(isTriviallyCheapSelector(selector)).toBe(false);
		});
	});

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
