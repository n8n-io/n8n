import { describe } from 'vitest';

import { PreferRoleSelectorsRule } from './prefer-role-selectors.rule.js';
import { test, expect } from '../test/fixtures.js';

describe('PreferRoleSelectorsRule', () => {
	const rule = new PreferRoleSelectorsRule();

	test('flags getByTestId calls in page objects', ({ project, createFile }) => {
		const file = createFile(
			'/pages/CanvasPage.ts',
			`
export class CanvasPage {
  async goto() { await this.page.goto('/'); }

  async openNode() {
    await this.page.getByTestId('node-item').click();
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].rule).toBe('prefer-role-selectors');
		expect(violations[0].severity).toBe('warning');
		expect(violations[0].message).toContain('getByTestId');
		expect(violations[0].suggestion).toContain('getByRole');
	});

	test('flags multiple getByTestId calls', ({ project, createFile }) => {
		const file = createFile(
			'/pages/CanvasPage.ts',
			`
export class CanvasPage {
  async goto() { await this.page.goto('/'); }

  async openNode() {
    await this.page.getByTestId('node-item').click();
    await this.container.getByTestId('node-handle').click();
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(2);
	});

	test('allows getByRole calls in page objects', ({ project, createFile }) => {
		const file = createFile(
			'/pages/CanvasPage.ts',
			`
export class CanvasPage {
  async goto() { await this.page.goto('/'); }

  async clickSave() {
    await this.page.getByRole('button', { name: 'Save' }).click();
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('flags getByTestId in component files', ({ project, createFile }) => {
		const file = createFile(
			'/pages/components/NodePanel.ts',
			`
export class NodePanel {
  get container() { return this.page.locator('.node-panel'); }

  async selectNode() {
    await this.container.getByTestId('node-item').click();
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('getByTestId');
	});

	test('skips excluded files (BasePage)', ({ project, createFile }) => {
		const file = createFile(
			'/pages/BasePage.ts',
			`
export class BasePage {
  async legacyHelper() {
    return this.page.getByTestId('legacy');
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('does not flag getByText, getByLabel, or locator calls', ({ project, createFile }) => {
		const file = createFile(
			'/pages/CanvasPage.ts',
			`
export class CanvasPage {
  async goto() { await this.page.goto('/'); }

  async actions() {
    await this.page.getByText('Save').click();
    await this.page.getByLabel('Username').fill('me');
    await this.page.locator('.save-button').click();
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});
});
