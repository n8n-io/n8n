import { Project } from 'ts-morph';
import assert from 'node:assert';
import { BoundaryProtectionRule } from '../boundary-protection.rule';

function createProject() {
	return new Project({ useInMemoryFileSystem: true });
}

function test(name: string, fn: () => void) {
	try {
		fn();
		console.log(`✅ ${name}`);
	} catch (error) {
		console.log(`❌ ${name}`);
		console.error(error);
		process.exitCode = 1;
	}
}

// Test 1: Clean file with no cross-page imports
test('allows imports from components', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/pages/TestPage.ts',
		`
import { BasePage } from './BasePage';
import { MyComponent } from './components/MyComponent';
import type { Page } from '@playwright/test';

export class TestPage extends BasePage {}
`,
	);

	const rule = new BoundaryProtectionRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 0, 'Should have no violations');
});

// Test 2: Detect cross-page import
test('detects cross-page import', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/pages/TestPage.ts',
		`
import { BasePage } from './BasePage';
import { WorkflowsPage } from './WorkflowsPage';

export class TestPage extends BasePage {}
`,
	);

	const rule = new BoundaryProtectionRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 1, 'Should detect one violation');
	assert.ok(violations[0].message.includes('WorkflowsPage'), 'Should mention the imported page');
});

// Test 3: Skip n8nPage.ts and BasePage.ts
test('skips n8nPage.ts file', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/pages/n8nPage.ts',
		`
import { CanvasPage } from './CanvasPage';
import { WorkflowsPage } from './WorkflowsPage';

export class n8nPage {}
`,
	);

	const rule = new BoundaryProtectionRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 0, 'Should skip n8nPage.ts');
});

// Test 4: Allow external package imports
test('allows external package imports', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/pages/TestPage.ts',
		`
import { BasePage } from './BasePage';
import type { Locator, Page } from '@playwright/test';
import { expect } from 'playwright';

export class TestPage extends BasePage {}
`,
	);

	const rule = new BoundaryProtectionRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 0, 'Should allow external imports');
});

// Test 5: Skip component files
test('skips component files', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/pages/components/MyComponent.ts',
		`
import { OtherComponent } from './OtherComponent';

export class MyComponent {}
`,
	);

	const rule = new BoundaryProtectionRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 0, 'Should skip component files');
});

console.log('\nBoundary Protection Rule Tests Complete\n');
