import { Project } from 'ts-morph';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { MethodUsageAnalyzer } from './method-usage-analyzer.js';
import { setConfig, resetConfig, defineConfig } from '../config.js';

/**
 * Tests for MethodUsageAnalyzer - fixture mapping and method usage tracking.
 *
 * These tests verify that:
 * 1. Fixture properties are correctly mapped to class names from facade
 * 2. Method calls in tests are correctly identified and tracked
 * 3. Method impact analysis returns correct affected test files
 */

// Create mock functions with proper types
const mockFindFilesRecursive = vi.fn<() => string[]>(() => []);
const mockReadFileSync = vi.fn<(path: string) => string>(() => '');

// Mock fs and path helpers to avoid filesystem access
vi.mock('../utils/paths.js', async () => {
	const actual = await vi.importActual('../utils/paths.js');
	return {
		...actual,
		getRootDir: () => '/test-root',
		findFilesRecursive: (_dir: string, _suffix: string) => mockFindFilesRecursive(),
	};
});

// Mock fs for file reading in extractMethodUsages
vi.mock('fs', async () => {
	const actual = await vi.importActual('fs');
	return {
		...actual,
		readFileSync: (filePath: string) => mockReadFileSync(filePath),
	};
});

describe('MethodUsageAnalyzer', () => {
	let project: Project;

	beforeEach(() => {
		project = new Project({ useInMemoryFileSystem: true });

		setConfig(
			defineConfig({
				rootDir: '/test-root',
				fixtureObjectName: 'app',
				facade: {
					file: 'pages/AppPage.ts',
					className: 'AppPage',
					excludeTypes: ['Page', 'APIRequestContext'],
				},
			}),
		);

		// Reset mocks
		mockFindFilesRecursive.mockReturnValue([]);
		mockReadFileSync.mockReturnValue('');
	});

	afterEach(() => {
		resetConfig();
		vi.restoreAllMocks();
	});

	describe('Fixture Mapping Extraction', () => {
		it('extracts fixture property to class mapping from facade', () => {
			// Create the facade file
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { Page } from '@playwright/test';
import { CanvasPage } from './CanvasPage';
import { WorkflowsPage } from './WorkflowsPage';
import { NodeEditorPage } from './NodeEditorPage';

export class AppPage {
  readonly page: Page;
  readonly canvas: CanvasPage;
  readonly workflows: WorkflowsPage;
  readonly nodeEditor: NodeEditorPage;
}
`,
			);

			const analyzer = new MethodUsageAnalyzer(project);
			const index = analyzer.buildIndex();

			// Verify fixture mappings (excluding 'page' which is in excludeTypes)
			expect(index.fixtureMapping.canvas).toBe('CanvasPage');
			expect(index.fixtureMapping.workflows).toBe('WorkflowsPage');
			expect(index.fixtureMapping.nodeEditor).toBe('NodeEditorPage');
			expect(index.fixtureMapping.page).toBeUndefined();
		});

		it('handles empty facade gracefully', () => {
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
export class AppPage {
  // No properties
}
`,
			);

			const analyzer = new MethodUsageAnalyzer(project);
			const index = analyzer.buildIndex();

			expect(Object.keys(index.fixtureMapping)).toHaveLength(0);
		});

		it('filters excluded types from mapping', () => {
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { Page, APIRequestContext } from '@playwright/test';
import { CanvasPage } from './CanvasPage';

export class AppPage {
  readonly page: Page;
  readonly request: APIRequestContext;
  readonly canvas: CanvasPage;
}
`,
			);

			const analyzer = new MethodUsageAnalyzer(project);
			const index = analyzer.buildIndex();

			// Only canvas should be mapped (page and request are excluded)
			expect(Object.keys(index.fixtureMapping)).toContain('canvas');
			expect(Object.keys(index.fixtureMapping)).not.toContain('page');
			expect(Object.keys(index.fixtureMapping)).not.toContain('request');
		});
	});

	describe('Method Usage Extraction', () => {
		it('extracts method calls from test files', () => {
			// Setup facade
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { CanvasPage } from './CanvasPage';

export class AppPage {
  readonly canvas: CanvasPage;
}
`,
			);

			// Mock finding test files
			mockFindFilesRecursive.mockReturnValue(['/test-root/tests/canvas.spec.ts']);

			// Mock reading the test file
			mockReadFileSync.mockReturnValue(`
import { test, expect } from '@playwright/test';

test('adds a node', async ({ app }) => {
  await app.canvas.addNode('Manual Trigger');
  await app.canvas.connectNodes('A', 'B');
});
`);

			const analyzer = new MethodUsageAnalyzer(project);
			const index = analyzer.buildIndex();

			expect(index.methods['CanvasPage.addNode']).toBeDefined();
			expect(index.methods['CanvasPage.addNode']).toHaveLength(1);
			expect(index.methods['CanvasPage.connectNodes']).toBeDefined();
			expect(index.methods['CanvasPage.connectNodes']).toHaveLength(1);
		});

		it('tracks multiple usages of same method', () => {
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { CanvasPage } from './CanvasPage';

export class AppPage {
  readonly canvas: CanvasPage;
}
`,
			);

			mockFindFilesRecursive.mockReturnValue(['/test-root/tests/canvas.spec.ts']);

			mockReadFileSync.mockReturnValue(`
test('workflow test', async ({ app }) => {
  await app.canvas.addNode('Trigger');
  await app.canvas.addNode('HTTP');
  await app.canvas.addNode('Set');
});
`);

			const analyzer = new MethodUsageAnalyzer(project);
			const index = analyzer.buildIndex();

			expect(index.methods['CanvasPage.addNode']).toHaveLength(3);
		});

		it('tracks usages across multiple test files', () => {
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { CanvasPage } from './CanvasPage';

export class AppPage {
  readonly canvas: CanvasPage;
}
`,
			);

			mockFindFilesRecursive.mockReturnValue([
				'/test-root/tests/canvas.spec.ts',
				'/test-root/tests/nodes.spec.ts',
			]);

			mockReadFileSync.mockImplementation((filePath: unknown) => {
				if (String(filePath).includes('canvas.spec.ts')) {
					return `
test('canvas test', async ({ app }) => {
  await app.canvas.addNode('Trigger');
});
`;
				} else {
					return `
test('nodes test', async ({ app }) => {
  await app.canvas.addNode('HTTP');
});
`;
				}
			});

			const analyzer = new MethodUsageAnalyzer(project);
			const index = analyzer.buildIndex();

			const usages = index.methods['CanvasPage.addNode'];
			expect(usages).toHaveLength(2);

			const testFiles = new Set(usages.map((u) => u.testFile));
			expect(testFiles.size).toBe(2);
		});

		it('captures line and column information', () => {
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { CanvasPage } from './CanvasPage';

export class AppPage {
  readonly canvas: CanvasPage;
}
`,
			);

			mockFindFilesRecursive.mockReturnValue(['/test-root/tests/canvas.spec.ts']);

			mockReadFileSync.mockReturnValue(`line1
line2
  await app.canvas.addNode('Trigger');
`);

			const analyzer = new MethodUsageAnalyzer(project);
			const index = analyzer.buildIndex();

			const usage = index.methods['CanvasPage.addNode'][0];
			expect(usage.line).toBe(3);
			expect(usage.column).toBeGreaterThan(0);
		});

		it('captures full call text', () => {
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { CanvasPage } from './CanvasPage';

export class AppPage {
  readonly canvas: CanvasPage;
}
`,
			);

			mockFindFilesRecursive.mockReturnValue(['/test-root/tests/canvas.spec.ts']);

			mockReadFileSync.mockReturnValue(`
  await app.canvas.addNode('Manual Trigger');
`);

			const analyzer = new MethodUsageAnalyzer(project);
			const index = analyzer.buildIndex();

			const usage = index.methods['CanvasPage.addNode'][0];
			expect(usage.fullCall).toContain('app.canvas.addNode');
			expect(usage.fullCall).toContain('Manual Trigger');
		});

		it('ignores unknown fixture properties', () => {
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { CanvasPage } from './CanvasPage';

export class AppPage {
  readonly canvas: CanvasPage;
}
`,
			);

			mockFindFilesRecursive.mockReturnValue(['/test-root/tests/test.spec.ts']);

			// 'unknown' is not in the fixture mapping
			mockReadFileSync.mockReturnValue(`
  await app.unknown.someMethod();
  await app.canvas.addNode();
`);

			const analyzer = new MethodUsageAnalyzer(project);
			const index = analyzer.buildIndex();

			// Only CanvasPage.addNode should be tracked
			expect(Object.keys(index.methods)).toEqual(['CanvasPage.addNode']);
		});
	});

	describe('Method Impact Analysis', () => {
		it('returns affected test files for a method', () => {
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { CanvasPage } from './CanvasPage';

export class AppPage {
  readonly canvas: CanvasPage;
}
`,
			);

			mockFindFilesRecursive.mockReturnValue([
				'/test-root/tests/canvas.spec.ts',
				'/test-root/tests/other.spec.ts',
			]);

			mockReadFileSync.mockImplementation((filePath: unknown) => {
				if (String(filePath).includes('canvas.spec.ts')) {
					return "await app.canvas.addNode('X');";
				} else {
					return '// no canvas calls';
				}
			});

			const analyzer = new MethodUsageAnalyzer(project);
			const result = analyzer.getMethodImpact('CanvasPage.addNode');

			expect(result.className).toBe('CanvasPage');
			expect(result.methodName).toBe('addNode');
			expect(result.affectedTestFiles).toContain('tests/canvas.spec.ts');
			expect(result.affectedTestFiles).not.toContain('tests/other.spec.ts');
		});

		it('returns empty when method has no usages', () => {
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { CanvasPage } from './CanvasPage';

export class AppPage {
  readonly canvas: CanvasPage;
}
`,
			);

			mockFindFilesRecursive.mockReturnValue([]);

			const analyzer = new MethodUsageAnalyzer(project);
			const result = analyzer.getMethodImpact('CanvasPage.unusedMethod');

			expect(result.usages).toHaveLength(0);
			expect(result.affectedTestFiles).toHaveLength(0);
		});

		it('throws on invalid method format', () => {
			project.createSourceFile('/test-root/pages/AppPage.ts', 'export class AppPage {}');

			mockFindFilesRecursive.mockReturnValue([]);

			const analyzer = new MethodUsageAnalyzer(project);

			expect(() => analyzer.getMethodImpact('invalidFormat')).toThrow('Invalid format');
		});
	});

	describe('List Used Methods', () => {
		it('returns methods sorted by usage count', () => {
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { CanvasPage } from './CanvasPage';
import { WorkflowsPage } from './WorkflowsPage';

export class AppPage {
  readonly canvas: CanvasPage;
  readonly workflows: WorkflowsPage;
}
`,
			);

			mockFindFilesRecursive.mockReturnValue(['/test-root/tests/test.spec.ts']);

			mockReadFileSync.mockReturnValue(`
  app.canvas.addNode('A');
  app.canvas.addNode('B');
  app.canvas.addNode('C');
  app.workflows.create();
`);

			const analyzer = new MethodUsageAnalyzer(project);
			const methods = analyzer.listUsedMethods();

			expect(methods[0].method).toBe('CanvasPage.addNode');
			expect(methods[0].usageCount).toBe(3);
			expect(methods[1].method).toBe('WorkflowsPage.create');
			expect(methods[1].usageCount).toBe(1);
		});
	});

	describe('Edge Cases', () => {
		it('handles missing facade file gracefully', () => {
			// Don't create the facade file
			mockFindFilesRecursive.mockReturnValue([]);

			const analyzer = new MethodUsageAnalyzer(project);

			// Should not throw, just return empty index
			const index = analyzer.buildIndex();
			expect(Object.keys(index.fixtureMapping)).toHaveLength(0);
			expect(Object.keys(index.methods)).toHaveLength(0);
		});

		it('handles file read errors gracefully', () => {
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { CanvasPage } from './CanvasPage';

export class AppPage {
  readonly canvas: CanvasPage;
}
`,
			);

			mockFindFilesRecursive.mockReturnValue(['/test-root/tests/test.spec.ts']);

			mockReadFileSync.mockImplementation(() => {
				throw new Error('File not found');
			});

			const analyzer = new MethodUsageAnalyzer(project);

			// Should not throw
			const index = analyzer.buildIndex();
			expect(Object.keys(index.methods)).toHaveLength(0);
		});

		it('handles nested parentheses in method calls', () => {
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { CanvasPage } from './CanvasPage';

export class AppPage {
  readonly canvas: CanvasPage;
}
`,
			);

			mockFindFilesRecursive.mockReturnValue(['/test-root/tests/test.spec.ts']);

			mockReadFileSync.mockReturnValue(`
  await app.canvas.addNode(getNodeName('trigger', { type: 'manual' }));
`);

			const analyzer = new MethodUsageAnalyzer(project);
			const index = analyzer.buildIndex();

			const usage = index.methods['CanvasPage.addNode'][0];
			expect(usage.fullCall).toContain('app.canvas.addNode');
			// The full call should include the nested parens
			expect(usage.fullCall).toContain('getNodeName');
		});

		it('handles multiple fixture calls on same line', () => {
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { CanvasPage } from './CanvasPage';

export class AppPage {
  readonly canvas: CanvasPage;
}
`,
			);

			mockFindFilesRecursive.mockReturnValue(['/test-root/tests/test.spec.ts']);

			mockReadFileSync.mockReturnValue(`
  await app.canvas.addNode('A'); await app.canvas.deleteNode('B');
`);

			const analyzer = new MethodUsageAnalyzer(project);
			const index = analyzer.buildIndex();

			expect(index.methods['CanvasPage.addNode']).toHaveLength(1);
			expect(index.methods['CanvasPage.deleteNode']).toHaveLength(1);
		});
	});
});
