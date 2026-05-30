import { createInMemoryProject } from '@n8n/rules-engine/ast';
import { describe, it, expect } from 'vitest';

import { BoundaryProtectionRule } from './boundary-protection.rule.js';

describe('BoundaryProtectionRule', () => {
	const rule = new BoundaryProtectionRule();

	const run = (files: Record<string, string>) => {
		const project = createInMemoryProject();
		for (const [p, code] of Object.entries(files)) project.createSourceFile(p, code);
		return rule.analyzeProject(project);
	};

	it('allows imports from components', () => {
		expect(
			run({ '/pages/CanvasPage.ts': "import { NodePanel } from './components/NodePanel';" }),
		).toHaveLength(0);
	});

	it('flags a direct page import', () => {
		const violations = run({
			'/pages/CanvasPage.ts': "import { WorkflowPage } from './WorkflowPage';",
			'/pages/WorkflowPage.ts': 'export class WorkflowPage {}',
		});
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('imports another page');
	});

	it('allows imports from base classes', () => {
		expect(run({ '/pages/CanvasPage.ts': "import { BasePage } from './BasePage';" })).toHaveLength(
			0,
		);
	});

	it('skips excluded files', () => {
		expect(run({ '/pages/BasePage.ts': "import { SomePage } from './SomePage';" })).toHaveLength(0);
	});

	it('allows external package imports', () => {
		expect(
			run({ '/pages/CanvasPage.ts': "import { Page } from '@playwright/test';" }),
		).toHaveLength(0);
	});
});
