import { Project, type SourceFile } from 'ts-morph';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { TestDiscoveryAnalyzer } from './test-discovery-analyzer.js';
import { setConfig, resetConfig, defineConfig } from '../config.js';

vi.mock('./project-loader.js', () => ({
	getSourceFiles: (_project: Project, _globs: string[]) => mockGetSourceFiles(),
	getRelativePath: (filePath: string) => filePath.replace('/test-root/', ''),
}));

let mockGetSourceFiles: () => SourceFile[];

describe('TestDiscoveryAnalyzer', () => {
	let project: Project;

	beforeEach(() => {
		project = new Project({ useInMemoryFileSystem: true });
		mockGetSourceFiles = () => [];

		setConfig(
			defineConfig({
				rootDir: '/test-root',
			}),
		);
	});

	afterEach(() => {
		resetConfig();
	});

	function createFile(path: string, content: string): SourceFile {
		return project.createSourceFile(`/test-root/${path}`, content);
	}

	function discoverWith(files: SourceFile[]) {
		mockGetSourceFiles = () => files;
		return new TestDiscoveryAnalyzer(project).discover();
	}

	describe('basic discovery', () => {
		it('discovers file with an active test', () => {
			const file = createFile('tests/login.spec.ts', "test('logs in', async () => {});");
			const report = discoverWith([file]);

			expect(report.specs).toHaveLength(1);
			expect(report.specs[0].path).toBe('tests/login.spec.ts');
			expect(report.specs[0].capabilities).toEqual([]);
		});

		it('excludes file with no test calls', () => {
			const file = createFile('tests/helpers.ts', 'export function helper() {}');
			const report = discoverWith([file]);

			expect(report.specs).toHaveLength(0);
		});

		it('treats test.only as active', () => {
			const file = createFile('tests/focused.spec.ts', "test.only('focused', async () => {});");
			const report = discoverWith([file]);

			expect(report.specs).toHaveLength(1);
		});

		it('sorts specs by path', () => {
			const b = createFile('tests/b.spec.ts', "test('b', () => {});");
			const a = createFile('tests/a.spec.ts', "test('a', () => {});");
			const report = discoverWith([b, a]);

			expect(report.specs.map((s) => s.path)).toEqual(['tests/a.spec.ts', 'tests/b.spec.ts']);
		});

		it('discovers tests whose titles are template literals with substitutions', () => {
			const file = createFile(
				'tests/dynamic.spec.ts',
				`
for (const path of ['a', 'b']) {
	test(\`handles \${path}\`, async () => {});
}
`,
			);
			const report = discoverWith([file]);

			expect(report.specs).toHaveLength(1);
			expect(report.specs[0].path).toBe('tests/dynamic.spec.ts');
		});
	});

	describe('skip and fixme detection', () => {
		it('excludes file where all tests are test.skip', () => {
			const file = createFile('tests/skipped.spec.ts', "test.skip('skipped', async () => {});");
			const report = discoverWith([file]);

			expect(report.specs).toHaveLength(0);
		});

		it('excludes file where all tests are test.fixme', () => {
			const file = createFile('tests/fixme.spec.ts', "test.fixme('fixme', async () => {});");
			const report = discoverWith([file]);

			expect(report.specs).toHaveLength(0);
		});

		it('includes file with mixed active and skipped tests', () => {
			const file = createFile(
				'tests/mixed.spec.ts',
				`
test('active', async () => {});
test.skip('skipped', async () => {});
`,
			);
			const report = discoverWith([file]);

			expect(report.specs).toHaveLength(1);
		});
	});

	describe('describe-level skip scopes', () => {
		it('marks tests inside describe with no-arg test.fixme() as skipped', () => {
			const file = createFile(
				'tests/describe-fixme.spec.ts',
				`
test.describe('group', () => {
	test.fixme();
	test('inner', async () => {});
});
`,
			);
			const report = discoverWith([file]);

			expect(report.specs).toHaveLength(0);
		});

		it('marks tests inside describe with no-arg test.skip() as skipped', () => {
			const file = createFile(
				'tests/describe-skip.spec.ts',
				`
test.describe('group', () => {
	test.skip();
	test('inner', async () => {});
});
`,
			);
			const report = discoverWith([file]);

			expect(report.specs).toHaveLength(0);
		});

		it('marks tests inside wrapper-style test.fixme callback as skipped', () => {
			const file = createFile(
				'tests/wrapper-fixme.spec.ts',
				`
test.fixme('broken feature', async () => {
	test('sub-test', async () => {});
});
`,
			);
			const report = discoverWith([file]);

			// The wrapper test.fixme itself is skipped, and inner tests are inside its block
			expect(report.specs).toHaveLength(0);
		});

		it('does not affect tests outside the skipped scope', () => {
			const file = createFile(
				'tests/partial-skip.spec.ts',
				`
test.describe('skipped group', () => {
	test.fixme();
	test('inner', async () => {});
});
test('outside', async () => {});
`,
			);
			const report = discoverWith([file]);

			expect(report.specs).toHaveLength(1);
		});
	});

	describe('worker requirement extraction', () => {
		it('extracts a named capability from test.use()', () => {
			const file = createFile(
				'tests/email.spec.ts',
				"test.use({ capability: 'email' }); test('sends email', async () => {});",
			);
			const report = discoverWith([file]);

			expect(report.specs[0].capabilities).toEqual(['email']);
			expect(report.specs[0].services).toEqual([]);
		});

		it('extracts services from an inline capability', () => {
			const file = createFile(
				'tests/services.spec.ts',
				`
	test.use({ capability: { services: ['sandbox', 'proxy'] } });
	test('uses services', async () => {});
`,
			);
			const report = discoverWith([file]);

			expect(report.specs[0].capabilities).toEqual([]);
			expect(report.specs[0].services).toEqual(['proxy', 'sandbox']);
		});

		it('resolves a shorthand capability property', () => {
			const file = createFile(
				'tests/shorthand.spec.ts',
				`
	const capability = { services: ['proxy'] };
	test.use({ capability });
	test('uses shorthand config', async () => {});
`,
			);
			const report = discoverWith([file]);

			expect(report.specs[0].services).toEqual(['proxy']);
		});

		it('resolves an imported shared configuration', () => {
			createFile(
				'fixtures/shared.ts',
				`
	export const sharedConfig = { capability: { services: ['proxy'] } };
`,
			);
			const file = createFile(
				'tests/imported.spec.ts',
				`
	import { sharedConfig } from '../fixtures/shared';
	test.use(sharedConfig);
	test('uses shared config', async () => {});
`,
			);
			const report = discoverWith([file]);

			expect(report.specs[0].services).toEqual(['proxy']);
		});

		it('resolves a nested property reference', () => {
			createFile(
				'fixtures/nested.ts',
				`
	export const baseConfig = { capability: { services: ['proxy', 'sandbox'] } };
	export const nestedConfig = {
		capability: { services: baseConfig.capability.services },
	};
`,
			);
			const file = createFile(
				'tests/nested.spec.ts',
				`
	import { nestedConfig } from '../fixtures/nested';
	test.use(nestedConfig);
	test('uses nested config', async () => {});
`,
			);
			const report = discoverWith([file]);

			expect(report.specs[0].services).toEqual(['proxy', 'sandbox']);
		});

		it('uses empty requirements when test.use() is absent', () => {
			const file = createFile('tests/default.spec.ts', "test('uses defaults', async () => {});");
			const report = discoverWith([file]);

			expect(report.specs[0].capabilities).toEqual([]);
			expect(report.specs[0].services).toEqual([]);
		});

		it('fails when a test.use() configuration cannot be resolved', () => {
			const file = createFile(
				'tests/unresolved.spec.ts',
				`
	const makeConfig = () => ({ capability: { services: ['proxy'] } });
	test.use(makeConfig());
	test('uses computed config', async () => {});
`,
			);

			expect(() => discoverWith([file])).toThrow(
				'Cannot resolve test.use() in tests/unresolved.spec.ts',
			);
		});
	});

	describe('skip tags', () => {
		it('marks tests matching skipTags as skipped', () => {
			setConfig(
				defineConfig({
					rootDir: '/test-root',
					skipTags: ['@wip'],
				}),
			);

			const file = createFile(
				'tests/wip.spec.ts',
				"test('work in progress @wip', async () => {});",
			);
			const report = discoverWith([file]);

			expect(report.specs).toHaveLength(0);
		});

		it('excludes file when all tests match skip tags', () => {
			setConfig(
				defineConfig({
					rootDir: '/test-root',
					skipTags: ['@wip'],
				}),
			);

			const file = createFile(
				'tests/all-wip.spec.ts',
				`
test('one @wip', async () => {});
test('two @wip', async () => {});
`,
			);
			const report = discoverWith([file]);

			expect(report.specs).toHaveLength(0);
		});

		it('includes file when some tests do not match skip tags', () => {
			setConfig(
				defineConfig({
					rootDir: '/test-root',
					skipTags: ['@wip'],
				}),
			);

			const file = createFile(
				'tests/partial-wip.spec.ts',
				`
test('wip @wip', async () => {});
test('active', async () => {});
`,
			);
			const report = discoverWith([file]);

			expect(report.specs).toHaveLength(1);
		});

		it('reports configured skipTags in the report', () => {
			setConfig(
				defineConfig({
					rootDir: '/test-root',
					skipTags: ['@wip', '@local-only'],
				}),
			);

			const file = createFile('tests/test.spec.ts', "test('test', async () => {});");
			const report = discoverWith([file]);

			expect(report.skipTags).toEqual(['@wip', '@local-only']);
		});
	});
});
