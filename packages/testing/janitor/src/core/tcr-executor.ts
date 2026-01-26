/**
 * TCR Executor - Test && Commit || Revert workflow
 */

import { execSync } from 'child_process';
import * as path from 'path';
import { Project } from 'ts-morph';
import { diffFileMethods, type MethodChange } from './ast-diff-analyzer.js';
import { MethodUsageAnalyzer, type MethodUsageIndex } from './method-usage-analyzer.js';
import { getRootDir } from '../utils/paths.js';
import { RuleRunner } from './rule-runner.js';
import { createProject } from './project-loader.js';
import { BoundaryProtectionRule } from '../rules/boundary-protection.rule.js';
import { ScopeLockdownRule } from '../rules/scope-lockdown.rule.js';
import { SelectorPurityRule } from '../rules/selector-purity.rule.js';
import { DeadCodeRule } from '../rules/dead-code.rule.js';
import { ApiPurityRule } from '../rules/api-purity.rule.js';
import { NoPageInFlowRule } from '../rules/no-page-in-flow.rule.js';
import { DeduplicationRule } from '../rules/deduplication.rule.js';
import { TestDataHygieneRule } from '../rules/test-data-hygiene.rule.js';

export interface TcrOptions {
	baseRef?: string;
	execute?: boolean;
	commitMessage?: string;
	verbose?: boolean;
	skipRules?: boolean;
	skipTypecheck?: boolean;
	targetBranch?: string;
	maxDiffLines?: number;
	testCommand?: string;
}

export interface TcrResult {
	success: boolean;
	failedStep?: 'rules' | 'typecheck' | 'tests' | 'diff-too-large';
	changedFiles: string[];
	changedMethods: MethodChange[];
	affectedTests: string[];
	testsRun: string[];
	testsPassed: boolean;
	ruleViolations: number;
	typecheckPassed: boolean;
	action: 'commit' | 'revert' | 'dry-run';
	durationMs: number;
	totalDiffLines?: number;
	testCommand?: string;
}

export class TcrExecutor {
	private project: Project;
	private methodUsageIndex: MethodUsageIndex | null = null;

	constructor() {
		const root = getRootDir();
		this.project = new Project({
			tsConfigFilePath: path.join(root, 'tsconfig.json'),
			skipAddingFilesFromTsConfig: false,
		});
	}

	async run(options: TcrOptions = {}): Promise<TcrResult> {
		const startTime = performance.now();
		const {
			baseRef = 'HEAD',
			execute = false,
			verbose = false,
			skipRules = false,
			skipTypecheck = false,
			targetBranch,
			maxDiffLines,
			testCommand,
		} = options;

		const changedFiles = this.getChangedFiles(targetBranch);

		if (maxDiffLines && changedFiles.length > 0) {
			const totalDiffLines = this.getTotalDiffLines(targetBranch);
			if (totalDiffLines > maxDiffLines) {
				if (verbose)
					console.log(`\n✗ Diff too large: ${totalDiffLines} lines exceeds max ${maxDiffLines}`);
				return {
					success: false,
					failedStep: 'diff-too-large',
					changedFiles,
					changedMethods: [],
					affectedTests: [],
					testsRun: [],
					testsPassed: false,
					ruleViolations: 0,
					typecheckPassed: true,
					action: 'dry-run',
					durationMs: performance.now() - startTime,
					totalDiffLines,
				};
			}
			if (verbose) console.log(`Diff size: ${totalDiffLines} lines (max: ${maxDiffLines})`);
		}

		if (changedFiles.length === 0) {
			if (verbose) console.log('No changes detected');
			return {
				success: true,
				changedFiles: [],
				changedMethods: [],
				affectedTests: [],
				testsRun: [],
				testsPassed: true,
				ruleViolations: 0,
				typecheckPassed: true,
				action: 'dry-run',
				durationMs: performance.now() - startTime,
			};
		}

		if (verbose) {
			console.log(`Changed files: ${changedFiles.length}`);
			changedFiles.forEach((f) => console.log(`  - ${f}`));
		}

		let ruleViolations = 0;
		if (!skipRules) {
			if (verbose) console.log('\nRunning janitor rules...');
			ruleViolations = this.runRules(changedFiles, verbose);

			if (ruleViolations > 0) {
				if (verbose) console.log(`\n✗ Found ${ruleViolations} rule violation(s)`);
				if (execute) this.revert();

				return {
					success: false,
					failedStep: 'rules',
					changedFiles,
					changedMethods: [],
					affectedTests: [],
					testsRun: [],
					testsPassed: false,
					ruleViolations,
					typecheckPassed: true,
					action: execute ? 'revert' : 'dry-run',
					durationMs: performance.now() - startTime,
				};
			}
			if (verbose) console.log('✓ Rules passed');
		}

		let typecheckPassed = true;
		if (!skipTypecheck) {
			if (verbose) console.log('\nRunning typecheck...');
			typecheckPassed = this.runTypecheck(verbose);

			if (!typecheckPassed) {
				if (verbose) console.log('✗ Typecheck failed');
				if (execute) this.revert();

				return {
					success: false,
					failedStep: 'typecheck',
					changedFiles,
					changedMethods: [],
					affectedTests: [],
					testsRun: [],
					testsPassed: false,
					ruleViolations,
					typecheckPassed: false,
					action: execute ? 'revert' : 'dry-run',
					durationMs: performance.now() - startTime,
				};
			}
			if (verbose) console.log('✓ Typecheck passed');
		}

		const changedMethods: MethodChange[] = [];
		for (const file of changedFiles) {
			if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) {
				const diff = diffFileMethods(file, baseRef);
				changedMethods.push(...diff.changedMethods);
			}
		}

