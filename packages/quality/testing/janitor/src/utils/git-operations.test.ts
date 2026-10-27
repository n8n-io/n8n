import { describe, it, expect } from 'vitest';

import { parseGitStatus, parseGitDiff } from './git-operations.js';

describe('git-operations', () => {
	const gitRoot = '/repo';
	const scopeDir = '/repo/packages/quality/testing';

	describe('parseGitStatus', () => {
		it('parses modified files', () => {
			const output = ' M packages/quality/testing/src/file.ts\n';
			const result = parseGitStatus(output, gitRoot, scopeDir);

			expect(result).toEqual(['/repo/packages/quality/testing/src/file.ts']);
		});

		it('parses added files', () => {
			const output = 'A  packages/quality/testing/src/new-file.ts\n';
			const result = parseGitStatus(output, gitRoot, scopeDir);

			expect(result).toEqual(['/repo/packages/quality/testing/src/new-file.ts']);
		});

		it('parses renamed files (takes new path)', () => {
			const output = 'R  packages/quality/testing/old.ts -> packages/quality/testing/new.ts\n';
			const result = parseGitStatus(output, gitRoot, scopeDir);

			expect(result).toEqual(['/repo/packages/quality/testing/new.ts']);
		});

		it('filters by scope directory', () => {
			const output = [
				' M packages/quality/testing/src/file.ts',
				' M packages/other/src/file.ts',
			].join('\n');

			const result = parseGitStatus(output, gitRoot, scopeDir);

			expect(result).toEqual(['/repo/packages/quality/testing/src/file.ts']);
		});

		it('filters by extension', () => {
			const output = [
				' M packages/quality/testing/src/file.ts',
				' M packages/quality/testing/src/file.json',
			].join('\n');

			const result = parseGitStatus(output, gitRoot, scopeDir, ['.ts']);

			expect(result).toEqual(['/repo/packages/quality/testing/src/file.ts']);
		});

		it('allows all extensions when empty array', () => {
			const output = [
				' M packages/quality/testing/src/file.ts',
				' M packages/quality/testing/src/file.json',
			].join('\n');

			const result = parseGitStatus(output, gitRoot, scopeDir, []);

			expect(result).toHaveLength(2);
		});

		it('handles empty output', () => {
			const result = parseGitStatus('', gitRoot, scopeDir);
			expect(result).toEqual([]);
		});

		it('handles whitespace-only lines', () => {
			const output = '  \n\n  \n';
			const result = parseGitStatus(output, gitRoot, scopeDir);
			expect(result).toEqual([]);
		});

		it('handles directory paths with trailing slash (filters them out when extension specified)', () => {
			// If git status somehow returns a directory path, it should be filtered by extension
			const output = '?? packages/quality/testing/tests/new-feature/\n';
			const result = parseGitStatus(output, gitRoot, scopeDir, ['.ts']);

			// Directory paths don't end in .ts, so they're filtered out
			expect(result).toEqual([]);
		});

		it('handles directory paths with trailing slash (included when no extension filter)', () => {
			const output = '?? packages/quality/testing/tests/new-feature/\n';
			const result = parseGitStatus(output, gitRoot, scopeDir, []);

			// With no extension filter, directory paths are included as-is
			expect(result).toEqual(['/repo/packages/quality/testing/tests/new-feature/']);
		});
	});

	describe('parseGitDiff', () => {
		it('parses file paths', () => {
			const output = 'packages/quality/testing/src/file.ts\n';
			const result = parseGitDiff(output, gitRoot, scopeDir);

			expect(result).toEqual(['/repo/packages/quality/testing/src/file.ts']);
		});

		it('filters by scope directory', () => {
			const output = ['packages/quality/testing/src/file.ts', 'packages/other/src/file.ts'].join(
				'\n',
			);

			const result = parseGitDiff(output, gitRoot, scopeDir);

			expect(result).toEqual(['/repo/packages/quality/testing/src/file.ts']);
		});

		it('handles empty output', () => {
			const result = parseGitDiff('', gitRoot, scopeDir);
			expect(result).toEqual([]);
		});

		it('handles multiple files', () => {
			const output = [
				'packages/quality/testing/src/a.ts',
				'packages/quality/testing/src/b.ts',
				'packages/quality/testing/src/c.ts',
			].join('\n');

			const result = parseGitDiff(output, gitRoot, scopeDir);

			expect(result).toHaveLength(3);
		});
	});
});
