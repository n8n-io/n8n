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

	describe('capability extraction', () => {
		it('extracts capability from test title tag', () => {
			const file = createFile(
				'tests/email.spec.ts',
				"test('sends email @capability:email', async () => {});",
			);
			const report = discoverWith([file]);

			expect(report.specs[0].capabilities).toEqual(['email']);
		});

		it('extracts multiple capabilities', () => {
			const file = createFile(
				'tests/multi.spec.ts',
				`
test.describe('multi @capability:proxy', () => {
	test('also email @capability:email', async () => {});
});
`,
			);
			const report = discoverWith([file]);

			expect(report.specs[0].capabilities).toEqual(['email', 'proxy']);
		});

		it('collects capabilities from describe-level tags', () => {
			const file = createFile(
				'tests/describe-cap.spec.ts',
				`
test.describe('email tests @capability:email', () => {
	test('sends email', async () => {});
});
`,
			);
			const report = discoverWith([file]);

			expect(report.specs[0].capabilities).toEqual(['email']);
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

	describe('template literal titles', () => {
		it('parses tags from backtick template literals', () => {
			const file = createFile(
				'tests/template.spec.ts',
				'test(`sends email @capability:email`, async () => {});',
			);
			const report = discoverWith([file]);

			expect(report.specs[0].capabilities).toEqual(['email']);
		});
	});
});