		if (verbose && changedMethods.length > 0) {
			console.log(`\nChanged methods: ${changedMethods.length}`);
			for (const change of changedMethods) {
				const symbol =
					change.changeType === 'added' ? '+' : change.changeType === 'removed' ? '-' : '~';
				console.log(`  ${symbol} ${change.className}.${change.methodName}`);
			}
		}

		const affectedTests = this.findAffectedTests(changedFiles, changedMethods);

		if (verbose) {
			console.log(`\nAffected tests: ${affectedTests.length}`);
			affectedTests.forEach((t) => console.log(`  - ${t}`));
		}

		if (affectedTests.length === 0) {
			if (verbose) console.log('\nNo tests affected by changes');

			if (execute) {
				this.commit(options.commitMessage || 'TCR: No tests affected');
				return {
					success: true,
					changedFiles,
					changedMethods,
					affectedTests: [],
					testsRun: [],
					testsPassed: true,
					ruleViolations,
					typecheckPassed,
					action: 'commit',
					durationMs: performance.now() - startTime,
				};
			}

			return {
				success: true,
				changedFiles,
				changedMethods,
				affectedTests: [],
				testsRun: [],
				testsPassed: true,
				ruleViolations,
				typecheckPassed,
				action: 'dry-run',
				durationMs: performance.now() - startTime,
			};
		}

		const testsPassed = await this.runTests(affectedTests, verbose, testCommand);

		let action: 'commit' | 'revert' | 'dry-run' = 'dry-run';
		if (execute) {
			if (testsPassed) {
				this.commit(options.commitMessage || 'TCR: Tests passed');
				action = 'commit';
			} else {
				this.revert();
				action = 'revert';
			}
		}

