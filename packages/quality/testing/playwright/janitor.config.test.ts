import {
	createDefaultRunner,
	NoPageInFlowRule,
	resetConfig,
	ScopeLockdownRule,
	setConfig,
} from '@n8n/playwright-janitor';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Project } from 'ts-morph';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import config from './janitor.config.mjs';

describe('Benchmark duplicate-logic configuration', () => {
	let rootDir: string;

	beforeEach(() => {
		rootDir = mkdtempSync(join(tmpdir(), 'janitor-benchmarks-'));
		setConfig({ ...config, rootDir });
	});

	afterEach(() => {
		resetConfig();
		rmSync(rootDir, { recursive: true, force: true });
	});

	function writeSpec(path: string, content: string) {
		const file = join(rootDir, path);
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, content);
	}

	function findings(rule: string) {
		const runner = createDefaultRunner();
		runner.enableOnly([rule]);
		return runner.run({ rootDir }).results.flatMap((result) => result.violations);
	}

	test.each(['benchmarks', 'benchmarks-local'])(
		'allows comparable workload profiles in %s and still checks their owners',
		(directory) => {
			for (const workers of [1, 2]) {
				writeSpec(
					`tests/infrastructure/${directory}/throughput/workers-${workers}.spec.ts`,
					`test('${workers} workers', async () => {
						const workload = await prepareWorkload({ workers: ${workers} });
						await workload.measure();
					});`,
				);
			}

			expect(findings('duplicate-logic')).toEqual([]);
			expect(findings('valid-owner-annotation').map(({ message }) => message)).toEqual([
				'Spec has no owner annotation',
				'Spec has no owner annotation',
			]);
		},
	);

	test('still reports copied test bodies outside the benchmark directories', () => {
		for (const name of ['first', 'second']) {
			writeSpec(
				`tests/e2e/workflows/${name}.spec.ts`,
				`test('${name}', async ({ n8n }) => {
					await n8n.start.fromBlankCanvas();
					await n8n.canvas.clickZoomToFitButton();
				});`,
			);
		}

		const violations = findings('duplicate-logic');
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('Duplicate test logic: "second"');
	});
});

describe('Composable browser orchestration configuration', () => {
	beforeEach(() => setConfig(config));
	afterEach(() => resetConfig());

	const analyze = (body: string) => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/composables/ExampleComposer.ts`,
			`export class ExampleComposer {\nasync setup() {\n${body}\n}\n}`,
		);
		return new NoPageInFlowRule().analyzeProject(project, [file]).map(({ line }) => line - 2);
	};

	test('allows browser orchestration', () => {
		expect(
			analyze(`await this.n8n.page.route('**/rest/example', async () => {});
				await this.n8n.page.unroute('**/rest/example');
				await this.n8n.page.waitForRequest('**/run');
				await this.n8n.page.waitForResponse('**/run');
				await this.n8n.page.waitForEvent('popup');
				await this.n8n.page.context().newPage();
				this.n8n.page.context().browser();`),
		).toEqual([]);
	});

	test('reports DOM access behind an allowed operation', () => {
		expect(
			analyze(`this.n8n.page.context().pages()[0].getByTestId('button').click();
				this.n8n.page.context().newPage().locator('button').click();
				await this.n8n.page.route('**/rest/example', async () => {
					await this.n8n.page.getByTestId('button').click();
				});`),
		).toEqual([1, 2, 4]);
	});
});

describe('AIAssistantPage scope configuration', () => {
	beforeEach(() => setConfig(config));
	afterEach(() => resetConfig());

	test('allows the external locators in AIAssistantPage', () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/AIAssistantPage.ts`,
			readFileSync(`${config.rootDir}/pages/AIAssistantPage.ts`, 'utf8'),
		);

		expect(new ScopeLockdownRule().analyzeProject(project, [file])).toEqual([]);
	});

	test.each([
		"this.page.getByTestId('ask-assistant-chat')",
		"this.page.getByTestId('send-message-button')",
		"this.page.getByTestId('close-chat-button')",
		"this.page.getByTestId('new-assistant-session-modal').getByRole('button')",
		"this.page.getByTestId('node-error-view-ask-assistant-button').locator('input')",
	])('reports an unscoped assistant control: %s', (locator) => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/AIAssistantPage.ts`,
			`export class AIAssistantPage {
				get container() { return this.page.getByTestId('ask-assistant-sidebar'); }
				getControl() { return ${locator}; }
			}`,
		);

		const violations = new ScopeLockdownRule().analyzeProject(project, [file]);
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('Unscoped locator');
	});

	test.each([
		{ fileName: 'OtherPage.ts', className: 'AIAssistantPage' },
		{ fileName: 'AIAssistantPage.ts', className: 'OtherPage' },
	])('keeps external locators scoped to $fileName:$className', ({ fileName, className }) => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/${fileName}`,
			readFileSync(`${config.rootDir}/pages/AIAssistantPage.ts`, 'utf8').replace(
				'export class AIAssistantPage',
				`export class ${className}`,
			),
		);

		const violations = new ScopeLockdownRule().analyzeProject(project, [file]);
		expect(violations).toHaveLength(5);
		expect(violations.every(({ message }) => message.includes('Unscoped locator'))).toBe(true);
	});
});

