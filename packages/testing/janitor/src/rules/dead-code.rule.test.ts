import { Project } from 'ts-morph';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { DeadCodeRule } from './dead-code.rule.js';
import { setConfig, resetConfig, defineConfig } from '../config.js';
import { isMethodFix } from '../types.js';

describe('DeadCodeRule', () => {
	let project: Project;
	let rule: DeadCodeRule;

	beforeEach(() => {
		project = new Project({ useInMemoryFileSystem: true });
		rule = new DeadCodeRule();

		setConfig(
			defineConfig({
				rootDir: '/',
			}),
		);
	});

	afterEach(() => {
		resetConfig();
	});

	it('allows methods with external references', () => {
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

		project.createSourceFile(
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

	it('detects unused method', () => {
		const file = project.createSourceFile(
			'/pages/TestPage.ts',
			`
export class TestPage {
	async usedMethod() {}
	async unusedMethod() {}
}
`,
		);

		project.createSourceFile(
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

	it('detects unused property', () => {
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

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('unusedProp');
	});

	it('detects dead class with no references', () => {
		const file = project.createSourceFile(
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

	it('skips private methods', () => {
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

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	it('skips protected properties', () => {
		const file = project.createSourceFile(
			'/pages/TestPage.ts',
			`
export class TestPage {
	protected container = 'div';
	async publicMethod() {}
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

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	it('provides correct fix data', () => {
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
