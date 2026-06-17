import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createProject, createInMemoryProject } from './project-loader.js';

describe('project-loader', () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'janitor-project-loader-test-'));

		// Create a minimal tsconfig.json
		const tsconfig = {
			compilerOptions: {
				target: 'ES2020',
				module: 'ESNext',
				moduleResolution: 'node',
				strict: true,
			},
			include: ['**/*.ts'],
		};
		fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	describe('createProject', () => {
		it('creates a project with the given root directory', () => {
			const { project, root } = createProject(tempDir);

			expect(root).toBe(tempDir);
			expect(project).toBeDefined();
		});

		it('returns a ts-morph Project instance', () => {
			const { project } = createProject(tempDir);

			// Verify it has ts-morph Project methods
			expect(typeof project.getSourceFiles).toBe('function');
			expect(typeof project.addSourceFilesAtPaths).toBe('function');
			expect(typeof project.createSourceFile).toBe('function');
		});

		it('can load source files from the project directory', () => {
			// Create a test file
			const pagesDir = path.join(tempDir, 'pages');
			fs.mkdirSync(pagesDir, { recursive: true });
			fs.writeFileSync(path.join(pagesDir, 'TestPage.ts'), 'export class TestPage { foo() {} }');

			const { project } = createProject(tempDir);

			// Add source files matching the glob
			const files = project.addSourceFilesAtPaths(path.join(tempDir, 'pages/**/*.ts'));

			expect(files.length).toBe(1);
			expect(files[0].getFilePath()).toContain('TestPage.ts');
		});

		it('project can parse TypeScript classes and methods', () => {
			// Create a test file with a class
			fs.writeFileSync(
				path.join(tempDir, 'TestClass.ts'),
				`export class TestClass {
					publicMethod() { return 1; }
					private privateMethod() { return 2; }
				}`,
			);

			const { project } = createProject(tempDir);
			const files = project.addSourceFilesAtPaths(path.join(tempDir, '*.ts'));

			expect(files.length).toBe(1);

			const classes = files[0].getClasses();
			expect(classes.length).toBe(1);
			expect(classes[0].getName()).toBe('TestClass');

			const methods = classes[0].getMethods();
			expect(methods.length).toBe(2);
		});
	});

	describe('createInMemoryProject', () => {
		it('creates an in-memory project for testing', () => {
			const project = createInMemoryProject();

			expect(project).toBeDefined();
			expect(typeof project.getSourceFiles).toBe('function');
		});

		it('can add and retrieve source files', () => {
			const project = createInMemoryProject();

			const sourceFile = project.createSourceFile('test.ts', 'export const foo = 42;');

			expect(sourceFile).toBeDefined();
			expect(sourceFile.getFilePath()).toContain('test.ts');

			const files = project.getSourceFiles();
			expect(files.length).toBe(1);
		});

		it('can parse TypeScript AST in memory', () => {
			const project = createInMemoryProject();

			const sourceFile = project.createSourceFile(
				'pages/TestPage.ts',
				`export class TestPage {
					container = this.page.locator('.container');
					async click() { await this.container.click(); }
				}`,
			);

			const classes = sourceFile.getClasses();
			expect(classes.length).toBe(1);
			expect(classes[0].getName()).toBe('TestPage');

			const properties = classes[0].getProperties();
			expect(properties.length).toBe(1);
			expect(properties[0].getName()).toBe('container');
		});

		it('supports multiple files with imports', () => {
			const project = createInMemoryProject();

			project.createSourceFile('base.ts', 'export class BasePage { protected page: any; }');

			project.createSourceFile(
				'derived.ts',
				`import { BasePage } from './base';
				export class DerivedPage extends BasePage {}`,
			);

			const files = project.getSourceFiles();
			expect(files.length).toBe(2);
		});
	});
});
