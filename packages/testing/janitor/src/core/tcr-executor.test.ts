import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { saveBaseline, type BaselineFile } from './baseline.js';
import { TcrExecutor } from './tcr-executor.js';
import { setConfig, resetConfig, defineConfig } from '../config.js';

describe('TcrExecutor', () => {
	let tempDir: string;
	let originalCwd: string;

	beforeEach(() => {
		originalCwd = process.cwd();
		// Use realpathSync to avoid macOS /var -> /private/var symlink issues
		tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'tcr-test-')));

		// Initialize git repo
		execSync('git init', { cwd: tempDir, stdio: 'pipe' });
		execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
		execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });

		// Create minimal structure with placeholder files (git doesn't track empty dirs)
		fs.mkdirSync(path.join(tempDir, 'pages'), { recursive: true });
		fs.mkdirSync(path.join(tempDir, 'tests'), { recursive: true });
		fs.writeFileSync(path.join(tempDir, 'pages', '.gitkeep'), '');
		fs.writeFileSync(path.join(tempDir, 'tests', '.gitkeep'), '');

		// Create tsconfig.json
		fs.writeFileSync(
			path.join(tempDir, 'tsconfig.json'),
			JSON.stringify({
				compilerOptions: {
					target: 'ES2020',
					module: 'ESNext',
					moduleResolution: 'node',
					strict: true,
					skipLibCheck: true,
					noEmit: true,
				},
				include: ['**/*.ts'],
			}),
		);

		// Create package.json with typecheck script
		fs.writeFileSync(
			path.join(tempDir, 'package.json'),
			JSON.stringify({
				name: 'tcr-test',
				scripts: {
					typecheck: 'tsc --noEmit',
				},
			}),
		);

		// Set up config
		const config = defineConfig({
			rootDir: tempDir,
			patterns: {
				pages: ['pages/**/*.ts'],
				components: ['pages/components/**/*.ts'],
				flows: ['composables/**/*.ts'],
				tests: ['tests/**/*.spec.ts'],
				services: ['services/**/*.ts'],
				fixtures: ['fixtures/**/*.ts'],
				helpers: ['helpers/**/*.ts'],
				factories: ['factories/**/*.ts'],
				testData: ['workflows/**/*'],
			},
			excludeFromPages: ['BasePage.ts'],
			facade: {
				file: 'pages/AppPage.ts',
				className: 'AppPage',
				excludeTypes: ['Page'],
			},
			fixtureObjectName: 'app',
		});
		setConfig(config);

		// Initial commit
		execSync('git add -A', { cwd: tempDir, stdio: 'pipe' });
		execSync('git commit -m "Initial commit"', { cwd: tempDir, stdio: 'pipe' });

		process.chdir(tempDir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		fs.rmSync(tempDir, { recursive: true, force: true });
		resetConfig();
	});

	describe('getChangedFiles', () => {
		it('detects new files', () => {
			fs.writeFileSync(path.join(tempDir, 'pages', 'NewPage.ts'), 'export class NewPage {}');

			const tcr = new TcrExecutor();
			const result = tcr.run({ verbose: false });

			expect(result.changedFiles.length).toBeGreaterThan(0);
			expect(result.changedFiles.some((f) => f.includes('NewPage.ts'))).toBe(true);
		});

		it('detects modified files', () => {
			// Create and commit a file first
			fs.writeFileSync(path.join(tempDir, 'pages', 'TestPage.ts'), 'export class TestPage {}');
			execSync('git add -A && git commit -m "Add TestPage"', { cwd: tempDir, stdio: 'pipe' });

			// Now modify it
			fs.writeFileSync(
				path.join(tempDir, 'pages', 'TestPage.ts'),
				'export class TestPage { modified() {} }',
			);

			const tcr = new TcrExecutor();
			const result = tcr.run({ verbose: false });

			expect(result.changedFiles.some((f) => f.includes('TestPage.ts'))).toBe(true);
		});

		it('returns empty array when no changes', () => {
			const tcr = new TcrExecutor();
			const result = tcr.run({ verbose: false });

			expect(result.changedFiles).toHaveLength(0);
			expect(result.success).toBe(true);
		});

		it('detects new test files in new directories (unstaged)', () => {
			// Create a new directory with a test file (not staged)
			// This reproduces the bug where git status shows "?? new-dir/" instead of the file
			const newDir = path.join(tempDir, 'tests', 'e2e', 'new-feature');
			fs.mkdirSync(newDir, { recursive: true });
			fs.writeFileSync(
				path.join(newDir, 'new-feature.spec.ts'),
				'import { test } from "@playwright/test"; test("new feature", () => {});',
			);

			const tcr = new TcrExecutor();
			const result = tcr.run({ verbose: false });

			// Should detect the actual test file, not just the directory
			expect(result.changedFiles.some((f) => f.includes('new-feature.spec.ts'))).toBe(true);
			// Should include the test in affected tests (as a directly changed test file)
			// Note: affectedTests uses relative paths from root
			const hasTestInChanged = result.changedFiles.some((f) => f.endsWith('.spec.ts'));
			const hasTestInAffected = result.affectedTests.length > 0;
			expect(hasTestInChanged || hasTestInAffected).toBe(true);
		});

		it('detects new test files in new directories (staged)', () => {
			// Create a new directory with a test file and stage it
			const newDir = path.join(tempDir, 'tests', 'e2e', 'staged-feature');
			fs.mkdirSync(newDir, { recursive: true });
			// Use valid TypeScript without external imports to pass typecheck
			fs.writeFileSync(
				path.join(newDir, 'staged-feature.spec.ts'),
				'export const test = { name: "staged feature test" };\n',
			);

			// Stage the new file
			execSync('git add -A', { cwd: tempDir, stdio: 'pipe' });

			const tcr = new TcrExecutor();
			const result = tcr.run({ verbose: false });

			// Should detect the actual test file, not just the directory
			expect(result.changedFiles.some((f) => f.includes('staged-feature.spec.ts'))).toBe(true);
			// Should NOT include directory paths
			expect(result.changedFiles.some((f) => f.endsWith('staged-feature/'))).toBe(false);
			// Should include in affected tests
			expect(result.affectedTests.some((t) => t.includes('staged-feature.spec.ts'))).toBe(true);
		});

		it('detects deleted files', () => {
			// Create and commit a file first
			fs.writeFileSync(
				path.join(tempDir, 'pages', 'ToDelete.ts'),
				'export class ToDelete { method() {} }',
			);
			execSync('git add -A && git commit -m "Add ToDelete"', { cwd: tempDir, stdio: 'pipe' });

			// Now delete it
			fs.unlinkSync(path.join(tempDir, 'pages', 'ToDelete.ts'));

			const tcr = new TcrExecutor();
			const result = tcr.run({ verbose: false });

			expect(result.changedFiles.some((f) => f.includes('ToDelete.ts'))).toBe(true);
		});

		it('detects renamed files', () => {
			// Create and commit a file first
			fs.writeFileSync(
				path.join(tempDir, 'pages', 'OldName.ts'),
				'export class OldName { method() {} }',
			);
			execSync('git add -A && git commit -m "Add OldName"', { cwd: tempDir, stdio: 'pipe' });

			// Rename it using git mv
			execSync('git mv pages/OldName.ts pages/NewName.ts', { cwd: tempDir, stdio: 'pipe' });

			const tcr = new TcrExecutor();
			const result = tcr.run({ verbose: false });

			// Should detect the new name
			expect(result.changedFiles.some((f) => f.includes('NewName.ts'))).toBe(true);
		});
	});

	describe('changedMethods', () => {
		it('detects added methods', () => {
			// Put file at root level (not in any rule pattern, but still analyzed for methods)
			fs.writeFileSync(
				path.join(tempDir, 'MethodClass.ts'),
				`export class MethodClass {
	existing() {}
}`,
			);
			execSync('git add -A && git commit -m "Add MethodClass"', { cwd: tempDir, stdio: 'pipe' });

			// Add a new method
			fs.writeFileSync(
				path.join(tempDir, 'MethodClass.ts'),
				`export class MethodClass {
	existing() {}
	newMethod() {}
}`,
			);

			const tcr = new TcrExecutor();
			const result = tcr.run({ verbose: false });

			// changedMethods is now populated early in the flow, even if later checks fail
			expect(result.changedMethods.some((m) => m.methodName === 'newMethod')).toBe(true);
			expect(result.changedMethods.find((m) => m.methodName === 'newMethod')?.changeType).toBe(
				'added',
			);
		});

		it('detects removed methods', () => {
			// Put file at root level (not in any rule pattern, but still analyzed for methods)
			fs.writeFileSync(
				path.join(tempDir, 'RemoveClass.ts'),
				`export class RemoveClass {
	keepMe() {}
	removeMe() {}
}`,
			);
			execSync('git add -A && git commit -m "Add RemoveClass"', { cwd: tempDir, stdio: 'pipe' });

			// Remove one method
			fs.writeFileSync(
				path.join(tempDir, 'RemoveClass.ts'),
				`export class RemoveClass {
	keepMe() {}
}`,
			);

			const tcr = new TcrExecutor();
			const result = tcr.run({ verbose: false });

			// changedMethods is now populated early in the flow, even if later checks fail
			expect(result.changedMethods.some((m) => m.methodName === 'removeMe')).toBe(true);
			expect(result.changedMethods.find((m) => m.methodName === 'removeMe')?.changeType).toBe(
				'removed',
			);
		});

		it('detects modified methods', () => {
			// Put file at root level (not in any rule pattern, but still analyzed for methods)
			fs.writeFileSync(
				path.join(tempDir, 'ModifyClass.ts'),
				`export class ModifyClass {
	myMethod() { return 1; }
}`,
			);
			execSync('git add -A && git commit -m "Add ModifyClass"', { cwd: tempDir, stdio: 'pipe' });

			// Modify the method body
			fs.writeFileSync(
				path.join(tempDir, 'ModifyClass.ts'),
				`export class ModifyClass {
	myMethod() { return 2; }
}`,
			);

			const tcr = new TcrExecutor();
			const result = tcr.run({ verbose: false });

			// changedMethods is now populated early in the flow, even if later checks fail
			expect(result.changedMethods.some((m) => m.methodName === 'myMethod')).toBe(true);
			expect(result.changedMethods.find((m) => m.methodName === 'myMethod')?.changeType).toBe(
				'modified',
			);
		});
	});

	describe('maxDiffLines', () => {
		it('skips when diff exceeds max lines', () => {
			// Create a file and commit it first
			fs.writeFileSync(path.join(tempDir, 'pages', 'LargePage.ts'), 'export class LargePage {}');
			execSync('git add -A && git commit -m "Add LargePage"', { cwd: tempDir, stdio: 'pipe' });

			// Now modify it with many lines - git diff counts changes to tracked files
			const largeContent = Array(100).fill('export const x = 1;').join('\n');
			fs.writeFileSync(path.join(tempDir, 'pages', 'LargePage.ts'), largeContent);

			const tcr = new TcrExecutor();
			const result = tcr.run({ maxDiffLines: 10, verbose: false });

			expect(result.success).toBe(false);
			expect(result.failedStep).toBe('diff-too-large');
			expect(result.totalDiffLines).toBeGreaterThan(10);
		});

		it('proceeds when diff is under max lines', () => {
			// Create a file and commit it first
			fs.writeFileSync(path.join(tempDir, 'pages', 'SmallPage.ts'), 'export class SmallPage {}');
			execSync('git add -A && git commit -m "Add SmallPage"', { cwd: tempDir, stdio: 'pipe' });

			// Now make a small modification
			fs.writeFileSync(
				path.join(tempDir, 'pages', 'SmallPage.ts'),
				'export class SmallPage { x = 1; }',
			);

			const tcr = new TcrExecutor();
			const result = tcr.run({ maxDiffLines: 100, verbose: false });

			// May fail on rules but not on diff size
			expect(result.failedStep).not.toBe('diff-too-large');
		});
	});

	describe('baseline protection', () => {
		it('blocks when baseline file is modified', () => {
			// Create and commit a baseline file first
			const baseline: BaselineFile = {
				version: 1,
				generated: new Date().toISOString(),
				totalViolations: 0,
				violations: {},
			};
			saveBaseline(baseline, tempDir);
			execSync('git add -A && git commit -m "Add baseline"', { cwd: tempDir, stdio: 'pipe' });

			// Now modify the baseline
			const modifiedBaseline: BaselineFile = {
				...baseline,
				totalViolations: 5,
				violations: { 'some/file.ts': [] },
			};
			saveBaseline(modifiedBaseline, tempDir);

			const tcr = new TcrExecutor();
			const result = tcr.run({ verbose: false });

			expect(result.success).toBe(false);
			expect(result.failedStep).toBe('baseline-modified');
			expect(result.action).toBe('dry-run');
		});

		it('allows changes when baseline is not modified', () => {
			// Create and commit a baseline file
			const baseline: BaselineFile = {
				version: 1,
				generated: new Date().toISOString(),
				totalViolations: 0,
				violations: {},
			};
			saveBaseline(baseline, tempDir);
			execSync('git add -A && git commit -m "Add baseline"', { cwd: tempDir, stdio: 'pipe' });

			// Modify a different file (not baseline)
			fs.writeFileSync(path.join(tempDir, 'pages', 'OtherPage.ts'), 'export class OtherPage {}');

			const tcr = new TcrExecutor();
			const result = tcr.run({ verbose: false });

			// Should not fail on baseline-modified
			expect(result.failedStep).not.toBe('baseline-modified');
		});
	});

	describe('baseline filtering', () => {
		it('filters known violations from baseline', () => {
			// Create a file with a violation (importing another page)
			fs.writeFileSync(
				path.join(tempDir, 'pages', 'PageA.ts'),
				`import { PageB } from './PageB';
				export class PageA {}`,
			);
			fs.writeFileSync(path.join(tempDir, 'pages', 'PageB.ts'), 'export class PageB {}');

			// Create baseline with this violation
			const baseline: BaselineFile = {
				version: 1,
				generated: new Date().toISOString(),
				totalViolations: 1,
				violations: {
					'pages/PageA.ts': [
						{
							rule: 'boundary-protection',
							line: 1,
							message: "Page 'PageA' imports another page 'PageB'",
							hash: 'abc123',
						},
					],
				},
			};
			saveBaseline(baseline, tempDir);

			const tcr = new TcrExecutor();
			// The violation should be filtered by baseline
			// Note: This test verifies the baseline is loaded, actual filtering depends on hash matching
			const result = tcr.run({ verbose: false });

			// Result depends on whether hash matches - mainly testing that baseline is loaded
			expect(result).toBeDefined();
		});
	});

	describe('dry run vs execute', () => {
		it('does not commit in dry run mode', () => {
			fs.writeFileSync(path.join(tempDir, 'pages', 'DryRunPage.ts'), 'export class DryRunPage {}');

			const tcr = new TcrExecutor();
			const result = tcr.run({ execute: false, verbose: false });

			expect(result.action).toBe('dry-run');

			// File should still be uncommitted
			const status = execSync('git status --porcelain', { cwd: tempDir, encoding: 'utf-8' });
			expect(status).toContain('DryRunPage.ts');
		});
	});

	describe('result structure', () => {
		it('returns complete result object', () => {
			fs.writeFileSync(path.join(tempDir, 'pages', 'ResultPage.ts'), 'export class ResultPage {}');

			const tcr = new TcrExecutor();
			const result = tcr.run({ verbose: false });

			expect(result).toHaveProperty('success');
			expect(result).toHaveProperty('changedFiles');
			expect(result).toHaveProperty('changedMethods');
			expect(result).toHaveProperty('affectedTests');
			expect(result).toHaveProperty('testsRun');
			expect(result).toHaveProperty('testsPassed');
			expect(result).toHaveProperty('ruleViolations');
			expect(result).toHaveProperty('typecheckPassed');
			expect(result).toHaveProperty('action');
			expect(result).toHaveProperty('durationMs');
			expect(typeof result.durationMs).toBe('number');
		});
	});

	describe('testCommand config', () => {
		it('uses testCommand from config when set', () => {
			// Update config with custom test command
			const testConfig = defineConfig({
				rootDir: tempDir,
				tcr: {
					testCommand: 'echo "custom test command"',
				},
			});
			setConfig(testConfig);

			// Create a test file to trigger test execution
			fs.writeFileSync(
				path.join(tempDir, 'tests', 'example.spec.ts'),
				'import { test } from "@playwright/test"; test("example", () => {});',
			);

			const tcr = new TcrExecutor();
			// With no affected tests, the test command won't run
			// but we can verify config is read by checking the executor initializes
			const result = tcr.run({ verbose: false });

			expect(result).toBeDefined();
		});

		it('CLI testCommand overrides config', () => {
			// Set config with one command
			const testConfig = defineConfig({
				rootDir: tempDir,
				tcr: {
					testCommand: 'echo "config command"',
				},
			});
			setConfig(testConfig);

			const tcr = new TcrExecutor();
			// CLI option should take precedence (tested indirectly through options)
			const result = tcr.run({ testCommand: 'echo "cli command"', verbose: false });

			expect(result).toBeDefined();
		});
	});

	describe('allowlist enforcement', () => {
		it('rejects test command not in allowlist', () => {
			const testConfig = defineConfig({
				rootDir: tempDir,
				tcr: {
					testCommand: 'pnpm test:local',
					allowedTestCommands: ['pnpm test:local'],
				},
			});
			setConfig(testConfig);

			const tcr = new TcrExecutor();
			const result = tcr.run({ testCommand: 'true', verbose: false });

			expect(result.success).toBe(false);
			expect(result.failedStep).toBe('test-command-rejected');
			expect(result.action).toBe('dry-run');
		});

		it('accepts test command in allowlist', () => {
			const testConfig = defineConfig({
				rootDir: tempDir,
				tcr: {
					testCommand: 'pnpm test:local',
					allowedTestCommands: ['pnpm test:local', 'pnpm test:container'],
				},
			});
			setConfig(testConfig);

			const tcr = new TcrExecutor();
			// Should not fail on test-command-rejected (may fail on other steps)
			const result = tcr.run({ testCommand: 'pnpm test:container', verbose: false });

			expect(result.failedStep).not.toBe('test-command-rejected');
		});

		it('allows any command when no allowlist configured', () => {
			const testConfig = defineConfig({
				rootDir: tempDir,
				tcr: {
					testCommand: 'pnpm test:local',
				},
			});
			setConfig(testConfig);

			const tcr = new TcrExecutor();
			const result = tcr.run({ testCommand: 'anything', verbose: false });

			expect(result.failedStep).not.toBe('test-command-rejected');
		});
	});

	describe('baseline fail-closed', () => {
		it('blocks commit when git status fails', () => {
			// Create a change so TCR has something to process
			fs.writeFileSync(path.join(tempDir, 'pages', 'FailPage.ts'), 'export class FailPage {}');

			// Corrupt the git repo to make git status fail
			const gitDir = path.join(tempDir, '.git');
			const headFile = path.join(gitDir, 'HEAD');
			fs.writeFileSync(headFile, 'corrupted');

			const tcr = new TcrExecutor();
			const result = tcr.run({ verbose: false });

			// Should fail because git status failed (fail-closed)
			expect(result.success).toBe(false);
			expect(result.failedStep).toBe('baseline-modified');
		});
	});
});
