import { Project } from 'ts-morph';
import assert from 'node:assert';
import { DeduplicationRule } from '../deduplication.rule';

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

// Test 1: Detect duplicate test IDs across files
test('detects duplicate test IDs across files', () => {
	const project = createProject();
	const file1 = project.createSourceFile(
		'/pages/PageA.ts',
		`
export class PageA {
  getSomething() {
    return this.page.getByTestId('my-button');
  }
}
`,
	);
	const file2 = project.createSourceFile(
		'/pages/PageB.ts',
		`
export class PageB {
  getButton() {
    return this.page.getByTestId('my-button');
  }
}
`,
	);

	const rule = new DeduplicationRule();
	const violations = rule.analyze(project, [file1, file2]);

	// Should have one violation (second occurrence)
	assert.ok(violations.length >= 1, 'Should detect duplicate test ID');
	assert.ok(violations[0].message.includes('my-button'), 'Should mention the duplicate ID');
});

// Test 2: No violation for unique test IDs
test('allows unique test IDs', () => {
	const project = createProject();
	const file1 = project.createSourceFile(
		'/pages/PageA.ts',
		`
export class PageA {
  getSomething() {
    return this.page.getByTestId('page-a-button');
  }
}
`,
	);
	const file2 = project.createSourceFile(
		'/pages/PageB.ts',
		`
export class PageB {
  getButton() {
    return this.page.getByTestId('page-b-button');
  }
}
`,
	);

	const rule = new DeduplicationRule();
	const violations = rule.analyze(project, [file1, file2]);

	assert.strictEqual(violations.length, 0, 'Should have no violations for unique IDs');
});

// Test 3: Same test ID within same file is OK
test('allows same test ID within same file', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/pages/PageA.ts',
		`
export class PageA {
  getButton1() {
    return this.container.getByTestId('button');
  }

  getButton2() {
    return this.container.getByTestId('button');
  }
}
`,
	);

	const rule = new DeduplicationRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 0, 'Should allow same ID within same file');
});

// Test 4: Components and pages are separate scopes
test('separates components and pages scopes', () => {
	const project = createProject();
	const pageFile = project.createSourceFile(
		'/pages/PageA.ts',
		`
export class PageA {
  getSomething() {
    return this.page.getByTestId('shared-id');
  }
}
`,
	);
	const componentFile = project.createSourceFile(
		'/pages/components/ComponentA.ts',
		`
export class ComponentA {
  getSomething() {
    return this.root.getByTestId('shared-id');
  }
}
`,
	);

	const rule = new DeduplicationRule();
	const violations = rule.analyze(project, [pageFile, componentFile]);

	// Should have no violations since they're in different scopes
	assert.strictEqual(violations.length, 0, 'Different scopes should not conflict');
});

// Test 5: Skip dynamic test IDs (template literals)
test('skips dynamic test IDs', () => {
	const project = createProject();
	const file1 = project.createSourceFile(
		'/pages/PageA.ts',
		`
export class PageA {
  getSomething(id: string) {
    return this.page.getByTestId(\`item-\${id}\`);
  }
}
`,
	);
	const file2 = project.createSourceFile(
		'/pages/PageB.ts',
		`
export class PageB {
  getItem(id: string) {
    return this.page.getByTestId(\`item-\${id}\`);
  }
}
`,
	);

	const rule = new DeduplicationRule();
	const violations = rule.analyze(project, [file1, file2]);

	// Template literals are skipped, so no violations
	assert.strictEqual(violations.length, 0, 'Should skip dynamic test IDs');
});

console.log('\nDeduplication Rule Tests Complete\n');
