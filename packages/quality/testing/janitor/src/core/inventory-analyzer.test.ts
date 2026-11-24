import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Project } from 'ts-morph';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
	InventoryAnalyzer,
	formatInventoryJSON,
	toSummary,
	toCategory,
	filterByFile,
} from './inventory-analyzer.js';
import { setConfig, resetConfig, defineConfig } from '../config.js';

/**
 * Create a project with the given files written to disk
 */
function createTestProject(tempDir: string, files: Record<string, string>): Project {
	// Write files to disk
	for (const [filePath, content] of Object.entries(files)) {
		const fullPath = path.join(tempDir, filePath);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, content);
	}

	// Create project
	return new Project({
		tsConfigFilePath: path.join(tempDir, 'tsconfig.json'),
		skipAddingFilesFromTsConfig: false,
	});
}

describe('InventoryAnalyzer', () => {
	let tempDir: string;

	beforeEach(() => {
		// Use realpathSync to avoid macOS /var -> /private/var symlink issues
		tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'inventory-test-')));

		// Create directory structure
		fs.mkdirSync(path.join(tempDir, 'pages', 'components'), { recursive: true });
		fs.mkdirSync(path.join(tempDir, 'composables'), { recursive: true });
		fs.mkdirSync(path.join(tempDir, 'tests', 'e2e'), { recursive: true });
		fs.mkdirSync(path.join(tempDir, 'services'), { recursive: true });
		fs.mkdirSync(path.join(tempDir, 'workflows'), { recursive: true });

		// Create tsconfig.json
		fs.writeFileSync(
			path.join(tempDir, 'tsconfig.json'),
			JSON.stringify({
				compilerOptions: {
					target: 'ES2020',
					module: 'ESNext',
					moduleResolution: 'node',
					strict: true,
				},
				include: ['**/*.ts'],
			}),
		);

		// Set up config
		const config = defineConfig({
			rootDir: tempDir,
			patterns: {
				pages: ['pages/**/*.ts'],
				components: ['pages/components/**/*.ts'],
				flows: ['composables/**/*.ts'],
				tests: ['tests/**/*.spec.ts'],
				services: ['services/**/*.ts'],
				fixtures: ['fixtures/**/*.ts'],
				helpers: ['helpers/**/*.ts'],
				factories: ['factories/**/*.ts'],
				testData: ['workflows/**/*'],
			},
			excludeFromPages: ['BasePage.ts', 'AppPage.ts'],
			facade: {
				file: 'pages/AppPage.ts',
				className: 'AppPage',
				excludeTypes: ['Page'],
			},
			fixtureObjectName: 'app',
		});
		setConfig(config);
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
		resetConfig();
	});

	describe('Page Detection', () => {
		it('detects page classes', () => {
			const project = createTestProject(tempDir, {
				'pages/WorkflowPage.ts': `
					export class WorkflowPage {
						async openWorkflow(name: string) {}
						async saveWorkflow() {}
					}
				`,
			});

			const analyzer = new InventoryAnalyzer(project);
			const report = analyzer.generate();

			expect(report.pages.length).toBe(1);
			expect(report.pages[0].name).toBe('WorkflowPage');
			expect(report.pages[0].methods.length).toBe(2);
		});

		it('extracts method parameters', () => {
			const project = createTestProject(tempDir, {
				'pages/CanvasPage.ts': `
					export class CanvasPage {
						async addNode(type: string, position?: { x: number; y: number }) {}
					}
				`,
			});

			const analyzer = new InventoryAnalyzer(project);
			const report = analyzer.generate();

			const method = report.pages[0].methods[0];
			expect(method.name).toBe('addNode');
			expect(method.params.length).toBe(2);
			expect(method.params[0].name).toBe('type');
			expect(method.params[0].type).toBe('string');
		});

		it('excludes configured files from pages', () => {
			const project = createTestProject(tempDir, {
				'pages/BasePage.ts': 'export class BasePage {}',
				'pages/AppPage.ts': 'export class AppPage {}',
				'pages/RealPage.ts': 'export class RealPage {}',
			});

			const analyzer = new InventoryAnalyzer(project);
			const report = analyzer.generate();

			expect(report.pages.length).toBe(1);
			expect(report.pages[0].name).toBe('RealPage');
		});
	});

	describe('Component Detection', () => {
		it('detects component classes', () => {
			const project = createTestProject(tempDir, {
				'pages/components/NodePanel.ts': `
					export class NodePanel {
						async selectNode(name: string) {}
					}
				`,
			});

			const analyzer = new InventoryAnalyzer(project);
			const report = analyzer.generate();

			expect(report.components.length).toBe(1);
			expect(report.components[0].name).toBe('NodePanel');
		});
	});

	describe('Composable Detection', () => {
		it('detects composable classes', () => {
			const project = createTestProject(tempDir, {
				'composables/WorkflowComposer.ts': `
					export class WorkflowComposer {
						async createAndRun(name: string) {}
					}
				`,
			});

			const analyzer = new InventoryAnalyzer(project);
			const report = analyzer.generate();

			expect(report.composables.length).toBe(1);
			expect(report.composables[0].name).toBe('WorkflowComposer');
		});
	});

	describe('Service Detection', () => {
		it('detects service classes', () => {
			const project = createTestProject(tempDir, {
				'services/ApiHelper.ts': `
					export class ApiHelper {
						async createWorkflow(data: object) {}
						async deleteWorkflow(id: string) {}
					}
				`,
			});

			const analyzer = new InventoryAnalyzer(project);
			const report = analyzer.generate();

			expect(report.services.length).toBe(1);
			expect(report.services[0].name).toBe('ApiHelper');
			expect(report.services[0].methods.length).toBe(2);
		});
	});

	describe('Test Data Detection', () => {
		it('detects workflow files', () => {
			fs.writeFileSync(
				path.join(tempDir, 'workflows', 'simple-webhook.json'),
				JSON.stringify({ name: 'Simple Webhook' }),
			);
			fs.writeFileSync(
				path.join(tempDir, 'workflows', 'complex-flow.json'),
				JSON.stringify({ name: 'Complex Flow' }),
			);

			const project = new Project({ useInMemoryFileSystem: true });
			const analyzer = new InventoryAnalyzer(project);
			const report = analyzer.generate();

			expect(report.testData.length).toBe(2);
		});
	});

	describe('Summary', () => {
		it('calculates correct counts', () => {
			const project = createTestProject(tempDir, {
				'pages/PageA.ts': 'export class PageA { method1() {} method2() {} }',
				'pages/PageB.ts': 'export class PageB { method1() {} }',
				'pages/components/CompA.ts': 'export class CompA { method1() {} }',
				'composables/FlowA.ts': 'export class FlowA { method1() {} }',
				'services/ServiceA.ts': 'export class ServiceA { method1() {} }',
			});

			const analyzer = new InventoryAnalyzer(project);
			const report = analyzer.generate();

			expect(report.summary.pages).toBe(2);
			expect(report.summary.components).toBe(1);
			expect(report.summary.composables).toBe(1);
			expect(report.summary.services).toBe(1);
		});
	});

	describe('JSON Output', () => {
		it('produces valid JSON', () => {
			const project = createTestProject(tempDir, {
				'pages/TestPage.ts': 'export class TestPage { doSomething() {} }',
			});

			const analyzer = new InventoryAnalyzer(project);
			const report = analyzer.generate();
			const json = formatInventoryJSON(report);

			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			expect(() => JSON.parse(json) as unknown).not.toThrow();
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const parsed = JSON.parse(json) as { pages?: unknown; summary?: unknown };
			expect(parsed.pages).toBeDefined();
			expect(parsed.summary).toBeDefined();
		});
	});

	describe('toSummary', () => {
		it('produces compact output with counts and categories', () => {
			const project = createTestProject(tempDir, {
				'pages/PageA.ts': 'export class PageA { method1() {} }',
				'pages/PageB.ts': 'export class PageB { method1() {} }',
				'composables/FlowA.ts': 'export class FlowA { method1() {} }',
			});

			const analyzer = new InventoryAnalyzer(project);
			const report = analyzer.generate();
			const summary = toSummary(report);

			expect(summary.counts.pages).toBe(2);
			expect(summary.counts.composables).toBe(1);
			expect(summary.categories).toContain('pages');
			expect(summary.categories).toContain('composables');
		});

		it('includes facade property names when facade exists', () => {
			const project = createTestProject(tempDir, {
				'pages/AppPage.ts': `
					import { CanvasPage } from './CanvasPage';
					export class AppPage {
						canvas = new CanvasPage();
						settings = new SettingsPage();
					}
				`,
				'pages/CanvasPage.ts': 'export class CanvasPage {}',
				'pages/SettingsPage.ts': 'export class SettingsPage {}',
			});

			// Update config to use this facade
			const config = defineConfig({
				rootDir: tempDir,
				patterns: {
					pages: ['pages/**/*.ts'],
					components: ['pages/components/**/*.ts'],
					flows: ['composables/**/*.ts'],
					tests: ['tests/**/*.spec.ts'],
					services: ['services/**/*.ts'],
					fixtures: ['fixtures/**/*.ts'],
					helpers: ['helpers/**/*.ts'],
					factories: ['factories/**/*.ts'],
					testData: ['workflows/**/*'],
				},
				excludeFromPages: ['AppPage.ts'],
				facade: {
					file: 'pages/AppPage.ts',
					className: 'AppPage',
					excludeTypes: ['Page'],
				},
				fixtureObjectName: 'app',
			});
			setConfig(config);

			const analyzer = new InventoryAnalyzer(project);
			const report = analyzer.generate();
			const summary = toSummary(report);

			expect(summary.facade).toContain('canvas');
			expect(summary.facade).toContain('settings');
		});
	});

	describe('toCategory', () => {
		it('returns category items with method names only', () => {
			const project = createTestProject(tempDir, {
				'pages/CanvasPage.ts': `
					export class CanvasPage {
						async addNode(type: string) {}
						async deleteNode(id: string) {}
						private helperMethod() {}
					}
				`,
			});

			const analyzer = new InventoryAnalyzer(project);
			const report = analyzer.generate();
			const view = toCategory(report, 'pages');

			expect(view.category).toBe('pages');
			expect(view.items.length).toBe(1);
			expect(view.items[0].name).toBe('CanvasPage');
			expect(view.items[0].methods).toEqual(['addNode', 'deleteNode']);
		});

		it('handles testData category without methods', () => {
			fs.writeFileSync(
				path.join(tempDir, 'workflows', 'test-workflow.json'),
				JSON.stringify({ name: 'Test' }),
			);

			const project = new Project({ useInMemoryFileSystem: true });
			const analyzer = new InventoryAnalyzer(project);
			const report = analyzer.generate();
			const view = toCategory(report, 'testData');

			expect(view.category).toBe('testData');
			expect(view.items.length).toBe(1);
			expect(view.items[0].name).toBe('test-workflow.json');
			expect(view.items[0].methods).toBeUndefined();
		});
	});

	describe('filterByFile', () => {
		it('finds page by filename', () => {
			const project = createTestProject(tempDir, {
				'pages/CanvasPage.ts': `
					export class CanvasPage {
						async addNode(type: string) {}
					}
				`,
			});

			const analyzer = new InventoryAnalyzer(project);
			const report = analyzer.generate();
			const result = filterByFile(report, 'CanvasPage.ts');

			expect(result).not.toBeNull();
			expect(result?.name).toBe('CanvasPage');
			// Page objects have methods array
			expect((result as { methods?: unknown[] })?.methods?.length).toBe(1);
		});

		it('finds page by class name', () => {
			const project = createTestProject(tempDir, {
				'pages/CanvasPage.ts': 'export class CanvasPage { method1() {} }',
			});

			const analyzer = new InventoryAnalyzer(project);
			const report = analyzer.generate();
			const result = filterByFile(report, 'CanvasPage');

			expect(result).not.toBeNull();
			expect(result?.name).toBe('CanvasPage');
		});

		it('returns null for non-existent file', () => {
			const project = createTestProject(tempDir, {
				'pages/CanvasPage.ts': 'export class CanvasPage {}',
			});

			const analyzer = new InventoryAnalyzer(project);
			const report = analyzer.generate();
			const result = filterByFile(report, 'NonExistent.ts');

			expect(result).toBeNull();
		});

		it('finds composables', () => {
			const project = createTestProject(tempDir, {
				'composables/WorkflowComposer.ts': 'export class WorkflowComposer { create() {} }',
			});

			const analyzer = new InventoryAnalyzer(project);
			const report = analyzer.generate();
			const result = filterByFile(report, 'WorkflowComposer');

			expect(result).not.toBeNull();
			expect(result?.name).toBe('WorkflowComposer');
		});
	});
});
