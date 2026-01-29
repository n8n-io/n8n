import { describe } from 'vitest';

import { NoDirectPageInstantiationRule } from './no-direct-page-instantiation.rule.js';
import { test, expect } from '../test/fixtures.js';

describe('NoDirectPageInstantiationRule', () => {
	const rule = new NoDirectPageInstantiationRule();

	test('detects new CanvasPage() in test file', ({ project, createFile }) => {
		const file = createFile(
			'/tests/e2e/canvas.spec.ts',
			`
import { CanvasPage } from '../../pages/CanvasPage';

test('my test', async ({ page }) => {
  const canvas = new CanvasPage(page);
  await canvas.addNode('Code');
});
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('Direct page instantiation');
		expect(violations[0].message).toContain('CanvasPage');
	});

	test('detects multiple page instantiations', ({ project, createFile }) => {
		const file = createFile(
			'/tests/e2e/workflow.spec.ts',
			`
import { CanvasPage } from '../../pages/CanvasPage';
import { SettingsPage } from '../../pages/SettingsPage';

test('my test', async ({ page }) => {
  const canvas = new CanvasPage(page);
  const settings = new SettingsPage(page);
});
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(2);
	});

	test('provides helpful suggestion with fixture name', ({ project, createFile }) => {
		const file = createFile(
			'/tests/e2e/canvas.spec.ts',
			`
test('my test', async ({ page }) => {
  const canvas = new CanvasPage(page);
});
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].suggestion).toContain('n8n.canvas');
		expect(violations[0].suggestion).toContain('instead of new CanvasPage()');
	});

	test('allows non-page class instantiation', ({ project, createFile }) => {
		const file = createFile(
			'/tests/e2e/utils.spec.ts',
			`
test('my test', async () => {
  const helper = new TestHelper();
  const date = new Date();
  const map = new Map();
});
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('targets only test files via getTargetGlobs', ({ project: _project }) => {
		// project fixture initializes config
		const globs = rule.getTargetGlobs();

		// Should only target test files
		expect(globs).toEqual(['tests/**/*.spec.ts']);
		// Should NOT include pages, composables, etc.
		expect(globs.some((g) => g.includes('pages'))).toBe(false);
		expect(globs.some((g) => g.includes('composables'))).toBe(false);
	});

	test('handles complex class names', ({ project, createFile }) => {
		const file = createFile(
			'/tests/e2e/settings.spec.ts',
			`
test('my test', async ({ page }) => {
  const personal = new SettingsPersonalPage(page);
  const security = new SettingsSecurityAuditPage(page);
});
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(2);
		expect(violations[0].suggestion).toContain('n8n.settingsPersonal');
		expect(violations[1].suggestion).toContain('n8n.settingsSecurityAudit');
	});

	test('does not match classes that start with Page', ({ project, createFile }) => {
		const file = createFile(
			'/tests/e2e/utils.spec.ts',
			`
test('my test', async () => {
  const paginator = new Paginator();
  const pageSize = new PageSize();
});
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('matches only exact Page suffix pattern', ({ project, createFile }) => {
		const file = createFile(
			'/tests/e2e/various.spec.ts',
			`
test('my test', async ({ page }) => {
  // Should match - ends with Page
  const canvas = new CanvasPage(page);

  // Should NOT match - doesn't match pattern
  const pages = new MyPages(page);
  const pager = new PageHandler(page);
});
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('CanvasPage');
	});
});
