import { Project } from 'ts-morph';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { NoPageInFlowRule } from './no-page-in-flow.rule.js';
import { setConfig, resetConfig, defineConfig } from '../config.js';

describe('NoPageInFlowRule', () => {
	let project: Project;
	let rule: NoPageInFlowRule;

	beforeEach(() => {
		project = new Project({ useInMemoryFileSystem: true });
		rule = new NoPageInFlowRule();

		setConfig(
			defineConfig({
				rootDir: '/',
				fixtureObjectName: 'n8n',
				flowLayerName: 'Composable',
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
			}),
		);
	});

	afterEach(() => {
		resetConfig();
	});

	it('allows page object usage', () => {
		const file = project.createSourceFile(
			'/composables/WorkflowComposer.ts',
			`
export class WorkflowComposer {
	constructor(private n8n: any) {}

	async createWorkflow() {
		await this.n8n.canvas.openNewWorkflow();
		await this.n8n.ndv.setName('Test');
	}
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	it('detects direct page.getByTestId access', () => {
		const file = project.createSourceFile(
			'/composables/WorkflowComposer.ts',
			`
export class WorkflowComposer {
	constructor(private n8n: any) {}

	async clickButton() {
		await this.n8n.page.getByTestId('button').click();
	}
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('page.getByTestId');
	});

	it('detects page.locator access', () => {
		const file = project.createSourceFile(
			'/composables/WorkflowComposer.ts',
			`
export class WorkflowComposer {
	constructor(private n8n: any) {}

	async findElement() {
		return this.n8n.page.locator('.my-class');
	}
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
	});

	it('detects page.goto access', () => {
		const file = project.createSourceFile(
			'/composables/WorkflowComposer.ts',
			`
export class WorkflowComposer {
	constructor(private n8n: any) {}

	async navigate() {
		await this.n8n.page.goto('/workflows');
	}
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].suggestion).toContain('navigation');
	});

	it('detects multiple direct page accesses', () => {
		const file = project.createSourceFile(
			'/composables/WorkflowComposer.ts',
			`
export class WorkflowComposer {
	constructor(private n8n: any) {}

	async doStuff() {
		await this.n8n.page.getByTestId('a').click();
		await this.n8n.page.locator('.b').fill('text');
		await this.n8n.page.getByRole('button').click();
	}
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(3);
	});

	it('reports correct line numbers', () => {
		const file = project.createSourceFile(
			'/composables/WorkflowComposer.ts',
			`export class WorkflowComposer {
	constructor(private n8n: any) {}

	async method() {
		// line 5
		await this.n8n.page.getByTestId('x').click(); // line 6
	}
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].line).toBe(6);
	});

	it('provides context-specific suggestions', () => {
		const file = project.createSourceFile(
			'/composables/WorkflowComposer.ts',
			`
export class WorkflowComposer {
	constructor(private n8n: any) {}

	async method() {
		await this.n8n.page.getByTestId('x').click();
	}
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].suggestion).toBeDefined();
		expect(violations[0].suggestion).toContain('page object');
	});
});
