import { Project } from 'ts-morph';
import assert from 'node:assert';
import { DeadCodeRule } from '../dead-code.rule';

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

// Test 1: No violations for used method
test('allows methods with external references', () => {
	const project = createProject();

	// Create a page with a method
	project.createSourceFile(
		'/pages/TestPage.ts',
		`
export class TestPage {
	async clickButton() {
		// implementation
	}
}
`,
	);

	// Create a test that uses the method
	project.createSourceFile(
		'/tests/test.spec.ts',
		`
import { TestPage } from '../pages/TestPage';

const page = new TestPage();
page.clickButton();
`,
	);

	const rule = new DeadCodeRule();
	const pageFile = project.getSourceFile('/pages/TestPage.ts')!;
	const violations = rule.analyze(project, [pageFile]);

	assert.strictEqual(violations.length, 0, 'Should have no violations for used method');
});

// Test 2: Detect unused method
test('detects unused method', () => {
	const project = createProject();

	const file = project.createSourceFile(
		'/pages/TestPage.ts',
		`
export class TestPage {
	async usedMethod() {}
	async unusedMethod() {}
}
`,
	);

	// Only reference usedMethod
	project.createSourceFile(
		'/tests/test.spec.ts',
		`
import { TestPage } from '../pages/TestPage';
const page = new TestPage();
page.usedMethod();
`,
	);

	const rule = new DeadCodeRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 1, 'Should detect one unused method');
	assert.ok(violations[0].message.includes('unusedMethod'), 'Should mention the unused method');
	assert.strictEqual(violations[0].fixable, true, 'Should be fixable');
});

// Test 3: Detect unused property
test('detects unused property', () => {
	const project = createProject();

	const file = project.createSourceFile(
		'/pages/TestPage.ts',
		`
export class TestPage {
	usedProp = 'used';
	unusedProp = 'unused';
}
`,
	);

	project.createSourceFile(
		'/tests/test.spec.ts',
		`
import { TestPage } from '../pages/TestPage';
const page = new TestPage();
console.log(page.usedProp);
`,
	);

	const rule = new DeadCodeRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 1, 'Should detect one unused property');
	assert.ok(violations[0].message.includes('unusedProp'), 'Should mention the unused property');
});

// Test 4: Detect dead class
test('detects dead class with no references', () => {
	const project = createProject();

	const file = project.createSourceFile(
		'/pages/DeadPage.ts',
		`
export class DeadPage {
	async doSomething() {}
}
`,
	);

	// No file references DeadPage

	const rule = new DeadCodeRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 1, 'Should detect dead class');
	assert.ok(violations[0].message.includes('Dead class'), 'Should identify as dead class');
	assert.ok(violations[0].message.includes('DeadPage'), 'Should mention the class name');
});

// Test 5: Skip private methods
test('skips private methods', () => {
	const project = createProject();

	const file = project.createSourceFile(
		'/pages/TestPage.ts',
		`
export class TestPage {
	async publicMethod() {
		this.privateHelper();
	}
	private privateHelper() {}
}
`,
	);

	project.createSourceFile(
		'/tests/test.spec.ts',
		`
import { TestPage } from '../pages/TestPage';
const page = new TestPage();
page.publicMethod();
`,
	);

	const rule = new DeadCodeRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 0, 'Should not flag private methods');
});

// Test 6: Skip protected properties
test('skips protected properties', () => {
	const project = createProject();

	const file = project.createSourceFile(
		'/pages/TestPage.ts',
		`
export class TestPage {
	protected container = 'div';
	async publicMethod() {}
}
`,
	);

	// Reference the class and publicMethod so only protected property is "unused"
	project.createSourceFile(
		'/tests/test.spec.ts',
		`
import { TestPage } from '../pages/TestPage';
const page = new TestPage();
page.publicMethod();
`,
	);

	const rule = new DeadCodeRule();
	const violations = rule.analyze(project, [file]);

	// Protected properties should not be flagged as unused
	assert.strictEqual(violations.length, 0, 'Should not flag protected properties');
});

// Test 7: Fix data is populated correctly
test('provides correct fix data', () => {
	const project = createProject();

	const file = project.createSourceFile(
		'/pages/TestPage.ts',
		`
export class TestPage {
	async unusedMethod() {}
}
`,
	);

	project.createSourceFile(
		'/tests/test.spec.ts',
		`
import { TestPage } from '../pages/TestPage';
const page = new TestPage();
`,
	);

	const rule = new DeadCodeRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 1, 'Should detect unused method');
	assert.ok(violations[0].fixData, 'Should have fix data');
	assert.strictEqual(violations[0].fixData?.type, 'method', 'Fix data should indicate method');
	assert.strictEqual(violations[0].fixData?.className, 'TestPage', 'Should have class name');
	assert.strictEqual(violations[0].fixData?.memberName, 'unusedMethod', 'Should have member name');
});

console.log('\nDead Code Rule Tests Complete\n');
