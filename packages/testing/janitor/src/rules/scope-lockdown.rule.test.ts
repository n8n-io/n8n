import { Project } from 'ts-morph';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ScopeLockdownRule } from './scope-lockdown.rule.js';
import { setConfig, resetConfig, defineConfig } from '../config.js';

describe('ScopeLockdownRule', () => {
	let project: Project;
	let rule: ScopeLockdownRule;

	beforeEach(() => {
		project = new Project({ useInMemoryFileSystem: true });
		rule = new ScopeLockdownRule();

		setConfig(
			defineConfig({
				rootDir: '/',
				excludeFromPages: ['BasePage.ts'],
			}),
		);
	});

	afterEach(() => {
		resetConfig();
	});

	it('detects unscoped locator calls when container exists', () => {
		const file = project.createSourceFile(
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

	it('allows properly scoped locators', () => {
		const file = project.createSourceFile(
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

	it('allows page-level methods like goto and waitForResponse', () => {
		const file = project.createSourceFile(
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

	it('skips component files', () => {
		const file = project.createSourceFile(
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

	it('skips BasePage.ts', () => {
		const file = project.createSourceFile(
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

	it('skips classes without container (standalone pages)', () => {
		const file = project.createSourceFile(
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
