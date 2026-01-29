import { describe } from 'vitest';

import { DeduplicationRule } from './deduplication.rule.js';
import { test, expect } from '../test/fixtures.js';

describe('DeduplicationRule', () => {
	const rule = new DeduplicationRule();

	test('detects duplicate test IDs across files', ({ project, createFile }) => {
		const file1 = createFile(
			'/pages/PageA.ts',
			`
export class PageA {
  getSomething() {
    return this.page.getByTestId('my-button');
  }
}
`,
		);
		const file2 = createFile(
			'/pages/PageB.ts',
			`
export class PageB {
  getButton() {
    return this.page.getByTestId('my-button');
  }
}
`,
		);

		const violations = rule.analyze(project, [file1, file2]);

		expect(violations.length).toBeGreaterThanOrEqual(1);
		expect(violations[0].message).toContain('my-button');
	});

	test('allows unique test IDs', ({ project, createFile }) => {
		const file1 = createFile(
			'/pages/PageA.ts',
			`
export class PageA {
  getSomething() {
    return this.page.getByTestId('page-a-button');
  }
}
`,
		);
		const file2 = createFile(
			'/pages/PageB.ts',
			`
export class PageB {
  getButton() {
    return this.page.getByTestId('page-b-button');
  }
}
`,
		);

		const violations = rule.analyze(project, [file1, file2]);

		expect(violations).toHaveLength(0);
	});

	test('allows same test ID within same file', ({ project, createFile }) => {
		const file = createFile(
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

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('separates components and pages scopes', ({ project, createFile }) => {
		const pageFile = createFile(
			'/pages/PageA.ts',
			`
export class PageA {
  getSomething() {
    return this.page.getByTestId('shared-id');
  }
}
`,
		);
		const componentFile = createFile(
			'/pages/components/ComponentA.ts',
			`
export class ComponentA {
  getSomething() {
    return this.root.getByTestId('shared-id');
  }
}
`,
		);

		const violations = rule.analyze(project, [pageFile, componentFile]);

		expect(violations).toHaveLength(0);
	});

	test('skips dynamic test IDs (template literals)', ({ project, createFile }) => {
		const file1 = createFile(
			'/pages/PageA.ts',
			`
export class PageA {
  getSomething(id: string) {
    return this.page.getByTestId(\`item-\${id}\`);
  }
}
`,
		);
		const file2 = createFile(
			'/pages/PageB.ts',
			`
export class PageB {
  getItem(id: string) {
    return this.page.getByTestId(\`item-\${id}\`);
  }
}
`,
		);

		const violations = rule.analyze(project, [file1, file2]);

		expect(violations).toHaveLength(0);
	});
});
