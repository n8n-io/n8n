import { Project } from 'ts-morph';
import assert from 'node:assert';
import { SelectorPurityRule } from '../selector-purity.rule';

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

// Test 1: Detect direct page locator in composable
test('detects direct n8n.page.getByTestId in composable', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/composables/TestComposer.ts',
		`
export class TestComposer {
  constructor(private n8n: n8nPage) {}

  async doSomething() {
    await this.n8n.page.getByTestId('something').click();
  }
}
`,
	);

	const rule = new SelectorPurityRule();
	const violations = rule.analyze(project, [file]);

	assert.ok(violations.length > 0, 'Should detect direct page locator');
});

// Test 2: Allow page object method calls
test('allows page object method calls', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/composables/TestComposer.ts',
		`
export class TestComposer {
  constructor(private n8n: n8nPage) {}

  async doSomething() {
    await this.n8n.canvas.openNode('Code');
    await this.n8n.ndv.close();
  }
}
`,
	);

	const rule = new SelectorPurityRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 0, 'Should allow page object methods');
});

// Test 3: Allow legitimate page-level methods
test('allows page.keyboard and page.evaluate', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/composables/TestComposer.ts',
		`
export class TestComposer {
  constructor(private n8n: n8nPage) {}

  async doSomething() {
    await this.n8n.page.keyboard.press('Enter');
    await this.n8n.page.evaluate(() => console.log('test'));
    await this.n8n.page.reload();
    await this.n8n.page.waitForLoadState();
  }
}
`,
	);

	const rule = new SelectorPurityRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 0, 'Should allow page-level methods');
});

// Test 4: Detect direct locators in test files
test('detects direct page.getByTestId in test files', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/tests/e2e/my-test.spec.ts',
		`
test('my test', async ({ n8n }) => {
  await n8n.page.getByTestId('something').click();
});
`,
	);

	const rule = new SelectorPurityRule();
	const violations = rule.analyze(project, [file]);

	assert.ok(violations.length > 0, 'Should detect direct locator in test file');
});

// Test 5: Detect multiple locator methods
test('detects various locator methods', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/composables/TestComposer.ts',
		`
export class TestComposer {
  constructor(private n8n: n8nPage) {}

  async doSomething() {
    await this.n8n.page.locator('.class').click();
    await this.n8n.page.getByRole('button').click();
    await this.n8n.page.getByText('text').click();
  }
}
`,
	);

	const rule = new SelectorPurityRule();
	const violations = rule.analyze(project, [file]);

	assert.ok(violations.length >= 3, 'Should detect multiple locator method violations');
});

console.log('\nSelector Purity Rule Tests Complete\n');