		return {
			success: testsPassed,
			failedStep: testsPassed ? undefined : 'tests',
			changedFiles,
			changedMethods,
			affectedTests,
			testsRun: affectedTests,
			testsPassed,
			ruleViolations,
			typecheckPassed,
			action,
			durationMs: performance.now() - startTime,
		};
	}

	private runRules(changedFiles: string[], verbose: boolean): number {
		const root = getRootDir();
		const runner = new RuleRunner();

		runner.registerRule(new BoundaryProtectionRule());
		runner.registerRule(new ScopeLockdownRule());
		runner.registerRule(new SelectorPurityRule());
		runner.registerRule(new NoPageInFlowRule());
		runner.registerRule(new ApiPurityRule());
		runner.registerRule(new DeadCodeRule());
		runner.registerRule(new DeduplicationRule());
		runner.registerRule(new TestDataHygieneRule());

		const { project } = createProject(root);

		const tsFiles = changedFiles
			.filter((f) => f.endsWith('.ts'))
			.map((f) => path.relative(root, f));

		if (tsFiles.length === 0) return 0;

		const report = runner.run(project, root, { files: tsFiles });

		if (verbose && report.summary.totalViolations > 0) {
			console.log(`\nViolations in changed files:`);
			for (const result of report.results) {
				if (result.violations.length > 0) {
					console.log(`  ${result.rule}: ${result.violations.length}`);
				}
			}
		}

		return report.summary.totalViolations;
	}

	private runTypecheck(verbose: boolean): boolean {
		const root = getRootDir();
		try {
			execSync('pnpm typecheck', { cwd: root, stdio: verbose ? 'inherit' : 'pipe' });
			return true;
		} catch {
			return false;
		}
	}

	private getGitRoot(): string {
		try {
			return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
		} catch {
			return getRootDir();
		}
	}

	private getChangedFiles(targetBranch?: string): string[] {
		const janitorRoot = getRootDir();
		const gitRoot = this.getGitRoot();

		try {
			if (targetBranch) {
				const output = execSync(`git diff --name-only ${targetBranch}...HEAD`, {
					cwd: gitRoot,
					encoding: 'utf-8',
				});

				const files: string[] = [];
				for (const line of output.split('\n')) {
					if (!line.trim()) continue;
					const fullPath = path.join(gitRoot, line);
					if (fullPath.startsWith(janitorRoot)) files.push(fullPath);
				}
				return files;
			}

			const status = execSync('git status --porcelain', { cwd: gitRoot, encoding: 'utf-8' });
			const files: string[] = [];

			for (const line of status.split('\n')) {
				if (!line.trim()) continue;
				const match = line.match(/^.{2}\s+(.+)$/);
				if (match) {
					const filePath = match[1];
					const actualPath = filePath.includes(' -> ') ? filePath.split(' -> ')[1] : filePath;
					const fullPath = path.join(gitRoot, actualPath);
					if (fullPath.startsWith(janitorRoot)) files.push(fullPath);
				}
			}

			return files;
		} catch {
			return [];
		}
	}

	private getTotalDiffLines(targetBranch?: string): number {
		const gitRoot = this.getGitRoot();

		try {
			const cmd = targetBranch ? `git diff --stat ${targetBranch}...HEAD` : 'git diff --stat HEAD';
			const output = execSync(cmd, { cwd: gitRoot, encoding: 'utf-8' });

			const lines = output.trim().split('\n');
			const summaryLine = lines[lines.length - 1];

			let total = 0;
			const insertionsMatch = summaryLine.match(/(\d+)\s+insertions?\(\+\)/);
			const deletionsMatch = summaryLine.match(/(\d+)\s+deletions?\(-\)/);

			if (insertionsMatch) total += parseInt(insertionsMatch[1], 10);
			if (deletionsMatch) total += parseInt(deletionsMatch[1], 10);

			return total;
		} catch {
			return 0;
		}
	}

	private commit(message: string): void {
		const gitRoot = this.getGitRoot();
		try {
			execSync('git add -A', { cwd: gitRoot });
			execSync(`git commit -m "${message}"`, { cwd: gitRoot });
			console.log(`\n✓ Committed: ${message}`);
		} catch (error) {
			console.error('Failed to commit:', error);
		}
	}

	private revert(): void {
		const gitRoot = this.getGitRoot();
		try {
			execSync('git checkout -- .', { cwd: gitRoot });
			console.log('\n✗ Reverted changes');
		} catch (error) {
			console.error('Failed to revert:', error);
		}
	}

	private findAffectedTests(changedFiles: string[], changedMethods: MethodChange[]): string[] {
		const affectedTests = new Set<string>();
		const root = getRootDir();

		// Separate changed test files from other files
		const changedTestFiles = changedFiles
			.filter((f) => f.endsWith('.spec.ts'))
			.map((f) => path.relative(root, f));

		// Build method usage index for modified/removed method lookup
		if (!this.methodUsageIndex) {
			const analyzer = new MethodUsageAnalyzer(this.project);
			this.methodUsageIndex = analyzer.buildIndex();
		}

		// Separate methods by change type
		const addedMethods = changedMethods.filter((m) => m.changeType === 'added');
		const modifiedOrRemovedMethods = changedMethods.filter((m) => m.changeType !== 'added');

		// For MODIFIED/REMOVED methods: use method usage index (existing behavior)
		for (const change of modifiedOrRemovedMethods) {
			const key = `${change.className}.${change.methodName}`;
			const usages = this.methodUsageIndex.methods[key] || [];
			for (const usage of usages) {
				affectedTests.add(usage.testFile);
			}
		}

		// For ADDED methods: check if changed test files use the new method
		// (since a new method can only be used by files that were also changed)
		if (addedMethods.length > 0 && changedTestFiles.length > 0) {
			for (const testFile of changedTestFiles) {
				const fullPath = path.join(root, testFile);
				const sourceFile = this.project.getSourceFile(fullPath);
				if (!sourceFile) continue;

				const content = sourceFile.getFullText();
				for (const method of addedMethods) {
					// Check if test file references the new method
					const methodPattern = new RegExp(`\\.${method.methodName}\\s*\\(`);
					if (methodPattern.test(content)) {
						affectedTests.add(testFile);
						break;
					}
				}
			}
		}

		// Also include any directly changed test files
		for (const testFile of changedTestFiles) {
			affectedTests.add(testFile);
		}

		return Array.from(affectedTests).sort();
	}

	private async runTests(
		testFiles: string[],
		verbose: boolean,
		testCommand?: string,
	): Promise<boolean> {
		const root = getRootDir();

		if (verbose) console.log(`\nRunning ${testFiles.length} test file(s)...`);

		try {
			// Build grep pattern from test file paths
			// Convert paths like "tests/e2e/workflows/editor/tags.spec.ts" to grep pattern
			const grepPattern = testFiles
				.map((f) => f.replace(/\//g, '\\/').replace(/\./g, '\\.'))
				.join('|');

			// Use pnpm test:local with grep for targeted test execution and 1 worker for stability
			const cmd = testCommand
				? `${testCommand} --grep="${grepPattern}"`
				: `pnpm test:local --grep="${grepPattern}" --workers=1`;

			if (verbose) console.log(`Command: ${cmd}`);

			execSync(cmd, { cwd: root, stdio: verbose ? 'inherit' : 'pipe' });
			return true;
		} catch {
			return false;
		}
	}
}

export function formatTcrResultConsole(result: TcrResult, verbose = false): void {
	console.log('\n====================================');
	console.log('         TCR RESULT');
	console.log('====================================\n');

	console.log(`Duration: ${(result.durationMs / 1000).toFixed(2)}s`);
	console.log(`Action taken: ${result.action}`);
	console.log(`Overall: ${result.success ? '✓ Success' : '✗ Failed'}`);

	if (result.failedStep) console.log(`Failed at: ${result.failedStep}`);

	if (result.changedFiles.length > 0) {
		console.log(`\nChanged files (${result.changedFiles.length}):`);
		result.changedFiles.forEach((f) => console.log(`  - ${f}`));
	}

	console.log('\nChecks:');
	if (result.totalDiffLines !== undefined) {
		const diffStatus = result.failedStep === 'diff-too-large' ? '✗ Too large' : '✓ OK';
		console.log(`  Diff size: ${diffStatus} (${result.totalDiffLines} lines)`);
	}
	console.log(
		`  Rules: ${result.ruleViolations === 0 ? '✓ Passed' : `✗ ${result.ruleViolations} violation(s)`}`,
	);
	console.log(`  Typecheck: ${result.typecheckPassed ? '✓ Passed' : '✗ Failed'}`);
	console.log(`  Tests: ${result.testsPassed ? '✓ Passed' : '✗ Failed'}`);

	if (verbose && result.changedMethods.length > 0) {
		console.log(`\nChanged methods (${result.changedMethods.length}):`);
		for (const change of result.changedMethods) {
			const symbol =
				change.changeType === 'added' ? '+' : change.changeType === 'removed' ? '-' : '~';
			console.log(`  ${symbol} ${change.className}.${change.methodName}`);
		}
	}

	if (result.affectedTests.length > 0) {
		console.log(`\nAffected tests (${result.affectedTests.length}):`);
		result.affectedTests.forEach((t) => console.log(`  - ${t}`));
	}

	console.log('');
}

export function formatTcrResultJSON(result: TcrResult): string {
	return JSON.stringify(result, null, 2);
}