describe('InstanceAiPage scope configuration', () => {
	beforeEach(() => setConfig(config));
	afterEach(() => resetConfig());

	test('allows the external and relative locators in InstanceAiPage', () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/InstanceAiPage.ts`,
			readFileSync(`${config.rootDir}/pages/InstanceAiPage.ts`, 'utf8'),
		);

		expect(new ScopeLockdownRule().analyzeProject(project, [file])).toEqual([]);
	});

	test.each([
		{ fileName: 'InstanceAiPage.ts', className: 'InstanceAiPage', expectedViolations: 0 },
		{ fileName: 'OtherPage.ts', className: 'InstanceAiPage', expectedViolations: 1 },
		{ fileName: 'InstanceAiPage.ts', className: 'OtherPage', expectedViolations: 1 },
	])(
		'limits the sidebar entry exception to $fileName:$className',
		({ fileName, className, expectedViolations }) => {
			const project = new Project({ useInMemoryFileSystem: true });
			const file = project.createSourceFile(
				`${config.rootDir}/pages/${fileName}`,
				`export class ${className} {
				get container() { return this.page.getByTestId('instance-ai-container'); }
				getNewThreadButton() {
					return this.page.getByTestId('project-instance-ai-menu-item').getByRole('menuitem', { name: 'Assistant', exact: true });
				}
			}`,
			);

			expect(new ScopeLockdownRule().analyzeProject(project, [file])).toHaveLength(
				expectedViolations,
			);
		},
	);

	test.each([
		"this.page.getByTestId('instance-ai-send-button')",
		'this.page.getByText(text, { exact: false })',
		"this.page.getByRole('dialog')",
		"this.page.getByRole('menuitem', { name: 'Other action', exact: true }).click()",
		"this.page.getByTestId('instance-ai-thread-list').getByRole('button')",
		"this.page.getByRole('dialog').getByTestId('input-panel')",
		"this.page.getByTestId('tool-credential-picker-search').getByRole('textbox')",
		"this.page.getByTestId('project-instance-ai-menu-item')",
		"this.page.getByTestId('project-instance-ai-menu-item').getByRole('menuitem', { name: 'Other action', exact: true })",
		"this.page.getByTestId('other-menu-item').getByRole('menuitem', { name: 'Assistant', exact: true })",
		"this.page.getByTestId('project-instance-ai-menu-item').getByRole('menuitem', { name: 'Assistant', exact: true }).getByRole('button')",
	])('reports an unscoped Assistant control: %s', (locator) => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/InstanceAiPage.ts`,
			`export class InstanceAiPage {
				get container() { return this.page.getByTestId('instance-ai-container'); }
				getControl() { return ${locator}; }
			}`,
		);

		const violations = new ScopeLockdownRule().analyzeProject(project, [file]);
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('Unscoped locator');
	});

	test.each([
		{ fileName: 'OtherPage.ts', className: 'InstanceAiPage' },
		{ fileName: 'InstanceAiPage.ts', className: 'OtherPage' },
	])('keeps external locators scoped to $fileName:$className', ({ fileName, className }) => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/${fileName}`,
			readFileSync(`${config.rootDir}/pages/InstanceAiPage.ts`, 'utf8').replace(
				'export class InstanceAiPage',
				`export class ${className}`,
			),
		);

		const violations = new ScopeLockdownRule().analyzeProject(project, [file]);
		expect(violations).toHaveLength(10);
		expect(violations.every(({ message }) => message.includes('Unscoped locator'))).toBe(true);
	});
});

describe('NodeDetailsViewPage scope configuration', () => {
	beforeEach(() => setConfig(config));
	afterEach(() => resetConfig());

	test('allows the fullscreen dialog and its relative filter in NodeDetailsViewPage', () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/NodeDetailsViewPage.ts`,
			readFileSync(`${config.rootDir}/pages/NodeDetailsViewPage.ts`, 'utf8'),
		);

		expect(new ScopeLockdownRule().analyzeProject(project, [file])).toEqual([]);
	});

	test('allows the exact fullscreen editor locator outside a has filter', () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/NodeDetailsViewPage.ts`,
			`export class NodeDetailsViewPage {
				get container() { return this.page.getByTestId('ndv'); }
				getControl() { return this.page.getByTestId('code-editor-fullscreen'); }
			}`,
		);

		expect(new ScopeLockdownRule().analyzeProject(project, [file])).toEqual([]);
	});

	test.each([
		'this.page.getByText(text)',
		"this.page.getByRole('dialog')",
		"this.page.getByTestId('code-editor-fullscreen').locator('input')",
	])('reports an unscoped NDV control: %s', (locator) => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/NodeDetailsViewPage.ts`,
			`export class NodeDetailsViewPage {
				get container() { return this.page.getByTestId('ndv'); }
				getControl() { return ${locator}; }
			}`,
		);

		const violations = new ScopeLockdownRule().analyzeProject(project, [file]);
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('Unscoped locator');
	});

	test('reports the dialog and its has locator for a different editor', () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/NodeDetailsViewPage.ts`,
			`export class NodeDetailsViewPage {
				get container() { return this.page.getByTestId('ndv'); }
				getCodeEditorDialog() {
					return this.page.getByRole('dialog').filter({
						has: this.page.getByTestId('other-editor'),
					});
				}
			}`,
		);

		const violations = new ScopeLockdownRule().analyzeProject(project, [file]);
		expect(violations).toHaveLength(2);
		expect(violations.every(({ message }) => message.includes('Unscoped locator'))).toBe(true);
	});

	test.each([
		{ fileName: 'OtherPage.ts', className: 'NodeDetailsViewPage' },
		{ fileName: 'NodeDetailsViewPage.ts', className: 'OtherPage' },
	])('keeps fullscreen locators scoped to $fileName:$className', ({ fileName, className }) => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/${fileName}`,
			`export class ${className} {
				get container() { return this.page.getByTestId('ndv'); }
				getCodeEditorDialog() {
					return this.page.getByRole('dialog').filter({
						has: this.page.getByTestId('code-editor-fullscreen'),
					});
				}
			}`,
		);

		const violations = new ScopeLockdownRule().analyzeProject(project, [file]);
		expect(violations).toHaveLength(2);
		expect(violations.every(({ message }) => message.includes('Unscoped locator'))).toBe(true);
	});
});

