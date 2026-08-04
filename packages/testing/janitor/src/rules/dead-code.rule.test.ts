import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe } from 'vitest';

import { DeadCodeRule } from './dead-code.rule.js';
import { setConfig, resetConfig, defineConfig } from '../config.js';
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
		const violations = rule.analyzeProject(project, [pageFile]);

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

		const violations = rule.analyzeProject(project, [file]);

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

		const violations = rule.analyzeProject(project, [file]);

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

		const violations = rule.analyzeProject(project, [file]);

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

		const violations = rule.analyzeProject(project, [file]);

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

		const violations = rule.analyzeProject(project, [file]);

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

		const violations = rule.analyzeProject(project, [file]);

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

		const violations = rule.analyzeProject(project, [file]);

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

		const violations = rule.analyzeProject(project, [file]);

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

		const violations = rule.analyzeProject(project, [file]);

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

		const violations = rule.analyzeProject(project, [file]);

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

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(1);
		const fixData = violations[0].fixData;
		expect(fixData).toBeDefined();
		expect(fixData?.type).toBe('method');
		if (fixData && isMethodFix(fixData)) {
			expect(fixData.className).toBe('TestPage');
			expect(fixData.memberName).toBe('unusedMethod');
		}
	});

	test('allows a method used only via a same-file this.method() call', ({
		project,
		createFile,
	}) => {
		const file = createFile(
			'/pages/TestPage.ts',
			`
export class TestPage {
	async publicMethod() {
		await this.calledInternally();
	}
	async calledInternally() {}
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

		const violations = rule.analyzeProject(project, [file]);

		// calledInternally() is only ever called via this.calledInternally() in its
		// own file — that same-file usage must still count, so nothing is flagged.
		expect(violations).toHaveLength(0);
	});

	test('does not flag a dead method when another class has a same-named used method', ({
		project,
		createFile,
	}) => {
		const fileA = createFile(
			'/services/HelperA.ts',
			`
export class HelperA {
	async save() {}
}
`,
		);
		const fileB = createFile(
			'/services/HelperB.ts',
			`
export class HelperB {
	async save() {}
}
`,
		);

		createFile(
			'/tests/test.spec.ts',
			`
import { HelperA } from '../services/HelperA';
import { HelperB } from '../services/HelperB';
const a = new HelperA();
a.save();
const b = new HelperB();
`,
		);

		const violations = rule.analyzeProject(project, [fileA, fileB]);

		// HelperB.save() is genuinely unused, but the name-based text scan cannot
		// tell it apart from HelperA.save() (which is used) — so, by design, it errs
		// towards not flagging rather than risk a false positive.
		expect(violations).toHaveLength(0);
	});

	test('allows a class referenced only within its own declaring file', ({
		project,
		createFile,
	}) => {
		const file = createFile(
			'/pages/Base.ts',
			`
export class Base {}

export class Derived extends Base {}
`,
		);

		createFile(
			'/tests/test.spec.ts',
			`
import { Derived } from '../pages/Base';
const d = new Derived();
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		// Base is used only by 'extends Base' in the same file. A same-file
		// reference must count, so Base is not dead; Derived is used externally.
		expect(violations.map((v) => v.message)).not.toContainEqual(
			expect.stringContaining('Dead class: Base'),
		);
		expect(violations).toHaveLength(0);
	});

	test('allows a property used only via a same-file this.prop access', ({
		project,
		createFile,
	}) => {
		const file = createFile(
			'/pages/TestPage.ts',
			`
export class TestPage {
	private readonly base = 'x';
	get selector() {
		return this.base + '-suffix';
	}
	async use() {
		return this.selector;
	}
}
`,
		);

		createFile(
			'/tests/test.spec.ts',
			`
import { TestPage } from '../pages/TestPage';
const page = new TestPage();
page.use();
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		// selector is read only via this.selector in the same file — must still count.
		expect(violations.map((v) => v.message)).not.toContainEqual(
			expect.stringContaining('selector'),
		);
	});

	test('does not flag native #private members even when unreferenced', ({
		project,
		createFile,
	}) => {
		const file = createFile(
			'/pages/TestPage.ts',
			`
export class TestPage {
	#secret = 1;
	#helper() {
		return this.#secret;
	}
	async use() {
		this.#helper();
	}
}
`,
		);

		createFile(
			'/tests/test.spec.ts',
			`
import { TestPage } from '../pages/TestPage';
const page = new TestPage();
page.use();
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		// #private members can't be seen by an external `.name` scan; they must be
		// excluded outright rather than falsely flagged.
		expect(violations).toHaveLength(0);
	});

	test('flags an unused protected method (only private/# are exempt for methods)', ({
		project,
		createFile,
	}) => {
		const file = createFile(
			'/pages/TestPage.ts',
			`
export class TestPage {
	async used() {}
	protected async orphanProtected() {}
}
`,
		);

		createFile(
			'/tests/test.spec.ts',
			`
import { TestPage } from '../pages/TestPage';
const page = new TestPage();
page.used();
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations.map((v) => v.message)).toContainEqual(
			expect.stringContaining('orphanProtected'),
		);
	});

	test('analyze() reads the suite from disk, covers all categories, and honours ignore globs', () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'janitor-dead-code-'));
		try {
			fs.mkdirSync(path.join(tmpDir, 'pages', 'components'), { recursive: true });
			fs.mkdirSync(path.join(tmpDir, 'composables', 'flows'), { recursive: true });
			fs.mkdirSync(path.join(tmpDir, 'tests'), { recursive: true });
			fs.mkdirSync(path.join(tmpDir, 'node_modules', 'vendor'), { recursive: true });
			fs.mkdirSync(path.join(tmpDir, 'dist'), { recursive: true });

			fs.writeFileSync(
				path.join(tmpDir, 'pages', 'components', 'TestPage.ts'),
				`export class TestPage {
	alive() {}
	orphan() {}
}
`,
			);
			// A flow (composables) declaration proves that target category is analysed too.
			fs.writeFileSync(
				path.join(tmpDir, 'composables', 'flows', 'TestFlow.ts'),
				`export class TestFlow {
	deadFlowStep() {}
}
`,
			);
			fs.writeFileSync(
				path.join(tmpDir, 'tests', 'test.spec.ts'),
				`import { TestPage } from '../pages/components/TestPage';
import { TestFlow } from '../composables/TestFlow';
const page = new TestPage();
page.alive();
const flow = new TestFlow();
`,
			);
			// Every `.orphan()` here lives in a file the ignore globs must skip; if any
			// slipped into the corpus, orphan() would look used and NOT be flagged.
			fs.writeFileSync(path.join(tmpDir, 'types.d.ts'), 'declare const x: X;\nx.orphan();\n');
			fs.writeFileSync(
				path.join(tmpDir, 'node_modules', 'vendor', 'index.ts'),
				'export const y = {};\ny.orphan();\n',
			);
			fs.writeFileSync(
				path.join(tmpDir, 'dist', 'built.js.ts'),
				'declare const w: W;\nw.orphan();\n',
			);

			setConfig(defineConfig({ rootDir: tmpDir }));
			const violations = new DeadCodeRule().analyze({ rootDir: tmpDir });
			const messages = violations.map((v) => v.message);

			// orphan() only appears in ignored files -> flagged; alive() is used.
			expect(messages).toContainEqual(expect.stringContaining('TestPage.orphan()'));
			expect(messages).not.toContainEqual(expect.stringContaining('TestPage.alive()'));
			// The composables category is reached: TestFlow (used) has a dead step.
			expect(messages).toContainEqual(expect.stringContaining('TestFlow.deadFlowStep()'));
		} finally {
			resetConfig();
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});
});
