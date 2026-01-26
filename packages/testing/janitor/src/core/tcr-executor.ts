/**
 * TCR Executor - Test && Commit || Revert workflow
 *
 * Orchestrates the TCR workflow:
 * 1. Detect changed files (git status)
 * 2. Run janitor rules on changed files
 * 3. Run typecheck
 * 4. Analyze which methods changed (AST diff)
 * 5. Find affected tests (method usage index)
 * 6. Run only affected tests
 * 7. Commit on success, revert on failure
 */

import { execSync } from 'child_process';
import * as path from 'path';
import { Project } from 'ts-morph';
import { diffFileMethods, type MethodChange } from './ast-diff-analyzer.js';
import { MethodUsageAnalyzer, type MethodUsageIndex } from './method-usage-analyzer.js';
import { ImpactAnalyzer } from './impact-analyzer.js';
import { getRootDir } from '../utils/paths.js';
import { RuleRunner } from './rule-runner.js';
import { createProject } from './project-loader.js';

// Import rules
import { BoundaryProtectionRule } from '../rules/boundary-protection.rule.js';
import { ScopeLockdownRule } from '../rules/scope-lockdown.rule.js';
import { SelectorPurityRule } from '../rules/selector-purity.rule.js';
import { DeadCodeRule } from '../rules/dead-code.rule.js';
import { ApiPurityRule } from '../rules/api-purity.rule.js';
import { NoPageInFlowRule } from '../rules/no-page-in-flow.rule.js';
import { DeduplicationRule } from '../rules/deduplication.rule.js';
import { TestDataHygieneRule } from '../rules/test-data-hygiene.rule.js';

// ============================================================================
// Types
// ============================================================================

export interface TcrOptions {
	/** Git ref to compare against (default: HEAD) */
	baseRef?: string;
	/** Whether to actually commit/revert (false = dry run) */
	execute?: boolean;
	/** Custom commit message */
	commitMessage?: string;
	/** Verbose output */
	verbose?: boolean;
	/** Skip janitor rules check */
	skipRules?: boolean;
	/** Skip typecheck */
	skipTypecheck?: boolean;
	/** Branch to diff against (for changed files) */
	targetBranch?: string;
	/** Maximum diff lines allowed (skip if exceeded) */
	maxDiffLines?: number;
	/** Custom test command (test files get appended) */
	testCommand?: string;
}

export interface TcrResult {
	/** Overall success - all steps passed */
	success: boolean;
	/** Which step failed (if any) */
	failedStep?: 'rules' | 'typecheck' | 'tests' | 'diff-too-large';
	/** Files that changed */
	changedFiles: string[];
	/** Methods that changed */
	changedMethods: MethodChange[];
	/** Test files affected by changes */
	affectedTests: string[];
	/** Tests that were run */
	testsRun: string[];
	/** Whether tests passed */
	testsPassed: boolean;
	/** Number of rule violations found */
	ruleViolations: number;
	/** Whether typecheck passed */
	typecheckPassed: boolean;
	/** Action taken: 'commit', 'revert', or 'dry-run' */
	action: 'commit' | 'revert' | 'dry-run';
	/** Duration in milliseconds */
	durationMs: number;
	/** Total diff lines (if maxDiffLines was specified) */
	totalDiffLines?: number;
	/** Test command that was used */
	testCommand?: string;
}

