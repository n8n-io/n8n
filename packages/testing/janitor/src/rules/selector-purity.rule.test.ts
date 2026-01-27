import { Project } from 'ts-morph';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { SelectorPurityRule } from './selector-purity.rule.js';
import { setConfig, resetConfig, defineConfig } from '../config.js';

describe('SelectorPurityRule', () => {
	let project: Project;
	let rule: SelectorPurityRule;

	beforeEach(() => {
		project = new Project({ useInMemoryFileSystem: true });
		rule = new SelectorPurityRule();

		setConfig(
			defineConfig({
				rootDir: '/',
				fixtureObjectName: 'n8n',
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

	it('detects direct n8n.page.getByTestId in composable', () => {
		const file = project.createSourceFile(
			'/composables/TestComposer.ts',
			`
export class TestComposer {
  constructor(private n8n: n8nPage) {}

  async doSomething() {
    await this.n8n.page.getByTestId('something').click();
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations.length).toBeGreaterThan(0);
	});

	it('allows page object method calls', () => {
		const file = project.createSourceFile(
			'/composables/TestComposer.ts',
			`
export class TestComposer {
  constructor(private n8n: n8nPage) {}

  async doSomething() {
    await this.n8n.canvas.openNode('Code');
    await this.n8n.ndv.close();
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	it('allows page.keyboard and page.evaluate', () => {
		const file = project.createSourceFile(
			'/composables/TestComposer.ts',
			`
export class TestComposer {
  constructor(private n8n: n8nPage) {}

  async doSomething() {
    await this.n8n.page.keyboard.press('Enter');
    await this.n8n.page.evaluate(() => console.log('test'));
    await this.n8n.page.reload();
    await this.n8n.page.waitForLoadState();
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	it('detects direct page.getByTestId in test files', () => {
		const file = project.createSourceFile(
			'/tests/e2e/my-test.spec.ts',
			`
test('my test', async ({ n8n }) => {
  await n8n.page.getByTestId('something').click();
});
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations.length).toBeGreaterThan(0);
	});

	it('detects various locator methods', () => {
		const file = project.createSourceFile(
			'/composables/TestComposer.ts',
			`
export class TestComposer {
  constructor(private n8n: n8nPage) {}

  async doSomething() {
    await this.n8n.page.locator('.class').click();
    await this.n8n.page.getByRole('button').click();
    await this.n8n.page.getByText('text').click();
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations.length).toBeGreaterThanOrEqual(3);
	});
});
