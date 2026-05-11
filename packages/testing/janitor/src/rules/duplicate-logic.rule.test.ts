import { Project } from 'ts-morph';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { setConfig, resetConfig, defaultConfig } from '../config.js';
import { DuplicateLogicRule } from './duplicate-logic.rule.js';

describe('DuplicateLogicRule', () => {
	const rule = new DuplicateLogicRule();

	function createTestProject(files: Record<string, string>): Project {
		const project = new Project({ useInMemoryFileSystem: true });
		for (const [path, content] of Object.entries(files)) {
			project.createSourceFile(path, content);
		}
		return project;
	}

	beforeEach(() => {
		setConfig({
			...defaultConfig,
			rootDir: '/test-root',
			patterns: {
				...defaultConfig.patterns,
				pages: ['pages/**/*.ts'],
				tests: ['tests/**/*.spec.ts'],
				flows: ['composables/**/*.ts'],
				helpers: ['helpers/**/*.ts'],
			},
		});
	});

	afterEach(() => {
		resetConfig();
	});

	describe('duplicate methods detection', () => {
		it('detects duplicate methods across page objects', () => {
			const project = createTestProject({
				// Use paths that match pages/**/*.ts pattern
				'/test-root/pages/workflow/PageA.ts': `
					export class PageA {
						async duplicateMethod() {
							await this.page.click('button');
							await this.page.fill('input', 'text');
							await this.page.waitForSelector('.done');
						}
					}
				`,
				'/test-root/pages/workflow/PageB.ts': `
					export class PageB {
						async anotherDuplicate() {
							await this.page.click('button');
							await this.page.fill('input', 'text');
							await this.page.waitForSelector('.done');
						}
					}
				`,
			});

			const files = project.getSourceFiles();
			const violations = rule.analyze(project, files);

			expect(violations.length).toBe(1);
			expect(violations[0].message).toContain('Duplicate method logic');
			expect(violations[0].message).toContain('PageB.anotherDuplicate()');
			expect(violations[0].message).toContain('PageA.duplicateMethod()');
		});

		it('ignores methods with different structure', () => {
			const project = createTestProject({
				'/test-root/pages/workflow/PageA.ts': `
					export class PageA {
						async methodA() {
							await this.page.click('button');
							await this.page.fill('input', 'text');
							await this.page.waitForSelector('.done');
						}
					}
				`,
				'/test-root/pages/workflow/PageB.ts': `
					export class PageB {
						async methodB() {
							await this.page.click('button');
							await this.page.fill('input', 'different');
							// Different - extra statement
							console.log('extra');
							await this.page.waitForSelector('.done');
						}
					}
				`,
			});

			const files = project.getSourceFiles();
			const violations = rule.analyze(project, files);

			expect(violations.length).toBe(0);
		});

		it('ignores methods in the same file', () => {
			const project = createTestProject({
				'/test-root/pages/workflow/PageA.ts': `
					export class PageA {
						async methodA() {
							await this.page.click('button');
							await this.page.fill('input', 'text');
							await this.page.waitForSelector('.done');
						}

						async methodB() {
							await this.page.click('button');
							await this.page.fill('input', 'text');
							await this.page.waitForSelector('.done');
						}
					}
				`,
			});

			const files = project.getSourceFiles();
			const violations = rule.analyze(project, files);

			// Same file duplicates are allowed (may be intentional)
			expect(violations.length).toBe(0);
		});
	});

	describe('duplicate test detection', () => {
		it('detects duplicate test bodies', () => {
			const project = createTestProject({
				// Use subdirectory to match tests/**/*.spec.ts pattern
				'/test-root/tests/e2e/test1.spec.ts': `
					test('first test', async ({ page }) => {
						await page.goto('/home');
						await page.click('button');
						await page.waitForSelector('.done');
					});
				`,
				'/test-root/tests/e2e/test2.spec.ts': `
					test('second test', async ({ page }) => {
						await page.goto('/home');
						await page.click('button');
						await page.waitForSelector('.done');
					});
				`,
			});

			const files = project.getSourceFiles();
			const violations = rule.analyze(project, files);

			expect(violations.length).toBe(1);
			expect(violations[0].message).toContain('Duplicate test logic');
		});
	});

	describe('test duplicating method', () => {
		it('detects when test duplicates page object method', () => {
			const project = createTestProject({
				// Use subdirectory to match pages/**/*.ts pattern
				'/test-root/pages/auth/HomePage.ts': `
					export class HomePage {
						async login() {
							await this.page.fill('#user', 'test');
							await this.page.fill('#pass', 'pass');
							await this.page.click('#submit');
						}
					}
				`,
				// Use subdirectory to match tests/**/*.spec.ts pattern
				'/test-root/tests/e2e/login.spec.ts': `
					test('should login', async ({ page }) => {
						await page.fill('#user', 'test');
						await page.fill('#pass', 'pass');
						await page.click('#submit');
					});
				`,
			});

			const files = project.getSourceFiles();
			const violations = rule.analyze(project, files);

			// Should detect that test duplicates HomePage.login()
			expect(violations.length).toBe(1);
			expect(violations[0].message).toContain('Test duplicates existing method');
			expect(violations[0].message).toContain('HomePage.login()');
		});
	});

	describe('minStatements threshold', () => {
		it('ignores methods with fewer than 2 statements', () => {
			const project = createTestProject({
				'/test-root/pages/workflow/PageA.ts': `
					export class PageA {
						async shortMethod() {
							await this.page.click('button');
						}
					}
				`,
				'/test-root/pages/workflow/PageB.ts': `
					export class PageB {
						async anotherShort() {
							await this.page.click('button');
						}
					}
				`,
			});

			const files = project.getSourceFiles();
			const violations = rule.analyze(project, files);

			// Only 1 statement, below threshold of 2
			expect(violations.length).toBe(0);
		});

		it('detects duplicates with exactly 2 statements', () => {
			const project = createTestProject({
				'/test-root/pages/workflow/PageA.ts': `
					export class PageA {
						async twoStatements() {
							await this.page.click('button');
							await this.page.fill('input', 'text');
						}
					}
				`,
				'/test-root/pages/workflow/PageB.ts': `
					export class PageB {
						async alsoTwoStatements() {
							await this.page.click('button');
							await this.page.fill('input', 'text');
						}
					}
				`,
			});

			const files = project.getSourceFiles();
			const violations = rule.analyze(project, files);

			// 2 statements meets the threshold
			expect(violations.length).toBe(1);
		});
	});
});
