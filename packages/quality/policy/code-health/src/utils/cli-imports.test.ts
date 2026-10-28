import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Project } from 'ts-morph';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { entryPointOf, importReferences, loadCliFiles, resolveLocalImport } from './cli-imports.js';

describe('cli-imports', () => {
	describe('resolveLocalImport', () => {
		const rootDir = path.resolve('/repo');
		const filePath = path.join(rootDir, 'packages/cli/src/modules/agents/example.ts');

		it('resolves a relative specifier against the file', () => {
			expect(resolveLocalImport(rootDir, filePath, '../skills', {})).toBe(
				path.join(rootDir, 'packages/cli/src/modules/skills'),
			);
		});

		it('keeps an absolute specifier', () => {
			const target = path.join(rootDir, 'packages/cli/src/posthog');
			expect(resolveLocalImport(rootDir, filePath, target, {})).toBe(target);
		});

		it('uses the cli `@/*` alias when the options have no paths', () => {
			expect(resolveLocalImport(rootDir, filePath, '@/posthog', {})).toBe(
				path.join(rootDir, 'packages/cli/src/posthog'),
			);
		});

		it('resolves an alias without a wildcard', () => {
			const options = { baseUrl: rootDir, paths: { '@exact': ['./exact/target'] } };
			expect(resolveLocalImport(rootDir, filePath, '@exact', options)).toBe(
				path.join(rootDir, 'exact/target'),
			);
		});

		it('gives undefined for a package that no alias matches', () => {
			const options = { paths: { '@exact': ['./exact/target'], '@/*': ['./src/*'] } };
			expect(resolveLocalImport(rootDir, filePath, '@n8n/di', options)).toBeUndefined();
		});
	});

	describe('importReferences', () => {
		const referencesOf = (source: string) =>
			importReferences(
				new Project({ useInMemoryFileSystem: true }).createSourceFile('example.ts', source),
			).map(({ specifier, typeOnly }) => ({ specifier, typeOnly }));

		it('finds import types and dynamic imports with a template literal', () => {
			expect(
				referencesOf(
					"type A = import('./a').A;\nconst b = import(`./b`);\nconst c = import(name);\nimport();",
				),
			).toEqual([
				{ specifier: './a', typeOnly: true },
				{ specifier: './b', typeOnly: false },
			]);
		});

		it('finds the module specifier of vi.mock and the other module mocking helpers', () => {
			expect(
				referencesOf(
					[
						"vi.mock('./a');",
						"vi.mock('./b', () => ({}));",
						'vi.doMock(`./c`);',
						"await vi.importActual('./d');",
						"jest.mock('./e');",
						'vi.mock(name);',
						"vi.fn('./f');",
						"other.mock('./g');",
					].join('\n'),
				),
			).toEqual([
				{ specifier: './a', typeOnly: false },
				{ specifier: './b', typeOnly: false },
				{ specifier: './c', typeOnly: false },
				{ specifier: './d', typeOnly: false },
				{ specifier: './e', typeOnly: false },
			]);
		});

		it('ignores an import type without a string literal', () => {
			expect(referencesOf('type A = import(1);\ntype B = import(Foo);')).toEqual([]);
		});
	});

	describe('loadCliFiles', () => {
		let rootDir: string;

		beforeEach(() => {
			rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-imports-'));
		});

		afterEach(() => fs.rmSync(rootDir, { recursive: true, force: true }));

		it('loads files without a cli tsconfig', () => {
			const file = path.join(rootDir, 'packages/cli/src/example.ts');
			fs.mkdirSync(path.dirname(file), { recursive: true });
			fs.writeFileSync(file, 'export {};');

			const { files, options } = loadCliFiles(rootDir, [`${rootDir}/packages/cli/src/**/*.ts`]);

			expect(files.map((f) => f.getBaseName())).toEqual(['example.ts']);
			expect(options.paths).toBeUndefined();
		});
	});

	it('entryPointOf drops the extension and a trailing index', () => {
		const directory = path.resolve('/repo/skills');
		expect(entryPointOf(directory, path.join(directory, 'index.ts'))).toBe('');
		expect(entryPointOf(directory, path.join(directory, 'testing.js'))).toBe('testing');
		expect(entryPointOf(directory, path.join(directory, 'services/index'))).toBe('services');
	});
});
