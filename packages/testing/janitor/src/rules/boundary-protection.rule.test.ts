import { describe } from 'vitest';

import { BoundaryProtectionRule } from './boundary-protection.rule.js';
import { test, expect } from '../test/fixtures.js';

describe('BoundaryProtectionRule', () => {
	const rule = new BoundaryProtectionRule();

	test('should allow imports from components', ({ project, createFile }) => {
		const file = createFile(
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

	test('should flag direct page imports', ({ project, createFile }) => {
		const file = createFile(
			'/pages/CanvasPage.ts',
			`
import { WorkflowPage } from './WorkflowPage';

export class CanvasPage {
  readonly workflows = new WorkflowPage();
}
`,
		);

		// Also create the imported file so ts-morph can resolve it
		createFile(
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

	test('should allow imports from base classes', ({ project, createFile }) => {
		const file = createFile(
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

	test('should skip excluded files', ({ project, createFile }) => {
		const file = createFile(
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

	test('should allow external package imports', ({ project, createFile }) => {
		const file = createFile(
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
