import { describe } from 'vitest';

import { DeadCodeRule } from './dead-code.rule.js';
import { test, expect } from '../test/fixtures.js';
import { isMethodFix } from '../types.js';

describe('DeadCodeRule', () => {
	const rule = new DeadCodeRule();

	test('allows methods with external references', ({ project, createFile }) => {
		createFile(
			'/pages/TestPage.ts',
			`
export class TestPage {
	async clickButton() {
		// implementation
	}
}
`,
		);

		createFile(
			'/tests/test.spec.ts',
			`
import { TestPage } from '../pages/TestPage';

const page = new TestPage();
page.clickButton();
`,
		);

		const pageFile = project.getSourceFile('/pages/TestPage.ts')!;
		const violations = rule.analyze(project, [pageFile]);

		expect(violations).toHaveLength(0);
	});

	test('detects unused method', ({ project, createFile }) => {
		const file = createFile(
			'/pages/TestPage.ts',
			`
export class TestPage {
	async usedMethod() {}
	async unusedMethod() {}
}
`,
		);

		createFile(
			'/tests/test.spec.ts',
			`
import { TestPage } from '../pages/TestPage';
const page = new TestPage();
page.usedMethod();
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('unusedMethod');
		expect(violations[0].fixable).toBe(true);
	});

	test('detects unused property', ({ project, createFile }) => {
		const file = createFile(
			'/pages/TestPage.ts',
			`
export class TestPage {
	usedProp = 'used';
	unusedProp = 'unused';
}
`,
		);

		createFile(
			'/tests/test.spec.ts',
			`
import { TestPage } from '../pages/TestPage';
const page = new TestPage();
console.log(page.usedProp);
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('unusedProp');
	});

	test('detects dead class with no references', ({ project, createFile }) => {
		const file = createFile(
			'/pages/DeadPage.ts',
			`
export class DeadPage {
	async doSomething() {}
}
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('Dead class');
		expect(violations[0].message).toContain('DeadPage');
	});

	test('skips private methods', ({ project, createFile }) => {
		const file = createFile(
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

		createFile(
			'/tests/test.spec.ts',
			`
import { TestPage } from '../pages/TestPage';
const page = new TestPage();
page.publicMethod();
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('skips protected properties', ({ project, createFile }) => {
		const file = createFile(
			'/pages/TestPage.ts',
			`
export class TestPage {
	protected container = 'div';
	async publicMethod() {}
}
`,
		);

		createFile(
			'/tests/test.spec.ts',
			`
import { TestPage } from '../pages/TestPage';
const page = new TestPage();
page.publicMethod();
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('provides correct fix data', ({ project, createFile }) => {
		const file = createFile(
			'/pages/TestPage.ts',
			`
export class TestPage {
	async unusedMethod() {}
}
`,
		);

		createFile(
			'/tests/test.spec.ts',
			`
import { TestPage } from '../pages/TestPage';
const page = new TestPage();
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		const fixData = violations[0].fixData;
		expect(fixData).toBeDefined();
		expect(fixData?.type).toBe('method');
		if (fixData && isMethodFix(fixData)) {
			expect(fixData.className).toBe('TestPage');
			expect(fixData.memberName).toBe('unusedMethod');
		}
	});
});
