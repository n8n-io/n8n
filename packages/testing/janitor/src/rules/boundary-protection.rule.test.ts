import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Project } from 'ts-morph';
import { BoundaryProtectionRule } from './boundary-protection.rule.js';
import { setConfig, resetConfig, defineConfig } from '../config.js';

describe('BoundaryProtectionRule', () => {
	let project: Project;
	let rule: BoundaryProtectionRule;

	beforeEach(() => {
		project = new Project({ useInMemoryFileSystem: true });
		rule = new BoundaryProtectionRule();

		// Set up minimal config for tests
		setConfig(
			defineConfig({
				rootDir: '/',
				patterns: {
					pages: ['pages/**/*.ts'],
					components: ['pages/components/**/*.ts'],
					flows: ['composables/**/*.ts'],
					tests: ['tests/**/*.spec.ts'],
					services: ['services/**/*.ts'],
					fixtures: ['fixtures/**/*.ts'],
					helpers: ['helpers/**/*.ts'],
					factories: ['factories/**/*.ts'],
					testData: [],
				},
				excludeFromPages: ['BasePage.ts'],
			}),
		);
	});

	afterEach(() => {
		resetConfig();
	});

	it('should allow imports from components', () => {
		const file = project.createSourceFile(
			'/pages/CanvasPage.ts',
			`
import { NodePanel } from './components/NodePanel';

export class CanvasPage {
  readonly nodePanel = new NodePanel();
}
`,
		);

		const violations = rule.analyze(project, [file]);
		expect(violations).toHaveLength(0);
	});

	it('should flag direct page imports', () => {
		const file = project.createSourceFile(
			'/pages/CanvasPage.ts',
			`
import { WorkflowPage } from './WorkflowPage';

export class CanvasPage {
  readonly workflows = new WorkflowPage();
}
`,
		);

		// Also create the imported file so ts-morph can resolve it
		project.createSourceFile(
			'/pages/WorkflowPage.ts',
			`
export class WorkflowPage {}
`,
		);

		const violations = rule.analyze(project, [file]);
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('imports another page');
		expect(violations[0].rule).toBe('boundary-protection');
	});

	it('should allow imports from base classes', () => {
		const file = project.createSourceFile(
			'/pages/CanvasPage.ts',
			`
import { BasePage } from './BasePage';

export class CanvasPage extends BasePage {
}
`,
		);

		const violations = rule.analyze(project, [file]);
		expect(violations).toHaveLength(0);
	});

	it('should skip excluded files', () => {
		const file = project.createSourceFile(
			'/pages/BasePage.ts',
			`
import { SomePage } from './SomePage';

export class BasePage {
}
`,
		);

		const violations = rule.analyze(project, [file]);
		expect(violations).toHaveLength(0);
	});

	it('should allow external package imports', () => {
		const file = project.createSourceFile(
			'/pages/CanvasPage.ts',
			`
import { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class CanvasPage {
  constructor(private page: Page) {}
}
`,
		);

		const violations = rule.analyze(project, [file]);
		expect(violations).toHaveLength(0);
	});
});
