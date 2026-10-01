import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { findAdrFiles, findAllowedAdrDirectories, normalizePath } from './adr-conventions-files.js';
import type { AdrFileAccess } from './adr-conventions-files.js';

describe('ADR convention files', () => {
	const rootDir = path.resolve('/repo');

	describe('findAdrFiles', () => {
		it('finds and parses ADR files and the template outside generated directories', async () => {
			const validPath = path.join(rootDir, 'docs/adr/ADR-20260922-use-a-parser.md');
			const invalidPath = path.join(rootDir, 'docs/adr/ADR-invalid.md');
			const templatePath = path.join(rootDir, 'docs/ADR_TEMPLATE.md');
			const sources = new Map([
				[validPath, '# Use a parser\r\n'],
				[invalidPath, '# Invalid name\n'],
				[templatePath, '# <Decision title>\n'],
			]);
			const fileAccess: AdrFileAccess = {
				glob: vi.fn(async () => [validPath, invalidPath, templatePath]),
				readFile: vi.fn((filePath: string) => sources.get(filePath) ?? ''),
			};

			const files = await findAdrFiles(rootDir, fileAccess);

			expect(fileAccess.glob).toHaveBeenCalledWith(['**/ADR-*.md', 'docs/ADR_TEMPLATE.md'], {
				cwd: rootDir,
				absolute: true,
				onlyFiles: true,
				ignore: [
					'**/node_modules/**',
					'**/dist/**',
					'**/build/**',
					'**/out/**',
					'**/coverage/**',
					'**/.cache/**',
					'**/.turbo/**',
					'.git/**',
				],
			});
			expect(files).toHaveLength(3);
			expect(files).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						fileName: 'ADR-20260922-use-a-parser.md',
						fileId: 'ADR-20260922-use-a-parser',
						fileDate: '20260922',
						fileSlug: 'use-a-parser',
						lines: ['# Use a parser', ''],
					}),
					expect.objectContaining({
						fileName: 'ADR-invalid.md',
						fileId: undefined,
					}),
					expect.objectContaining({
						fileName: 'ADR_TEMPLATE.md',
						relativePath: 'docs/ADR_TEMPLATE.md',
						fileId: undefined,
					}),
				]),
			);
		});
	});

	describe('findAllowedAdrDirectories', () => {
		it('finds root and workspace package ADR directories', async () => {
			const packageJsonPath = path.join(rootDir, 'packages/engine/package.json');
			const fileAccess: AdrFileAccess = {
				glob: vi.fn(async () => [packageJsonPath]),
				readFile: vi.fn(() => 'packages:\n  - packages/*\n'),
			};

			const directories = await findAllowedAdrDirectories(rootDir, fileAccess);

			expect(directories).toEqual(
				new Set([
					normalizePath(path.join(rootDir, 'docs/adr')),
					normalizePath(path.join(rootDir, 'packages/engine/docs/adr')),
				]),
			);
		});
	});

	describe('normalizePath', () => {
		it('returns a path with forward slashes', () => {
			expect(normalizePath(path.join('packages', 'engine', 'docs', 'adr'))).toBe(
				'packages/engine/docs/adr',
			);
		});
	});
});
