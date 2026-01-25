import { Project } from 'ts-morph';
import assert from 'node:assert';
import { ScopeLockdownRule } from '../scope-lockdown.rule';

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

// Test 1: Detect missing container
test('detects missing container property', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/pages/TestPage.ts',
		`
export class TestPage {
  getSomething() {
    return this.page.getByTestId('x');
  }
}
`,
	);

	const rule = new ScopeLockdownRule();
	const violations = rule.analyze(project, [file]);

	const missingContainer = violations.find((v) => v.message.includes('missing container'));
	assert.ok(missingContainer, 'Should detect missing container');
});

// Test 2: Detect unscoped locator calls
test('detects unscoped locator calls', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/pages/TestPage.ts',
		`
export class TestPage {
  get container() {
    return this.page.getByTestId('root');
  }

  getSomething() {
    return this.page.getByTestId('x');
  }
}
`,
	);

	const rule = new ScopeLockdownRule();
	const violations = rule.analyze(project, [file]);

	const unscopedCall = violations.find((v) => v.message.includes('not scoped to container'));
	assert.ok(unscopedCall, 'Should detect unscoped locator call');
});

// Test 3: Allow properly scoped locators
test('allows properly scoped locators', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/pages/TestPage.ts',
		`
export class TestPage {
  get container() {
    return this.page.getByTestId('root');
  }

  getSomething() {
    return this.container.getByTestId('x');
  }
}
`,
	);

	const rule = new ScopeLockdownRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 0, 'Should have no violations');
});

// Test 4: Allow page-level methods
test('allows page-level methods like goto and waitForResponse', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/pages/TestPage.ts',
		`
export class TestPage {
  get container() {
    return this.page.getByTestId('root');
  }

  async navigate() {
    await this.page.goto('/test');
    await this.page.waitForResponse('/api/test');
    await this.page.reload();
    await this.page.keyboard.press('Enter');
  }
}
`,
	);

	const rule = new ScopeLockdownRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 0, 'Page-level methods should be allowed');
});

// Test 5: Skip component files (they use root: Locator)
test('skips component files', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/pages/components/TestComponent.ts',
		`
export class TestComponent {
  constructor(private root: Locator) {}

  getSomething() {
    return this.root.getByTestId('x');
  }
}
`,
	);

	const rule = new ScopeLockdownRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 0, 'Should skip component files');
});

// Test 6: Skip BasePage.ts
test('skips BasePage.ts', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/pages/BasePage.ts',
		`
export class BasePage {
  protected clickByTestId(testId: string) {
    return this.page.getByTestId(testId).click();
  }
}
`,
	);

	const rule = new ScopeLockdownRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 0, 'Should skip BasePage.ts');
});

// Test 7: Allow component instantiation with page locator
test('allows component instantiation with page.getByTestId', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/pages/TestPage.ts',
		`
export class TestPage {
  readonly myComponent = new MyComponent(this.page.getByTestId('my-component'));

  get container() {
    return this.page.getByTestId('root');
  }
}
`,
	);

	const rule = new ScopeLockdownRule();
	const violations = rule.analyze(project, [file]);

	// Should only have missing container if no container defined
	const unscopedCalls = violations.filter((v) => v.message.includes('not scoped to container'));
	assert.strictEqual(unscopedCalls.length, 0, 'Component instantiation should be allowed');
});

console.log('\nScope Lockdown Rule Tests Complete\n');
