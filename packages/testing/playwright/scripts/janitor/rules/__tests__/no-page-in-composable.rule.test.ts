import { Project } from 'ts-morph';
import assert from 'node:assert';
import { NoPageInComposableRule } from '../no-page-in-composable.rule';

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

// Test 1: Clean composable using page objects
test('allows page object usage', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/composables/WorkflowComposer.ts',
		`
export class WorkflowComposer {
	constructor(private n8n: any) {}

	async createWorkflow() {
		await this.n8n.canvas.openNewWorkflow();
		await this.n8n.ndv.setName('Test');
	}
}
`,
	);

	const rule = new NoPageInComposableRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 0, 'Should allow page object usage');
});

// Test 2: Detect direct page.getByTestId
test('detects direct page.getByTestId access', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/composables/WorkflowComposer.ts',
		`
export class WorkflowComposer {
	constructor(private n8n: any) {}

	async clickButton() {
		await this.n8n.page.getByTestId('button').click();
	}
}
`,
	);

	const rule = new NoPageInComposableRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 1, 'Should detect direct page access');
	assert.ok(violations[0].message.includes('page.getByTestId'), 'Should mention the method');
});

// Test 3: Detect page.locator
test('detects page.locator access', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/composables/WorkflowComposer.ts',
		`
export class WorkflowComposer {
	constructor(private n8n: any) {}

	async findElement() {
		return this.n8n.page.locator('.my-class');
	}
}
`,
	);

	const rule = new NoPageInComposableRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 1, 'Should detect page.locator');
});

// Test 4: Detect page.goto
test('detects page.goto access', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/composables/WorkflowComposer.ts',
		`
export class WorkflowComposer {
	constructor(private n8n: any) {}

	async navigate() {
		await this.n8n.page.goto('/workflows');
	}
}
`,
	);

	const rule = new NoPageInComposableRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 1, 'Should detect page.goto');
	assert.ok(violations[0].suggestion?.includes('navigation'), 'Should suggest navigation method');
});

// Test 5: Multiple violations
test('detects multiple direct page accesses', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/composables/WorkflowComposer.ts',
		`
export class WorkflowComposer {
	constructor(private n8n: any) {}

	async doStuff() {
		await this.n8n.page.getByTestId('a').click();
		await this.n8n.page.locator('.b').fill('text');
		await this.n8n.page.getByRole('button').click();
	}
}
`,
	);

	const rule = new NoPageInComposableRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 3, 'Should detect all three violations');
});

// Test 6: Correct line numbers
test('reports correct line numbers', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/composables/WorkflowComposer.ts',
		`export class WorkflowComposer {
	constructor(private n8n: any) {}

	async method() {
		// line 5
		await this.n8n.page.getByTestId('x').click(); // line 6
	}
}
`,
	);

	const rule = new NoPageInComposableRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 1, 'Should detect one violation');
	assert.strictEqual(violations[0].line, 6, 'Should report correct line number');
});

// Test 7: Provides helpful suggestions
test('provides context-specific suggestions', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/composables/WorkflowComposer.ts',
		`
export class WorkflowComposer {
	constructor(private n8n: any) {}

	async method() {
		await this.n8n.page.getByTestId('x').click();
	}
}
`,
	);

	const rule = new NoPageInComposableRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 1, 'Should detect violation');
	assert.ok(violations[0].suggestion, 'Should have a suggestion');
	assert.ok(violations[0].suggestion?.includes('page object'), 'Should suggest using page objects');
});

console.log('\nNo Page In Composable Rule Tests Complete\n');
