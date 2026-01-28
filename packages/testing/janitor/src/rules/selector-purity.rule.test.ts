import { describe } from 'vitest';

import { SelectorPurityRule } from './selector-purity.rule.js';
import { test, expect } from '../test/fixtures.js';

describe('SelectorPurityRule', () => {
	const rule = new SelectorPurityRule();

	test('detects direct n8n.page.getByTestId in composable', ({ project, createFile }) => {
		const file = createFile(
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

	test('allows page object method calls', ({ project, createFile }) => {
		const file = createFile(
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

	test('allows page.keyboard and page.evaluate', ({ project, createFile }) => {
		const file = createFile(
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

	test('detects direct page.getByTestId in test files', ({ project, createFile }) => {
		const file = createFile(
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

	test('detects various locator methods', ({ project, createFile }) => {
		const file = createFile(
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
