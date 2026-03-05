import { Project } from 'ts-morph';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { FileDiffResult } from './ast-diff-analyzer.js';
import { ImpactAnalyzer } from './impact-analyzer.js';
import type { MethodUsageIndex } from './method-usage-analyzer.js';
import { setConfig, resetConfig, defineConfig } from '../config.js';

/**
 * Tests for ImpactAnalyzer - import graph tracing and test discovery.
 *
 * These tests verify that:
 * 1. Core/base files affect all tests (via transitive imports)
 * 2. Leaf files only affect tests that import them
 * 3. Facade pattern is handled correctly
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

// Mock node:fs for file reading in findConsumersUsingProperties
vi.mock('node:fs', async () => {
	const actual = await vi.importActual('node:fs');
	return {
		...actual,
		readFileSync: (filePath: string) => mockReadFileSync(filePath),
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

		// Reset mocks
		mockFindFilesRecursive.mockReturnValue([]);
		mockReadFileSync.mockReturnValue('');
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

	describe('Facade-Aware Impact Analysis', () => {
		it('stops at facade and uses property-based search to find affected tests', () => {
			// This is the key integration test for facade-aware impact analysis
			// Setup:
			// - SecurityPage is imported by AppPage (facade)
			// - Multiple tests import the facade
			// - Only tests that USE app.security.* should be affected

			// Create the page being changed
			project.createSourceFile(
				'/test-root/pages/SecurityPage.ts',
				`
export class SecurityPage {
  async runAudit() {}
}
`,
			);

			// Create the facade that imports the page
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { Page } from '@playwright/test';
import { SecurityPage } from './SecurityPage';
import { CanvasPage } from './CanvasPage';

export class AppPage {
  readonly page: Page;
  readonly security: SecurityPage;
  readonly canvas: CanvasPage;
}
`,
			);

			// Create CanvasPage (not being changed)
			project.createSourceFile(
				'/test-root/pages/CanvasPage.ts',
				`
export class CanvasPage {
  async addNode() {}
}
`,
			);

			// Mock findFilesRecursive to return test files
			mockFindFilesRecursive.mockReturnValue([
				'/test-root/tests/security.spec.ts',
				'/test-root/tests/canvas.spec.ts',
				'/test-root/tests/other.spec.ts',
			]);

			// Mock reading test files - each with different property usages
			mockReadFileSync.mockImplementation((filePath) => {
				const path = String(filePath);
				if (path.includes('security.spec.ts')) {
					// Uses app.security.*
					return `
import { test } from '@playwright/test';
test('security audit', async ({ app }) => {
  await app.security.runAudit();
});
`;
				}
				if (path.includes('canvas.spec.ts')) {
					// Uses app.canvas.* (different page)
					return `
import { test } from '@playwright/test';
test('canvas test', async ({ app }) => {
  await app.canvas.addNode();
});
`;
				}
				// other.spec.ts doesn't use any page objects
				return `
import { test } from '@playwright/test';
test('other test', async ({ app }) => {
  // no page object calls
});
`;
			});

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/SecurityPage.ts']);

			// CRITICAL: Only security.spec.ts should be affected
			// canvas.spec.ts and other.spec.ts should NOT be affected
			// even though they would all import the same facade
			expect(result.affectedTests).toContain('tests/security.spec.ts');
			expect(result.affectedTests).not.toContain('tests/canvas.spec.ts');
			expect(result.affectedTests).not.toContain('tests/other.spec.ts');
		});

		it('base class changes affect all tests via transitive dependency through facade', () => {
			// Real n8n pattern: tests → fixtures → facade → pages → BasePage
			// Changing BasePage should affect ALL tests, not just ones using specific properties

			// BasePage - the core base class
			project.createSourceFile(
				'/test-root/pages/BasePage.ts',
				`
export class BasePage {
  protected click(selector: string) {}
}
`,
			);

			// Pages that extend BasePage
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
				'/test-root/pages/SecurityPage.ts',
				`
import { BasePage } from './BasePage';
export class SecurityPage extends BasePage {
  async runAudit() { this.click('audit'); }
}
`,
			);

			// Facade imports all pages
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { Page } from '@playwright/test';
import { CanvasPage } from './CanvasPage';
import { SecurityPage } from './SecurityPage';

export class AppPage {
  readonly page: Page;
  readonly canvas: CanvasPage;
  readonly security: SecurityPage;
}
`,
			);

			// Fixtures import facade (like real n8n)
			project.createSourceFile(
				'/test-root/fixtures/base.ts',
				`
import { AppPage } from '../pages/AppPage';
export const test = { n8n: new AppPage() };
`,
			);

			// Tests import fixtures
			project.createSourceFile(
				'/test-root/tests/canvas.spec.ts',
				`
import { test } from '../fixtures/base';
test('canvas test', async ({ n8n }) => {
  await n8n.canvas.addNode();
});
`,
			);

			project.createSourceFile(
				'/test-root/tests/security.spec.ts',
				`
import { test } from '../fixtures/base';
test('security test', async ({ n8n }) => {
  await n8n.security.runAudit();
});
`,
			);

			// Mock findFilesRecursive to return test files for property search
			mockFindFilesRecursive.mockReturnValue([
				'/test-root/tests/canvas.spec.ts',
				'/test-root/tests/security.spec.ts',
			]);

			// Mock reading test files for property pattern matching
			mockReadFileSync.mockImplementation((filePath) => {
				const path = String(filePath);
				if (path.includes('canvas.spec.ts')) {
					return 'await app.canvas.addNode();';
				}
				if (path.includes('security.spec.ts')) {
					return 'await app.security.runAudit();';
				}
				return '';
			});

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/BasePage.ts']);

			// BOTH tests should be affected - BasePage is core infrastructure
			// When BasePage changes:
			// 1. CanvasPage & SecurityPage are dependents (they import BasePage)
			// 2. AppPage (facade) imports CanvasPage & SecurityPage
			// 3. Facade-aware search finds tests using .canvas. and .security.
			// 4. Result: ALL tests are affected (correct!)
			expect(result.affectedTests).toContain('tests/canvas.spec.ts');
			expect(result.affectedTests).toContain('tests/security.spec.ts');
		});

		it('fixture file changes affect all tests that import it', () => {
			// When fixtures/base.ts changes, all tests should be affected

			project.createSourceFile(
				'/test-root/fixtures/base.ts',
				`
export const test = { n8n: {} };
`,
			);

			project.createSourceFile(
				'/test-root/tests/test1.spec.ts',
				`
import { test } from '../fixtures/base';
test('test 1', () => {});
`,
			);

			project.createSourceFile(
				'/test-root/tests/test2.spec.ts',
				`
import { test } from '../fixtures/base';
test('test 2', () => {});
`,
			);

			project.createSourceFile(
				'/test-root/tests/standalone.spec.ts',
				`
// Does NOT import fixtures/base
import { test } from '@playwright/test';
test('standalone', () => {});
`,
			);

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['fixtures/base.ts']);

			// Tests that import fixtures are affected
			expect(result.affectedTests).toContain('tests/test1.spec.ts');
			expect(result.affectedTests).toContain('tests/test2.spec.ts');
			// Standalone test that doesn't import fixtures is NOT affected
			expect(result.affectedTests).not.toContain('tests/standalone.spec.ts');
		});

		it('resolves multi-hop chain through composable (page → facade → composable → facade → test)', () => {
			// The MFA case: MfaLoginPage → facade(mfaLogin) → MfaComposer uses .mfaLogin.*
			// → facade(mfaComposer) → test uses .mfaComposer.*

			// Page being changed
			project.createSourceFile(
				'/test-root/pages/MfaLoginPage.ts',
				`
export class MfaLoginPage {
  async enterCode(code: string) {}
}
`,
			);

			// Composable that uses the page via facade property
			project.createSourceFile(
				'/test-root/composables/MfaComposer.ts',
				`
export class MfaComposer {
  async loginWithMfa() {
    await this.n8n.mfaLogin.enterCode('123456');
  }
}
`,
			);

			// Facade exposes both the page and the composable
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { Page } from '@playwright/test';
import { MfaLoginPage } from './MfaLoginPage';
import { MfaComposer } from '../composables/MfaComposer';

export class AppPage {
  readonly page: Page;
  readonly mfaLogin: MfaLoginPage;
  readonly mfaComposer: MfaComposer;
}
`,
			);

			// Mock: return composable + test files when searching all .ts files
			mockFindFilesRecursive.mockReturnValue([
				'/test-root/composables/MfaComposer.ts',
				'/test-root/tests/mfa.spec.ts',
				'/test-root/tests/login.spec.ts',
			]);

			mockReadFileSync.mockImplementation((filePath) => {
				const p = String(filePath);
				if (p.includes('MfaComposer.ts')) {
					return 'await this.n8n.mfaLogin.enterCode("123456");';
				}
				if (p.includes('mfa.spec.ts')) {
					return 'await n8n.mfaComposer.loginWithMfa();';
				}
				if (p.includes('login.spec.ts')) {
					return 'await n8n.login.signIn();'; // unrelated
				}
				return '';
			});

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/MfaLoginPage.ts']);

			// mfa.spec.ts should be found via the multi-hop chain
			expect(result.affectedTests).toContain('tests/mfa.spec.ts');
			// login.spec.ts doesn't use mfaLogin or mfaComposer
			expect(result.affectedTests).not.toContain('tests/login.spec.ts');
		});

		it('finds tests via both direct property usage and indirect composable chain', () => {
			// Same page used directly by one test AND through a composable by another

			project.createSourceFile(
				'/test-root/pages/SettingsPage.ts',
				`
export class SettingsPage {
  async openApiKeys() {}
}
`,
			);

			project.createSourceFile(
				'/test-root/composables/SetupComposer.ts',
				`
export class SetupComposer {
  async completeSetup() {
    await this.n8n.settings.openApiKeys();
  }
}
`,
			);

			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { Page } from '@playwright/test';
import { SettingsPage } from './SettingsPage';
import { SetupComposer } from '../composables/SetupComposer';

export class AppPage {
  readonly page: Page;
  readonly settings: SettingsPage;
  readonly setupComposer: SetupComposer;
}
`,
			);

			mockFindFilesRecursive.mockReturnValue([
				'/test-root/composables/SetupComposer.ts',
				'/test-root/tests/settings-direct.spec.ts',
				'/test-root/tests/setup-flow.spec.ts',
				'/test-root/tests/unrelated.spec.ts',
			]);

			mockReadFileSync.mockImplementation((filePath) => {
				const p = String(filePath);
				if (p.includes('SetupComposer.ts')) {
					return 'await this.n8n.settings.openApiKeys();';
				}
				if (p.includes('settings-direct.spec.ts')) {
					return 'await n8n.settings.openApiKeys();'; // direct usage
				}
				if (p.includes('setup-flow.spec.ts')) {
					return 'await n8n.setupComposer.completeSetup();'; // indirect via composable
				}
				return '';
			});

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/SettingsPage.ts']);

			// Both direct and indirect consumers found
			expect(result.affectedTests).toContain('tests/settings-direct.spec.ts');
			expect(result.affectedTests).toContain('tests/setup-flow.spec.ts');
			expect(result.affectedTests).not.toContain('tests/unrelated.spec.ts');
		});

		it('traces non-facade intermediary via import graph', () => {
			// Helper file not on the facade — should fall back to import tracing

			project.createSourceFile(
				'/test-root/pages/NodePage.ts',
				`
export class NodePage {
  async configureNode() {}
}
`,
			);

			// Helper that uses NodePage via facade property but is NOT on the facade itself
			project.createSourceFile(
				'/test-root/helpers/nodeHelper.ts',
				`
export function setupNode(n8n: any) {
  return n8n.node.configureNode();
}
`,
			);

			// Test imports the helper directly
			project.createSourceFile(
				'/test-root/tests/node-helper.spec.ts',
				`
import { setupNode } from '../helpers/nodeHelper';
test('configures node', () => {});
`,
			);

			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { Page } from '@playwright/test';
import { NodePage } from './NodePage';

export class AppPage {
  readonly page: Page;
  readonly node: NodePage;
}
`,
			);

			// findConsumersUsingProperties finds the helper (it references .node.)
			mockFindFilesRecursive.mockReturnValue(['/test-root/helpers/nodeHelper.ts']);

			mockReadFileSync.mockImplementation((filePath) => {
				const p = String(filePath);
				if (p.includes('nodeHelper.ts')) {
					return 'return n8n.node.configureNode();';
				}
				return '';
			});

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/NodePage.ts']);

			// Helper is not on facade, so import-trace picks up the test
			expect(result.affectedTests).toContain('tests/node-helper.spec.ts');
		});

		it('does not match unrelated composables with similar but distinct property names', () => {
			// Ensure .node doesn't match .nodePanel (word boundary check)

			project.createSourceFile(
				'/test-root/pages/NodePage.ts',
				`
export class NodePage {
  async openNode() {}
}
`,
			);

			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { Page } from '@playwright/test';
import { NodePage } from './NodePage';

export class AppPage {
  readonly page: Page;
  readonly node: NodePage;
}
`,
			);

			mockFindFilesRecursive.mockReturnValue([
				'/test-root/tests/node-panel.spec.ts',
				'/test-root/tests/node.spec.ts',
			]);

			mockReadFileSync.mockImplementation((filePath) => {
				const p = String(filePath);
				if (p.includes('node-panel.spec.ts')) {
					return 'await n8n.nodePanel.search("HTTP");'; // nodePanel, not node
				}
				if (p.includes('node.spec.ts')) {
					return 'await n8n.node.openNode();';
				}
				return '';
			});

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/NodePage.ts']);

			expect(result.affectedTests).toContain('tests/node.spec.ts');
			expect(result.affectedTests).not.toContain('tests/node-panel.spec.ts');
		});

		it('handles page not exposed on facade (falls back to camelCase)', () => {
			// If a page isn't in the facade, we fall back to camelCase property name
			project.createSourceFile(
				'/test-root/pages/NewFeaturePage.ts',
				`
export class NewFeaturePage {
  async doThing() {}
}
`,
			);

			// Facade doesn't include NewFeaturePage
			project.createSourceFile(
				'/test-root/pages/AppPage.ts',
				`
import { CanvasPage } from './CanvasPage';

export class AppPage {
  readonly canvas: CanvasPage;
}
`,
			);

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/NewFeaturePage.ts']);

			// Should still work - falls back to camelCase: newFeaturePage
			expect(result.changedFiles).toContain('pages/NewFeaturePage.ts');
		});
	});

	describe('Additive-Only Narrowing', () => {
		it('skips dependency tracing when all changes are additive', () => {
			// Shared service imported by a test — but only new methods were added
			project.createSourceFile(
				'/test-root/services/api-helper.ts',
				`
export class ApiHelper {
  async getWorkflows() {}
  async newMethod() {}
}
`,
			);

			project.createSourceFile(
				'/test-root/tests/api.spec.ts',
				`
import { ApiHelper } from '../services/api-helper';
test('uses api', () => {});
`,
			);

			const diffs: FileDiffResult[] = [
				{
					filePath: '/test-root/services/api-helper.ts',
					changedMethods: [
						{ className: 'ApiHelper', methodName: 'newMethod', changeType: 'added' },
					],
					isNewFile: false,
					isDeletedFile: false,
					parseTimeMs: 0,
				},
			];

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['services/api-helper.ts'], { diffs });

			// No transitive tests affected — the change is purely additive
			expect(result.affectedTests).toEqual([]);
		});

		it('finds affected tests via method-level when a method is modified', () => {
			const diffs: FileDiffResult[] = [
				{
					filePath: '/test-root/services/api-helper.ts',
					changedMethods: [
						{ className: 'ApiHelper', methodName: 'getWorkflows', changeType: 'modified' },
					],
					isNewFile: false,
					isDeletedFile: false,
					parseTimeMs: 0,
				},
			];

			const methodUsageIndex: MethodUsageIndex = {
				methods: {
					'ApiHelper.getWorkflows': [
						{
							testFile: 'tests/api.spec.ts',
							line: 1,
							column: 1,
							fullCall: 'ApiHelper.getWorkflows()',
						},
					],
				},
				fixtureMapping: {},
				timestamp: new Date().toISOString(),
				testFilesAnalyzed: 1,
			};

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['services/api-helper.ts'], { diffs, methodUsageIndex });

			expect(result.affectedTests).toContain('tests/api.spec.ts');
			expect(result.strategies['services/api-helper.ts']).toBe('method-level');
		});

		it('finds affected tests via method-level when changes are mixed (added + modified)', () => {
			const diffs: FileDiffResult[] = [
				{
					filePath: '/test-root/services/api-helper.ts',
					changedMethods: [
						{ className: 'ApiHelper', methodName: 'newMethod', changeType: 'added' },
						{ className: 'ApiHelper', methodName: 'getWorkflows', changeType: 'modified' },
					],
					isNewFile: false,
					isDeletedFile: false,
					parseTimeMs: 0,
				},
			];

			const methodUsageIndex: MethodUsageIndex = {
				methods: {
					'ApiHelper.getWorkflows': [
						{
							testFile: 'tests/api.spec.ts',
							line: 1,
							column: 1,
							fullCall: 'ApiHelper.getWorkflows()',
						},
					],
				},
				fixtureMapping: {},
				timestamp: new Date().toISOString(),
				testFilesAnalyzed: 1,
			};

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['services/api-helper.ts'], { diffs, methodUsageIndex });

			expect(result.affectedTests).toContain('tests/api.spec.ts');
			expect(result.strategies['services/api-helper.ts']).toBe('method-level');
		});

		it('traces normally when no diffs are provided (backwards-compatible)', () => {
			project.createSourceFile(
				'/test-root/services/api-helper.ts',
				`
export class ApiHelper {
  async getWorkflows() {}
}
`,
			);

			project.createSourceFile(
				'/test-root/tests/api.spec.ts',
				`
import { ApiHelper } from '../services/api-helper';
test('uses api', () => {});
`,
			);

			const analyzer = new ImpactAnalyzer(project);
			// No diffs parameter — full tracing as before
			const result = analyzer.analyze(['services/api-helper.ts']);

			expect(result.affectedTests).toContain('tests/api.spec.ts');
		});

		it('traces conservatively when changedMethods is empty', () => {
			// Empty changedMethods means the file changed but no method-level changes detected
			// (e.g., import reordering, comments). We should still trace conservatively.
			project.createSourceFile(
				'/test-root/services/api-helper.ts',
				`
export class ApiHelper {
  async getWorkflows() {}
}
`,
			);

			project.createSourceFile(
				'/test-root/tests/api.spec.ts',
				`
import { ApiHelper } from '../services/api-helper';
test('uses api', () => {});
`,
			);

			const diffs: FileDiffResult[] = [
				{
					filePath: '/test-root/services/api-helper.ts',
					changedMethods: [],
					isNewFile: false,
					isDeletedFile: false,
					parseTimeMs: 0,
				},
			];

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['services/api-helper.ts'], { diffs });

			// Empty changedMethods = conservative, still traces
			expect(result.affectedTests).toContain('tests/api.spec.ts');
		});
	});

	describe('Method-Level Resolution', () => {
		function createMethodUsageIndex(
			methods: Record<string, Array<{ testFile: string }>>,
		): MethodUsageIndex {
			const index: MethodUsageIndex = {
				methods: {},
				fixtureMapping: {},
				timestamp: new Date().toISOString(),
				testFilesAnalyzed: 0,
			};

			for (const [key, usages] of Object.entries(methods)) {
				index.methods[key] = usages.map((u) => ({
					testFile: u.testFile,
					line: 1,
					column: 1,
					fullCall: `${key}()`,
				}));
			}

			return index;
		}

		it('returns 0 affected tests for removed unused method', () => {
			const diffs: FileDiffResult[] = [
				{
					filePath: '/test-root/pages/SomePage.ts',
					changedMethods: [
						{ className: 'SomePage', methodName: 'unusedMethod', changeType: 'removed' },
					],
					isNewFile: false,
					isDeletedFile: false,
					parseTimeMs: 0,
				},
			];

			const methodIndex = createMethodUsageIndex({});

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/SomePage.ts'], {
				diffs,
				methodUsageIndex: methodIndex,
			});

			expect(result.affectedTests).toEqual([]);
			expect(result.strategies['pages/SomePage.ts']).toBe('method-level');
		});

		it('returns exactly the tests using a modified method', () => {
			const diffs: FileDiffResult[] = [
				{
					filePath: '/test-root/pages/CanvasPage.ts',
					changedMethods: [
						{ className: 'CanvasPage', methodName: 'addNode', changeType: 'modified' },
					],
					isNewFile: false,
					isDeletedFile: false,
					parseTimeMs: 0,
				},
			];

			const methodIndex = createMethodUsageIndex({
				'CanvasPage.addNode': [
					{ testFile: 'tests/canvas-crud.spec.ts' },
					{ testFile: 'tests/canvas-drag.spec.ts' },
				],
				'CanvasPage.deleteNode': [{ testFile: 'tests/canvas-delete.spec.ts' }],
			});

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/CanvasPage.ts'], {
				diffs,
				methodUsageIndex: methodIndex,
			});

			expect(result.affectedTests).toEqual([
				'tests/canvas-crud.spec.ts',
				'tests/canvas-drag.spec.ts',
			]);
			expect(result.affectedFiles).toContain('tests/canvas-crud.spec.ts');
			expect(result.affectedFiles).toContain('tests/canvas-drag.spec.ts');
			expect(result.strategies['pages/CanvasPage.ts']).toBe('method-level');
		});

		it('only returns tests using modified methods when changes are mixed', () => {
			const diffs: FileDiffResult[] = [
				{
					filePath: '/test-root/pages/CanvasPage.ts',
					changedMethods: [
						{ className: 'CanvasPage', methodName: 'newMethod', changeType: 'added' },
						{ className: 'CanvasPage', methodName: 'addNode', changeType: 'modified' },
					],
					isNewFile: false,
					isDeletedFile: false,
					parseTimeMs: 0,
				},
			];

			const methodIndex = createMethodUsageIndex({
				'CanvasPage.addNode': [{ testFile: 'tests/canvas.spec.ts' }],
				'CanvasPage.deleteNode': [{ testFile: 'tests/canvas-delete.spec.ts' }],
			});

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/CanvasPage.ts'], {
				diffs,
				methodUsageIndex: methodIndex,
			});

			expect(result.affectedTests).toEqual(['tests/canvas.spec.ts']);
			expect(result.strategies['pages/CanvasPage.ts']).toBe('method-level');
		});

		it('includes changed test file alongside method-level results', () => {
			const diffs: FileDiffResult[] = [
				{
					filePath: '/test-root/pages/CanvasPage.ts',
					changedMethods: [
						{ className: 'CanvasPage', methodName: 'addNode', changeType: 'modified' },
					],
					isNewFile: false,
					isDeletedFile: false,
					parseTimeMs: 0,
				},
			];

			const methodIndex = createMethodUsageIndex({
				'CanvasPage.addNode': [{ testFile: 'tests/canvas.spec.ts' }],
			});

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/CanvasPage.ts', 'tests/other.spec.ts'], {
				diffs,
				methodUsageIndex: methodIndex,
			});

			expect(result.affectedTests).toContain('tests/canvas.spec.ts');
			expect(result.affectedTests).toContain('tests/other.spec.ts');
		});

		it('skips new files (cannot break existing tests)', () => {
			const diffs: FileDiffResult[] = [
				{
					filePath: '/test-root/pages/BrandNewPage.ts',
					changedMethods: [
						{ className: 'BrandNewPage', methodName: 'doThing', changeType: 'added' },
					],
					isNewFile: true,
					isDeletedFile: false,
					parseTimeMs: 0,
				},
			];

			const methodIndex = createMethodUsageIndex({});

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/BrandNewPage.ts'], {
				diffs,
				methodUsageIndex: methodIndex,
			});

			expect(result.affectedTests).toEqual([]);
			expect(result.strategies['pages/BrandNewPage.ts']).toBe('skipped');
		});

		it('unions affected tests from multiple files with different strategies', () => {
			const diffs: FileDiffResult[] = [
				{
					filePath: '/test-root/pages/CanvasPage.ts',
					changedMethods: [
						{ className: 'CanvasPage', methodName: 'addNode', changeType: 'modified' },
					],
					isNewFile: false,
					isDeletedFile: false,
					parseTimeMs: 0,
				},
				{
					filePath: '/test-root/pages/NewPage.ts',
					changedMethods: [{ className: 'NewPage', methodName: 'newMethod', changeType: 'added' }],
					isNewFile: false,
					isDeletedFile: false,
					parseTimeMs: 0,
				},
			];

			const methodIndex = createMethodUsageIndex({
				'CanvasPage.addNode': [{ testFile: 'tests/canvas.spec.ts' }],
			});

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(
				['pages/CanvasPage.ts', 'pages/NewPage.ts', 'tests/direct.spec.ts'],
				{ diffs, methodUsageIndex: methodIndex },
			);

			expect(result.affectedTests).toContain('tests/canvas.spec.ts');
			expect(result.affectedTests).toContain('tests/direct.spec.ts');
			expect(result.strategies['pages/CanvasPage.ts']).toBe('method-level');
			expect(result.strategies['pages/NewPage.ts']).toBe('skipped');
		});

		it('falls back to property-level for deleted files', () => {
			const diffs: FileDiffResult[] = [
				{
					filePath: '/test-root/pages/DeletedPage.ts',
					changedMethods: [],
					isNewFile: false,
					isDeletedFile: true,
					parseTimeMs: 0,
				},
			];

			const methodIndex = createMethodUsageIndex({});

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/DeletedPage.ts'], {
				diffs,
				methodUsageIndex: methodIndex,
			});

			expect(result.strategies['pages/DeletedPage.ts']).toBe('property-level');
		});

		it('includes changed test file that references a newly added method', () => {
			project.createSourceFile(
				'/test-root/tests/new-feature.spec.ts',
				`
test('uses new method', async ({ app }) => {
  await app.canvas.brandNewMethod();
});
`,
			);

			const diffs: FileDiffResult[] = [
				{
					filePath: '/test-root/pages/CanvasPage.ts',
					changedMethods: [
						{ className: 'CanvasPage', methodName: 'brandNewMethod', changeType: 'added' },
					],
					isNewFile: false,
					isDeletedFile: false,
					parseTimeMs: 0,
				},
			];

			const methodIndex = createMethodUsageIndex({});

			const analyzer = new ImpactAnalyzer(project);
			const result = analyzer.analyze(['pages/CanvasPage.ts', 'tests/new-feature.spec.ts'], {
				diffs,
				methodUsageIndex: methodIndex,
			});

			expect(result.affectedTests).toContain('tests/new-feature.spec.ts');
		});
	});

	describe('Regex Escaping', () => {
		function emptyMethodIndex(): MethodUsageIndex {
			return {
				methods: {},
				fixtureMapping: {},
				timestamp: new Date().toISOString(),
				testFilesAnalyzed: 0,
			};
		}

		it('does not throw on method names with regex metacharacters', () => {
			const diffs: FileDiffResult[] = [
				{
					filePath: '/test-root/pages/StorePage.ts',
					changedMethods: [
						{ className: 'StorePage', methodName: '$reset', changeType: 'added' },
						{ className: 'StorePage', methodName: '$patch', changeType: 'added' },
					],
					isNewFile: true,
					isDeletedFile: false,
					parseTimeMs: 0,
				},
			];

			const analyzer = new ImpactAnalyzer(project);

			expect(() =>
				analyzer.analyze(['pages/StorePage.ts'], {
					diffs,
					methodUsageIndex: emptyMethodIndex(),
				}),
			).not.toThrow();
		});

		it('matches method names containing $ when properly escaped', () => {
			project.createSourceFile(
				'/test-root/tests/pinia.spec.ts',
				`
test('uses pinia store', async ({ app }) => {
  await app.store.$reset();
});
`,
			);

			const diffs: FileDiffResult[] = [
				{
					filePath: '/test-root/pages/StorePage.ts',
					changedMethods: [{ className: 'StorePage', methodName: '$reset', changeType: 'added' }],
					isNewFile: false,
					isDeletedFile: false,
					parseTimeMs: 0,
				},
			];

			const analyzer = new ImpactAnalyzer(project);

			// tests/pinia.spec.ts is both a changed test file AND references .$reset()
			// Without escaping, $ would be treated as end-of-line anchor and fail to match
			const result = analyzer.analyze(['pages/StorePage.ts', 'tests/pinia.spec.ts'], {
				diffs,
				methodUsageIndex: emptyMethodIndex(),
			});

			expect(result.affectedTests).toContain('tests/pinia.spec.ts');
			expect(result.strategies['pages/StorePage.ts']).toBe('skipped');
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
