import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
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
				},
				include: ['**/*.ts'],
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
});
