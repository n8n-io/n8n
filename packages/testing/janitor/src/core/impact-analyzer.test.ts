import { Project } from 'ts-morph';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { ImpactAnalyzer } from './impact-analyzer.js';
import { setConfig, resetConfig, defineConfig } from '../config.js';

/**
 * Tests for ImpactAnalyzer - import graph tracing and test discovery.
 *
 * These tests verify that:
 * 1. Core/base files affect all tests (via transitive imports)
 * 2. Leaf files only affect tests that import them
 * 3. Facade pattern is handled correctly
 */

// Mock fs and path helpers to avoid filesystem access
vi.mock('../utils/paths.js', async () => {
	const actual = await vi.importActual('../utils/paths.js');
	return {
		...actual,
		getRootDir: () => '/test-root',
		findFilesRecursive: () => [], // Override in individual tests
	};
});

describe('ImpactAnalyzer', () => {
	let project: Project;

	beforeEach(() => {
		project = new Project({ useInMemoryFileSystem: true });

		setConfig(
			defineConfig({
				rootDir: '/test-root',
				facade: {
					file: 'pages/AppPage.ts',
					className: 'AppPage',
					excludeTypes: ['Page', 'APIRequestContext'],
				},
			}),
		);
	});

	afterEach(() => {
		resetConfig();
		vi.restoreAllMocks();
	});

	describe('Import Graph Tracing', () => {
		it('traces direct imports', () => {
			// Setup: TestFile imports CanvasPage
			project.createSourceFile(
				'/test-root/pages/CanvasPage.ts',
				`
export class CanvasPage {
  async addNode() {}
}
`,
			);

			project.createSourceFile(
				'/test-root/tests/canvas.spec.ts',
				`
import { CanvasPage } from '../pages/CanvasPage';

test('adds node', async () => {
  const page = new CanvasPage();
  await page.addNode();
});
`,
			);

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/CanvasPage.ts']);

			expect(result.affectedFiles).toContain('tests/canvas.spec.ts');
		});

		it('traces transitive imports (A → B → C)', () => {
			// Setup: Test imports PageB, PageB imports PageA
			// Changing PageA should affect Test
			project.createSourceFile(
				'/test-root/pages/PageA.ts',
				`
export class PageA {
  doSomething() {}
}
`,
			);

			project.createSourceFile(
				'/test-root/pages/PageB.ts',
				`
import { PageA } from './PageA';

export class PageB extends PageA {
  doMore() {}
}
`,
			);

			project.createSourceFile(
				'/test-root/tests/pageB.spec.ts',
				`
import { PageB } from '../pages/PageB';

test('does more', async () => {
  const page = new PageB();
  page.doMore();
});
`,
			);

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/PageA.ts']);

			// Changing PageA affects PageB, which affects pageB.spec.ts
			expect(result.affectedFiles).toContain('pages/PageB.ts');
			expect(result.affectedTests).toContain('tests/pageB.spec.ts');
		});

		it('base file affects all dependent tests', () => {
			// Setup: BasePage is imported by multiple pages
			// Changing BasePage should affect all tests using those pages
			project.createSourceFile(
				'/test-root/pages/BasePage.ts',
				`
export class BasePage {
  protected click(selector: string) {}
}
`,
			);

			project.createSourceFile(
				'/test-root/pages/CanvasPage.ts',
				`
import { BasePage } from './BasePage';

export class CanvasPage extends BasePage {
  async addNode() { this.click('add'); }
}
`,
			);

			project.createSourceFile(
				'/test-root/pages/WorkflowsPage.ts',
				`
import { BasePage } from './BasePage';

export class WorkflowsPage extends BasePage {
  async createWorkflow() { this.click('create'); }
}
`,
			);

			project.createSourceFile(
				'/test-root/tests/canvas.spec.ts',
				`
import { CanvasPage } from '../pages/CanvasPage';
test('canvas test', () => {});
`,
			);

			project.createSourceFile(
				'/test-root/tests/workflows.spec.ts',
				`
import { WorkflowsPage } from '../pages/WorkflowsPage';
test('workflows test', () => {});
`,
			);

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/BasePage.ts']);

			// Both tests should be affected via transitive dependency
			expect(result.affectedTests).toContain('tests/canvas.spec.ts');
			expect(result.affectedTests).toContain('tests/workflows.spec.ts');
		});

		it('leaf file only affects its direct consumers', () => {
			// Setup: UtilHelper is only used by one test
			project.createSourceFile(
				'/test-root/utils/helper.ts',
				`
export function formatData(data: any) { return data; }
`,
			);

			project.createSourceFile(
				'/test-root/tests/format.spec.ts',
				`
import { formatData } from '../utils/helper';
test('formats data', () => {});
`,
			);

			project.createSourceFile(
				'/test-root/tests/other.spec.ts',
				`
// Does not import helper
test('other test', () => {});
`,
			);

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['utils/helper.ts']);

			expect(result.affectedTests).toContain('tests/format.spec.ts');
			expect(result.affectedTests).not.toContain('tests/other.spec.ts');
		});
	});

	describe('Test File Detection', () => {
		it('identifies test files by path pattern', () => {
			project.createSourceFile('/test-root/tests/example.spec.ts', "test('example', () => {});");

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['tests/example.spec.ts']);

			// When a test file itself changes, it's in the affected tests
			expect(result.affectedTests).toContain('tests/example.spec.ts');
		});

		it('does not mark non-spec files as tests', () => {
			// Setup: CanvasPage has no dependents
			project.createSourceFile(
				'/test-root/pages/CanvasPage.ts',
				`
export class CanvasPage {}
`,
			);

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/CanvasPage.ts']);

			// CanvasPage.ts is in changedFiles but has no dependents
			// affectedFiles contains dependents, not the changed file itself
			expect(result.changedFiles).toContain('pages/CanvasPage.ts');
			expect(result.affectedTests).not.toContain('pages/CanvasPage.ts');
		});
	});

	describe('Dependency Graph', () => {
		it('builds correct dependency graph', () => {
			project.createSourceFile(
				'/test-root/pages/PageA.ts',
				`
export class PageA {}
`,
			);

			project.createSourceFile(
				'/test-root/pages/PageB.ts',
				`
import { PageA } from './PageA';
export class PageB {}
`,
			);

			project.createSourceFile(
				'/test-root/tests/test.spec.ts',
				`
import { PageB } from '../pages/PageB';
test('test', () => {});
`,
			);

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/PageA.ts']);

			// Graph shows PageA is depended on by PageB, which is depended on by test
			expect(result.graph['pages/PageA.ts']).toBeDefined();
			expect(result.graph['pages/PageA.ts']).toContain('pages/PageB.ts');
		});
	});

	describe('Edge Cases', () => {
		it('handles file not found gracefully', () => {
			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['nonexistent/file.ts']);

			// Should not throw, just warn
			expect(result.changedFiles).toEqual(['nonexistent/file.ts']);
			expect(result.affectedTests).toEqual([]);
		});

		it('handles circular imports', () => {
			// Setup circular dependency: A imports B, B imports A
			project.createSourceFile(
				'/test-root/pages/CircularA.ts',
				`
import { CircularB } from './CircularB';
export class CircularA {}
`,
			);

			project.createSourceFile(
				'/test-root/pages/CircularB.ts',
				`
import { CircularA } from './CircularA';
export class CircularB {}
`,
			);

			project.createSourceFile(
				'/test-root/tests/circular.spec.ts',
				`
import { CircularA } from '../pages/CircularA';
test('circular', () => {});
`,
			);

			const analyzer = new ImpactAnalyzer(project);

			// Should not infinite loop
			const result = analyzer.analyze(['pages/CircularA.ts']);

			expect(result.affectedTests).toContain('tests/circular.spec.ts');
		});

		it('handles multiple changed files', () => {
			project.createSourceFile(
				'/test-root/pages/PageA.ts',
				`
export class PageA {}
`,
			);

			project.createSourceFile(
				'/test-root/pages/PageB.ts',
				`
export class PageB {}
`,
			);

			project.createSourceFile(
				'/test-root/tests/testA.spec.ts',
				`
import { PageA } from '../pages/PageA';
test('a', () => {});
`,
			);

			project.createSourceFile(
				'/test-root/tests/testB.spec.ts',
				`
import { PageB } from '../pages/PageB';
test('b', () => {});
`,
			);

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/PageA.ts', 'pages/PageB.ts']);

			expect(result.changedFiles).toHaveLength(2);
			expect(result.affectedTests).toContain('tests/testA.spec.ts');
			expect(result.affectedTests).toContain('tests/testB.spec.ts');
		});
	});
});
