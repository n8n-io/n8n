import { describe } from 'vitest';

import { BoundaryProtectionRule } from './boundary-protection.rule.js';
import { test, expect } from '../test/fixtures.js';

// Uses janitor's test fixture so getConfig() (excludeFromPages, patterns) is set —
// the rule respects configured exclusions via isExcludedPage.
describe('BoundaryProtectionRule', () => {
	const rule = new BoundaryProtectionRule();

	test('allows imports from components', ({ project, createFile }) => {
		createFile('/pages/CanvasPage.ts', "import { NodePanel } from './components/NodePanel';");
		expect(rule.analyzeProject(project)).toHaveLength(0);
	});

	test('flags a direct page import', ({ project, createFile }) => {
		createFile('/pages/CanvasPage.ts', "import { WorkflowPage } from './WorkflowPage';");
		createFile('/pages/WorkflowPage.ts', 'export class WorkflowPage {}');
		const violations = rule.analyzeProject(project);
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('imports another page');
	});

	test('allows imports from base classes', ({ project, createFile }) => {
		createFile('/pages/CanvasPage.ts', "import { BasePage } from './BasePage';");
		expect(rule.analyzeProject(project)).toHaveLength(0);
	});

	test('skips files excluded via config (excludeFromPages)', ({ project, createFile }) => {
		createFile('/pages/BasePage.ts', "import { SomePage } from './SomePage';");
		expect(rule.analyzeProject(project)).toHaveLength(0);
	});

	test('allows external package imports', ({ project, createFile }) => {
		createFile('/pages/CanvasPage.ts', "import { Page } from '@playwright/test';");
		expect(rule.analyzeProject(project)).toHaveLength(0);
	});
});