describe('SidebarPage scope configuration', () => {
	beforeEach(() => setConfig(config));
	afterEach(() => resetConfig());

	test('allows the external locators in SidebarPage', () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/SidebarPage.ts`,
			readFileSync(`${config.rootDir}/pages/SidebarPage.ts`, 'utf8'),
		);

		expect(new ScopeLockdownRule().analyzeProject(project, [file])).toEqual([]);
	});

	test.each([
		"this.page.getByTestId('universal-add')",
		"this.page.getByTestId('main-sidebar-account-trigger')",
		"this.page.getByTestId('main-sidebar-source-control-push')",
		"this.page.getByRole('link', { name: 'Settings' }).click()",
		"this.page.getByRole('tab', { name: 'Workflows' }).click()",
		"this.page.getByTestId('other-tabs').getByRole('tab', { name: 'Workflows' }).click()",
		"this.page.getByTestId('project-tabs').getByRole('tab', { name: 'Settings' }).click()",
		"this.page.getByTestId('about-modal').getByRole('button')",
		"this.page.locator('body').getByTestId('universal-add')",
	])('reports an unscoped sidebar control: %s', (locator) => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/SidebarPage.ts`,
			`export class SidebarPage {
				get container() { return this.page.locator('#side-menu'); }
				getControl() { return ${locator}; }
			}`,
		);

		const violations = new ScopeLockdownRule().analyzeProject(project, [file]);
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('Unscoped locator');
	});

	test.each([
		{ fileName: 'OtherPage.ts', className: 'SidebarPage' },
		{ fileName: 'SidebarPage.ts', className: 'OtherPage' },
	])('keeps external locators scoped to $fileName:$className', ({ fileName, className }) => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/${fileName}`,
			`export class ${className} {
				get container() { return this.page.locator('#side-menu'); }
				getAboutModal() { return this.page.getByTestId('about-modal'); }
			}`,
		);

		const violations = new ScopeLockdownRule().analyzeProject(project, [file]);
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('Unscoped locator');
	});
});
