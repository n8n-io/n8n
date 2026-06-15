import { describe } from 'vitest';

import { NoRawEditorNavigationRule } from './no-raw-editor-navigation.rule.js';
import { test, expect } from '../test/fixtures.js';

describe('NoRawEditorNavigationRule', () => {
	const rule = new NoRawEditorNavigationRule();

	test('flags raw page.goto to an editor route with a workflow id', ({ project, createFile }) => {
		const file = createFile(
			'/tests/e2e/example.spec.ts',
			`
test('opens workflow', async ({ n8n }) => {
	await n8n.page.goto(\`/workflow/\${workflowId}\`);
});
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('Raw navigation to the workflow editor');
		expect(violations[0].suggestion).toContain('fromImportedWorkflow');
	});

	test('flags raw page.goto to the new workflow route', ({ project, createFile }) => {
		const file = createFile(
			'/tests/e2e/example.spec.ts',
			`
test('blank canvas', async ({ page }) => {
	await page.goto('/workflow/new');
});
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(1);
	});

	test('flags navigation via the NEW_WORKFLOW_PAGE constant', ({ project, createFile }) => {
		const file = createFile(
			'/tests/e2e/example.spec.ts',
			`
test('blank canvas', async ({ n8n }) => {
	await n8n.page.goto(ROUTES.NEW_WORKFLOW_PAGE);
});
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(1);
	});

	test('does not flag the workflow list routes', ({ project, createFile }) => {
		const file = createFile(
			'/tests/e2e/example.spec.ts',
			`
test('lists', async ({ n8n }) => {
	await n8n.page.goto('/workflows');
	await n8n.page.goto('/home/workflows');
	await n8n.page.goto(\`projects/\${projectId}/workflows\`);
	await n8n.page.goto('/workflows/demo/diff');
});
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('does not flag navigation through entry composers', ({ project, createFile }) => {
		const file = createFile(
			'/tests/e2e/example.spec.ts',
			`
test('imports', async ({ n8n }) => {
	await n8n.start.fromImportedWorkflow('workflow/file.json');
});
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('reports correct line number', ({ project, createFile }) => {
		const file = createFile(
			'/tests/e2e/example.spec.ts',
			`test('x', async ({ page }) => {
	// line 2
	await page.goto('/workflow/123'); // line 3
});
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].line).toBe(3);
	});
});