// ============================================================================
// TCR Executor
// ============================================================================

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

	/**
	 * Run the TCR workflow
	 */
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

		// Step 1: Get changed files from git
		const changedFiles = this.getChangedFiles(targetBranch);

		// Step 1.5: Check diff size if maxDiffLines specified
		if (maxDiffLines && changedFiles.length > 0) {
			const totalDiffLines = this.getTotalDiffLines(targetBranch);
			if (totalDiffLines > maxDiffLines) {
				if (verbose) {
					console.log(`\n✗ Diff too large: ${totalDiffLines} lines exceeds max ${maxDiffLines}`);
				}
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
			if (verbose) {
				console.log(`Diff size: ${totalDiffLines} lines (max: ${maxDiffLines})`);
			}
		}

		if (changedFiles.length === 0) {
			if (verbose) {
				console.log('No changes detected');
			}
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

		// Step 2: Run janitor rules on changed files
		let ruleViolations = 0;
		if (!skipRules) {
			if (verbose) {
				console.log('\nRunning janitor rules...');
			}
			ruleViolations = this.runRules(changedFiles, verbose);

			if (ruleViolations > 0) {
				if (verbose) {
					console.log(`\n✗ Found ${ruleViolations} rule violation(s)`);
				}

				if (execute) {
					this.revert();
				}

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

			if (verbose) {
				console.log('✓ Rules passed');
			}
		}

		// Step 3: Run typecheck
		let typecheckPassed = true;
		if (!skipTypecheck) {
			if (verbose) {
				console.log('\nRunning typecheck...');
			}
			typecheckPassed = this.runTypecheck(verbose);

			if (!typecheckPassed) {
				if (verbose) {
					console.log('✗ Typecheck failed');
				}

				if (execute) {
					this.revert();
				}

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

			if (verbose) {
				console.log('✓ Typecheck passed');
			}
		}

		// Step 4: Analyze which methods changed
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

		// Step 5: Find affected tests
		const affectedTests = this.findAffectedTests(changedFiles, changedMethods);

		if (verbose) {
			console.log(`\nAffected tests: ${affectedTests.length}`);
			affectedTests.forEach((t) => console.log(`  - ${t}`));
		}

		if (affectedTests.length === 0) {
			if (verbose) {
				console.log('\nNo tests affected by changes');
			}

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

		// Step 6: Run affected tests
		const testsPassed = await this.runTests(affectedTests, verbose, testCommand);

		// Step 7: Commit or revert
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

	// ==========================================================================
	// Janitor Rules
	// ==========================================================================

	private runRules(changedFiles: string[], verbose: boolean): number {
		const root = getRootDir();
		const runner = new RuleRunner();

		// Register all rules
		runner.registerRule(new BoundaryProtectionRule());
		runner.registerRule(new ScopeLockdownRule());
		runner.registerRule(new SelectorPurityRule());
		runner.registerRule(new NoPageInFlowRule());
		runner.registerRule(new ApiPurityRule());
		runner.registerRule(new DeadCodeRule());
		runner.registerRule(new DeduplicationRule());
		runner.registerRule(new TestDataHygieneRule());

		// Create project for rules
		const { project } = createProject(root);

		// Filter to only .ts files that exist
		const tsFiles = changedFiles
			.filter((f) => f.endsWith('.ts'))
			.map((f) => path.relative(root, f));

		if (tsFiles.length === 0) {
			return 0;
		}

		// Run rules on changed files only
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

	// ==========================================================================
	// Typecheck
	// ==========================================================================

	private runTypecheck(verbose: boolean): boolean {
		const root = getRootDir();

		try {
			execSync('pnpm typecheck', {
				cwd: root,
				stdio: verbose ? 'inherit' : 'pipe',
			});
			return true;
		} catch {
			return false;
		}
	}

	// ==========================================================================
	// Git Operations
	// ==========================================================================

	private getGitRoot(): string {
		try {
			return execSync('git rev-parse --show-toplevel', {
				encoding: 'utf-8',
			}).trim();
		} catch {
			return getRootDir();
		}
	}

	private getChangedFiles(targetBranch?: string): string[] {
		const janitorRoot = getRootDir();
		const gitRoot = this.getGitRoot();

		try {
			let output: string;

			if (targetBranch) {
				// Get files changed compared to target branch
				output = execSync(`git diff --name-only ${targetBranch}...HEAD`, {
					cwd: gitRoot,
					encoding: 'utf-8',
				});

				const files: string[] = [];
				for (const line of output.split('\n')) {
					if (!line.trim()) continue;
					const fullPath = path.join(gitRoot, line);
					if (fullPath.startsWith(janitorRoot)) {
						files.push(fullPath);
					}
				}
				return files;
			}

			// Get staged and unstaged changes from working directory
			const status = execSync('git status --porcelain', {
				cwd: gitRoot,
				encoding: 'utf-8',
			});

			const files: string[] = [];

			for (const line of status.split('\n')) {
				if (!line.trim()) continue;

				// Parse git status output: "XY filename"
				const match = line.match(/^.{2}\s+(.+)$/);
				if (match) {
					const filePath = match[1];
					// Handle renamed files: "R  old -> new"
					const actualPath = filePath.includes(' -> ') ? filePath.split(' -> ')[1] : filePath;
					const fullPath = path.join(gitRoot, actualPath);

					// Only include files under the janitor rootDir
					if (fullPath.startsWith(janitorRoot)) {
						files.push(fullPath);
					}
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
			let cmd: string;
			if (targetBranch) {
				cmd = `git diff --stat ${targetBranch}...HEAD`;
			} else {
				cmd = 'git diff --stat HEAD';
			}

			const output = execSync(cmd, {
				cwd: gitRoot,
				encoding: 'utf-8',
			});

			// Parse the last line which contains the summary
			// e.g., "5 files changed, 100 insertions(+), 50 deletions(-)"
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

	// ==========================================================================
	// Test Discovery
	// ==========================================================================

	private findAffectedTests(changedFiles: string[], changedMethods: MethodChange[]): string[] {
		const affectedTests = new Set<string>();
		const root = getRootDir();

		// Build method usage index (cached)
		if (!this.methodUsageIndex) {
			const analyzer = new MethodUsageAnalyzer(this.project);
			this.methodUsageIndex = analyzer.buildIndex();
		}

		// Find tests affected by changed methods
		for (const change of changedMethods) {
			const key = `${change.className}.${change.methodName}`;
			const usages = this.methodUsageIndex.methods[key] || [];

			for (const usage of usages) {
				affectedTests.add(usage.testFile);
			}
		}

		// Also use impact analyzer for file-level changes
		const impactAnalyzer = new ImpactAnalyzer(this.project);
		const relativePaths = changedFiles.map((f) => path.relative(root, f));
		const impact = impactAnalyzer.analyze(relativePaths);

		for (const testFile of impact.affectedTests) {
			affectedTests.add(testFile);
		}

		return Array.from(affectedTests).sort();
	}

	// ==========================================================================
	// Test Execution
	// ==========================================================================

	private async runTests(
		testFiles: string[],
		verbose: boolean,
		testCommand?: string,
	): Promise<boolean> {
		const root = getRootDir();

		if (verbose) {
			console.log(`\nRunning ${testFiles.length} test file(s)...`);
		}

		try {
			// Build the test command
			const testPattern = testFiles.join(' ');
			let cmd: string;

			if (testCommand) {
				// Custom command - append test files to it
				cmd = `${testCommand} ${testPattern}`;
			} else {
				// Default: npx playwright test
				cmd = `npx playwright test ${testPattern}`;
			}

			if (verbose) {
				console.log(`Command: ${cmd}`);
			}

			execSync(cmd, {
				cwd: root,
				stdio: verbose ? 'inherit' : 'pipe',
			});

			return true;
		} catch {
			return false;
		}
	}
}

// ============================================================================
// Output Formatters
// ============================================================================

export function formatTcrResultConsole(result: TcrResult, verbose = false): void {
	console.log('\n====================================');
	console.log('         TCR RESULT');
	console.log('====================================\n');

	console.log(`Duration: ${(result.durationMs / 1000).toFixed(2)}s`);
	console.log(`Action taken: ${result.action}`);
	console.log(`Overall: ${result.success ? '✓ Success' : '✗ Failed'}`);

	if (result.failedStep) {
		console.log(`Failed at: ${result.failedStep}`);
	}

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
