import { describe } from 'vitest';

import { ScopeLockdownRule } from './scope-lockdown.rule.js';
import { getConfig, setConfig } from '../config.js';
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

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('Unscoped locator');
	});

	test('reports one violation for a chained page locator', ({ project, createFile }) => {
		const file = createFile(
			'/pages/TestPage.ts',
			`
export class TestPage {
  get container() {
    return this.page.getByTestId('root');
  }

  getSomething() {
    return this.page.getByTestId('x').locator('button').first();
  }
}
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].line).toBe(8);
	});

	test('reports separate unscoped locator sites', ({ project, createFile }) => {
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

  getSomethingElse() {
    return this.page.getByRole('button');
  }
}
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(2);
		expect(violations.map(({ line }) => line)).toEqual([8, 12]);
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

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('allows an exact external locator chain and still reports other page locators', ({
		project,
		createFile,
	}) => {
		const config = getConfig();
		setConfig({
			...config,
			rules: {
				...config.rules,
				'scope-lockdown': {
					allowPatterns: [
						/^pages\/SettingsModal\.ts:SettingsModal: this\.page\.getByTestId\('settings-save'\)\.getByRole\('button'\)$/,
					],
				},
			},
		});
		const source = `
export class SettingsModal {
  get container() { return this.page.getByTestId('settings-content'); }
  getSaveButton() {
    return this.page.getByTestId('settings-save').getByRole('button');
  }
  getInput() {
    return this.page.getByRole('textbox');
  }
  getOtherButton() {
    return this.page.getByTestId('other-button').getByRole('button');
  }
}
`;
		const file = createFile('/pages/SettingsModal.ts', source);
		const violations = rule.analyzeProject(project, [file]);
		expect(violations.map(({ line }) => line)).toEqual([8, 11]);

		// The same selector in another file or class must still use its container.
		const otherFile = createFile('/pages/OtherModal.ts', source);
		expect(rule.analyzeProject(project, [otherFile])).toHaveLength(3);
		file.getClassOrThrow('SettingsModal').rename('OtherModal');
		expect(rule.analyzeProject(project, [file])).toHaveLength(3);
	});

	test.for([
		{
			name: 'single-call',
			pattern:
				/^pages\/SettingsModal\.ts:SettingsModal: this\.page\.getByTestId\('settings-save'\)$/,
			locator: "this.page.getByTestId('settings-save')",
		},
		{
			name: 'chained',
			pattern:
				/^pages\/SettingsModal\.ts:SettingsModal: this\.page\.getByTestId\('settings-save'\)\.getByRole\('button'\)$/,
			locator: "this.page.getByTestId('settings-save').getByRole('button')",
		},
	])(
		'requires the full $name locator to match an exception',
		({ pattern, locator }, { project, createFile }) => {
			const config = getConfig();
			setConfig({
				...config,
				rules: {
					...config.rules,
					'scope-lockdown': { allowPatterns: [pattern] },
				},
			});
			const file = createFile(
				'/pages/SettingsModal.ts',
				`export class SettingsModal {
  get container() { return this.page.getByTestId('settings-content'); }
  getSaveButton() {
    return ${locator};
  }
  getInput() {
    return ${locator}.locator('input');
  }
}`,
			);

			const violations = rule.analyzeProject(project, [file]);
			expect(violations).toHaveLength(1);
			expect(violations[0].line).toBe(7);
			expect(violations[0].message).toContain('Unscoped locator');
		},
	);

	test('checks page locators inside arguments of an allowed chain', ({ project, createFile }) => {
		const config = getConfig();
		setConfig({
			...config,
			rules: {
				...config.rules,
				'scope-lockdown': {
					allowPatterns: [
						/^pages\/SettingsModal\.ts:SettingsModal: this\.page\.getByRole\('listbox'\)\.filter\(\{ has: this\.page\.getByRole\('option'\) \}\)$/,
					],
				},
			},
		});
		const file = createFile(
			'/pages/SettingsModal.ts',
			`export class SettingsModal {
  get container() { return this.page.getByTestId('settings-content'); }
  getList() {
    return this.page.getByRole('listbox').filter({ has: this.page.getByRole('option') });
  }
}`,
		);

		const violations = rule.analyzeProject(project, [file]);
		expect(violations).toHaveLength(1);
		expect(violations[0].column).toBe(56);
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

		const violations = rule.analyzeProject(project, [file]);

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

		const violations = rule.analyzeProject(project, [file]);

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

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('allows standalone pages with navigation method', ({ project, createFile }) => {
		const file = createFile(
			'/pages/LoginPage.ts',
			`
export class LoginPage {
  async goto() {
    await this.page.goto('/login');
  }

  async login() {
    await this.page.getByTestId('email').fill('test@test.com');
  }
}
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		// Has navigation method = explicit standalone page, no violations
		expect(violations).toHaveLength(0);
	});

	test('detects ambiguous pages without container or navigation method', ({
		project,
		createFile,
	}) => {
		const file = createFile(
			'/pages/AmbiguousPage.ts',
			`
export class AmbiguousPage {
  async doSomething() {
    await this.page.getByTestId('email').fill('test@test.com');
  }
}
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		// No container AND no navigation method = ambiguous
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('Ambiguous page');
	});

	test('allows custom navigation method names from config', ({ project, createFile }) => {
		const file = createFile(
			'/pages/SettingsPage.ts',
			`
export class SettingsPage {
  async navigate() {
    await this.page.goto('/settings');
  }

  async toggleOption() {
    await this.page.getByTestId('toggle').click();
  }
}
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		// 'navigate' is in default config, so this should pass
		expect(violations).toHaveLength(0);
	});
});
