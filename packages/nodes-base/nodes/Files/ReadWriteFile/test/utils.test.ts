import { mock } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';
import { chmod, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
	escapeSpecialCharacters,
	globWithDeadline,
	isTriviallyCheapSelector,
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
});
