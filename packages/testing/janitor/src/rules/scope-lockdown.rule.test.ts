import { describe } from 'vitest';

import { ScopeLockdownRule } from './scope-lockdown.rule.js';
import { test, expect } from '../test/fixtures.js';

describe('ScopeLockdownRule', () => {
	const rule = new ScopeLockdownRule();

	test('detects unscoped locator calls when container exists', ({ project, createFile }) => {
		const file = createFile(
			'/pages/TestPage.ts',
			`
export class TestPage {
  get container() {
    return this.page.getByTestId('root');
  }

  getSomething() {
    return this.page.getByTestId('x');
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		const unscopedCall = violations.find((v) => v.message.includes('Unscoped locator'));
		expect(unscopedCall).toBeDefined();
	});

	test('allows properly scoped locators', ({ project, createFile }) => {
		const file = createFile(
			'/pages/TestPage.ts',
			`
export class TestPage {
  get container() {
    return this.page.getByTestId('root');
  }

  getSomething() {
    return this.container.getByTestId('x');
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('allows page-level methods like goto and waitForResponse', ({ project, createFile }) => {
		const file = createFile(
			'/pages/TestPage.ts',
			`
export class TestPage {
  get container() {
    return this.page.getByTestId('root');
  }

  async navigate() {
    await this.page.goto('/test');
    await this.page.waitForResponse('/api/test');
    await this.page.reload();
    await this.page.keyboard.press('Enter');
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('skips component files', ({ project, createFile }) => {
		const file = createFile(
			'/pages/components/TestComponent.ts',
			`
export class TestComponent {
  constructor(private root: Locator) {}

  getSomething() {
    return this.root.getByTestId('x');
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('skips BasePage.ts', ({ project, createFile }) => {
		const file = createFile(
			'/pages/BasePage.ts',
			`
export class BasePage {
  protected clickByTestId(testId: string) {
    return this.page.getByTestId(testId).click();
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('skips classes without container (standalone pages)', ({ project, createFile }) => {
		const file = createFile(
			'/pages/LoginPage.ts',
			`
export class LoginPage {
  async login() {
    await this.page.getByTestId('email').fill('test@test.com');
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		// No container = standalone page, no violations
		expect(violations).toHaveLength(0);
	});
});
