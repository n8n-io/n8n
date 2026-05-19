import { describe } from 'vitest';

import { PreferRoleSelectorsRule } from './prefer-role-selectors.rule.js';
import { getConfig, setConfig, defineConfig } from '../config.js';
import { test, expect } from '../test/fixtures.js';

describe('PreferRoleSelectorsRule', () => {
	const rule = new PreferRoleSelectorsRule();

	test('flags getByTestId in a page object', ({ project, createFile }) => {
		const file = createFile(
			'/pages/WorkflowPage.ts',
			`
export class WorkflowPage {
  constructor(private page: any) {}

  get saveButton() {
    return this.page.getByTestId('save-button');
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('save-button');
		expect(violations[0].severity).toBe('warning');
	});

	test('flags getByTestId on container and other receivers', ({ project, createFile }) => {
		const file = createFile(
			'/pages/components/NodePanel.ts',
			`
export class NodePanel {
  constructor(private page: any) {}

  get container() {
    return this.page.locator('.node-panel');
  }

  get header() {
    return this.container.getByTestId('panel-header');
  }

  get title() {
    return this.getHeader().getByTestId('panel-title');
  }

  private getHeader() {
    return this.container.getByTestId('panel-header');
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		// Three getByTestId calls in the file
		expect(violations).toHaveLength(3);
		const testIds = violations.map((v) => v.message);
		expect(testIds.some((m) => m.includes('panel-header'))).toBe(true);
		expect(testIds.some((m) => m.includes('panel-title'))).toBe(true);
	});

	test('does not flag getByRole calls', ({ project, createFile }) => {
		const file = createFile(
			'/pages/WorkflowPage.ts',
			`
export class WorkflowPage {
  constructor(private page: any) {}

  get saveButton() {
    return this.page.getByRole('button', { name: 'Save' });
  }

  get nameInput() {
    return this.page.getByRole('textbox', { name: 'Workflow name' });
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('respects allowPatterns config for opted-out test IDs', ({ project, createFile }) => {
		const file = createFile(
			'/pages/WorkflowPage.ts',
			`
export class WorkflowPage {
  constructor(private page: any) {}

  get canvas() {
    return this.page.getByTestId('canvas-root');
  }

  get save() {
    return this.page.getByTestId('save-button');
  }
}
`,
		);

		const previousConfig = getConfig();
		setConfig(
			defineConfig({
				...previousConfig,
				rules: {
					...previousConfig.rules,
					'prefer-role-selectors': {
						allowPatterns: [/^canvas-/],
					},
				},
			}),
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('save-button');
	});

	test('skips files listed in excludeFromPages', ({ project, createFile }) => {
		const file = createFile(
			'/pages/BasePage.ts',
			`
export class BasePage {
  constructor(protected page: any) {}

  protected getByTestId(id: string) {
    return this.page.getByTestId(id);
  }
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});
});
