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

	test('allows method used via indirect property chain (text fallback)', ({
		project,
		createFile,
	}) => {
		const file = createFile(
			'/services/MyHelper.ts',
			`
export class MyHelper {
	async archive() {}
	async reallyUnused() {}
}
`,
		);

		// No direct import of MyHelper — usage is through a property chain
		// that ts-morph cannot trace (e.g. Playwright fixtures)
		createFile(
			'/tests/fixtures.ts',
			`
const thing = getFixture();
await thing.api.helpers.archive();
`,
		);

		createFile(
			'/tests/test.spec.ts',
			`
import { MyHelper } from '../services/MyHelper';
const h = new MyHelper();
`,
		);

		const violations = rule.analyze(project, [file]);

		// archive() should NOT be flagged — text fallback finds '.archive('
		// reallyUnused() SHOULD be flagged — no text match anywhere
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('reallyUnused');
	});

	test('allows property used via indirect access (text fallback)', ({ project, createFile }) => {
		const file = createFile(
			'/pages/TestPage.ts',
			`
export class TestPage {
	container = 'div';
	deadProp = 'unused';
}
`,
		);

		// Property accessed via chain, no direct import
		createFile(
			'/tests/test.spec.ts',
			`
const n8n = getFixture();
n8n.page.container.click();
`,
		);

		createFile(
			'/other/consumer.ts',
			`
import { TestPage } from '../pages/TestPage';
const p = new TestPage();
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('deadProp');
	});

	test('text fallback does not match partial member names', ({ project, createFile }) => {
		const file = createFile(
			'/services/Helper.ts',
			`
export class Helper {
	async save() {}
}
`,
		);

		// 'saveAll' contains 'save' but is a different member — should not match
		createFile(
			'/tests/test.spec.ts',
			`
import { Helper } from '../services/Helper';
const h = new Helper();
thing.saveAll();
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('save');
	});

	test('text fallback matches assignment and comma patterns', ({ project, createFile }) => {
		const file = createFile(
			'/services/Helper.ts',
			`
export class Helper {
	async usedViaAssignment() {}
	async usedInArray() {}
}
`,
		);

		// Patterns that [.(] would miss but \b catches
		createFile(
			'/tests/test.spec.ts',
			`
import { Helper } from '../services/Helper';
const h = new Helper();
const x = obj.usedViaAssignment;
const arr = [obj.usedInArray, other];
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('text fallback escapes regex special characters in member names', ({
		project,
		createFile,
	}) => {
		const file = createFile(
			'/services/Helper.ts',
			`
export class Helper {
	async $reset() {}
}
`,
		);

		createFile(
			'/tests/test.spec.ts',
			`
import { Helper } from '../services/Helper';
const h = new Helper();
thing.$reset();
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
