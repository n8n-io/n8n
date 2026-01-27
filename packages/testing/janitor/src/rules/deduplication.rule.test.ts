import { Project } from 'ts-morph';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { DeduplicationRule } from './deduplication.rule.js';
import { setConfig, resetConfig, defineConfig } from '../config.js';

describe('DeduplicationRule', () => {
	let project: Project;
	let rule: DeduplicationRule;

	beforeEach(() => {
		project = new Project({ useInMemoryFileSystem: true });
		rule = new DeduplicationRule();

		setConfig(
			defineConfig({
				rootDir: '/',
				patterns: {
					pages: ['pages/**/*.ts'],
					components: ['pages/components/**/*.ts'],
					flows: ['composables/**/*.ts'],
					tests: ['tests/**/*.spec.ts'],
					services: ['services/**/*.ts'],
					fixtures: ['fixtures/**/*.ts'],
					helpers: ['helpers/**/*.ts'],
					factories: ['factories/**/*.ts'],
					testData: [],
				},
			}),
		);
	});

	afterEach(() => {
		resetConfig();
	});

	it('detects duplicate test IDs across files', () => {
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

		const violations = rule.analyze(project, [file1, file2]);

		expect(violations.length).toBeGreaterThanOrEqual(1);
		expect(violations[0].message).toContain('my-button');
	});

	it('allows unique test IDs', () => {
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

		const violations = rule.analyze(project, [file1, file2]);

		expect(violations).toHaveLength(0);
	});

	it('allows same test ID within same file', () => {
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

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	it('separates components and pages scopes', () => {
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

		const violations = rule.analyze(project, [pageFile, componentFile]);

		expect(violations).toHaveLength(0);
	});

	it('skips dynamic test IDs (template literals)', () => {
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

		const violations = rule.analyze(project, [file1, file2]);

		expect(violations).toHaveLength(0);
	});
});
