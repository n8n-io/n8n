import { describe } from 'vitest';

import { PreferRoleSelectorsRule } from './prefer-role-selectors.rule.js';
import { setConfig, getConfig } from '../config.js';
import { test, expect } from '../test/fixtures.js';

describe('PreferRoleSelectorsRule', () => {
	const rule = new PreferRoleSelectorsRule();

	test('flags getByTestId in page objects', ({ project, createFile }) => {
		const file = createFile(
			'/pages/CanvasPage.ts',
			`
export class CanvasPage {
  get container() { return this.page.locator('.canvas'); }

  async clickSave() {
    await this.container.getByTestId('save-button').click();
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].rule).toBe('prefer-role-selectors');
		expect(violations[0].message).toContain('save-button');
		expect(violations[0].suggestion).toContain('save-button');
		expect(violations[0].suggestion).toContain('getByRole');
	});

	test('flags multiple getByTestId calls in same file', ({ project, createFile }) => {
		const file = createFile(
			'/pages/SettingsPage.ts',
			`
export class SettingsPage {
  async goto() { await this.page.goto('/settings'); }

  async clickSave() {
    await this.page.getByTestId('save').click();
  }

  async clickCancel() {
    await this.page.getByTestId('cancel').click();
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(2);
		const testIds = violations.map((v) => v.message);
		expect(testIds.some((m) => m.includes('save'))).toBe(true);
		expect(testIds.some((m) => m.includes('cancel'))).toBe(true);
	});

	test('does not flag getByRole calls', ({ project, createFile }) => {
		const file = createFile(
			'/pages/CanvasPage.ts',
			`
export class CanvasPage {
  async goto() { await this.page.goto('/canvas'); }

  async clickSave() {
    await this.page.getByRole('button', { name: 'Save' }).click();
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('does not flag getByText or getByLabel', ({ project, createFile }) => {
		const file = createFile(
			'/pages/FormPage.ts',
			`
export class FormPage {
  async goto() { await this.page.goto('/form'); }

  async fillEmail() {
    await this.page.getByLabel('Email').fill('test@example.com');
    await this.page.getByText('Submit').click();
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('skips excluded files (BasePage, facade)', ({ project, createFile }) => {
		const basePage = createFile(
			'/pages/BasePage.ts',
			`
export class BasePage {
  async clickHeader() {
    await this.page.getByTestId('app-header').click();
  }
}
`,
		);

		const violations = rule.analyze(project, [basePage]);

		expect(violations).toHaveLength(0);
	});

	test('honors allowPatterns config for test ids that have no role equivalent', ({
		project,
		createFile,
	}) => {
		setConfig({
			...getConfig(),
			rules: {
				...getConfig().rules,
				'prefer-role-selectors': {
					enabled: true,
					severity: 'warning',
					allowPatterns: [/^node-/],
				},
			},
		});

		const file = createFile(
			'/pages/CanvasPage.ts',
			`
export class CanvasPage {
  async goto() { await this.page.goto('/canvas'); }

  async clickNode() {
    await this.page.getByTestId('node-123').click();
  }

  async clickSave() {
    await this.page.getByTestId('save-button').click();
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('save-button');
	});

	test('flags getByTestId with dynamic argument (no literal id)', ({ project, createFile }) => {
		const file = createFile(
			'/pages/CanvasPage.ts',
			`
export class CanvasPage {
  async goto() { await this.page.goto('/canvas'); }

  getNode(id: string) {
    return this.page.getByTestId(\`node-\${id}\`);
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].suggestion).toContain('accessible role');
	});

	test('flags getByTestId in component files', ({ project, createFile }) => {
		const file = createFile(
			'/pages/components/NodePanel.ts',
			`
export class NodePanel {
  constructor(private root: Locator) {}

  async selectItem() {
    await this.root.getByTestId('panel-item').click();
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('panel-item');
	});
});
