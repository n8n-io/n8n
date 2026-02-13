/**
 * TCR Executor - Test && Commit || Revert workflow
 */

import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import { Project } from 'ts-morph';

import { diffFileMethods, type MethodChange } from './ast-diff-analyzer.js';
import { loadBaseline, filterNewViolations } from './baseline.js';
import { MethodUsageAnalyzer, type MethodUsageIndex } from './method-usage-analyzer.js';
import { createProject } from './project-loader.js';
import { RuleRunner } from './rule-runner.js';
import { ApiPurityRule } from '../rules/api-purity.rule.js';
import { BoundaryProtectionRule } from '../rules/boundary-protection.rule.js';
import { DeadCodeRule } from '../rules/dead-code.rule.js';
import { DeduplicationRule } from '../rules/deduplication.rule.js';
import { NoPageInFlowRule } from '../rules/no-page-in-flow.rule.js';
import { ScopeLockdownRule } from '../rules/scope-lockdown.rule.js';
import { SelectorPurityRule } from '../rules/selector-purity.rule.js';
import { TestDataHygieneRule } from '../rules/test-data-hygiene.rule.js';
import {
	getChangedFiles as gitGetChangedFiles,
	getTotalDiffLines as gitGetTotalDiffLines,
	commit as gitCommit,
	revert as gitRevert,
} from '../utils/git-operations.js';
import { createLogger, type Logger } from '../utils/logger.js';
import { getRootDir } from '../utils/paths.js';
import { buildTestCommand, resolveTestCommand } from '../utils/test-command.js';

export interface TcrOptions {
	baseRef?: string;
	execute?: boolean;
	commitMessage?: string;
	verbose?: boolean;
	targetBranch?: string;
	maxDiffLines?: number;
	testCommand?: string;
}

export interface TcrResult {
	success: boolean;
	failedStep?:
		| 'rules'
		| 'typecheck'
		| 'tests'
		| 'diff-too-large'
		| 'baseline-modified'
		| 'test-command-rejected';
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
	private root: string;
	private logger: Logger = createLogger();

	constructor() {
		this.root = getRootDir();
		this.project = new Project({
			tsConfigFilePath: path.join(this.root, 'tsconfig.json'),
			skipAddingFilesFromTsConfig: false,
		});
	}

	run(options: TcrOptions = {}): TcrResult {
		const startTime = performance.now();
		const {
			baseRef = 'HEAD',
			execute = false,
			verbose = false,
			targetBranch,
			maxDiffLines,
			testCommand,
		} = options;

		this.logger = createLogger({ verbose });

		// Early validation: test command allowlist
		const commandValidation = this.validateTestCommand(testCommand);
		if (commandValidation) {
			return this.buildResult({ ...commandValidation, durationMs: performance.now() - startTime });
		}

		const changedFiles = this.getChangedFiles(targetBranch);

		// Validation: diff size
		const diffValidation = this.validateDiffSize(changedFiles, maxDiffLines, targetBranch);
		if (diffValidation) {
			return this.buildResult({ ...diffValidation, durationMs: performance.now() - startTime });
		}

		// Validation: baseline not modified (prevents AI from "fixing" violations by updating baseline)
		const baselineValidation = this.validateBaselineNotModified(changedFiles);
		if (baselineValidation) {
			return this.buildResult({ ...baselineValidation, durationMs: performance.now() - startTime });
		}

		// No changes
		if (changedFiles.length === 0) {
			this.logger.debug('No changes detected');
			return this.buildResult({
				success: true,
				action: 'dry-run',
				durationMs: performance.now() - startTime,
			});
		}

		this.logger.debug(`Changed files: ${changedFiles.length}`);
		this.logger.debugList(changedFiles);

		// Analyze changed methods early (useful for understanding the change even if later checks fail)
		const changedMethods = this.extractChangedMethods(changedFiles, baseRef);
		this.logChangedMethods(changedMethods);

		// Validation: rules
		this.logger.debug('\nRunning janitor rules...');
		const ruleViolations = this.runRules(changedFiles);

		if (ruleViolations > 0) {
			this.logger.debug(`\n\u2717 Found ${ruleViolations} rule violation(s)`);
			if (execute) this.doRevert();
			return this.buildResult({
				success: false,
				failedStep: 'rules',
				changedFiles,
				changedMethods,
				ruleViolations,
				action: execute ? 'revert' : 'dry-run',
				durationMs: performance.now() - startTime,
			});
		}
		this.logger.debug('\u2713 Rules passed');

		// Validation: typecheck
		this.logger.debug('\nRunning typecheck...');
		const typecheckPassed = this.runTypecheck();

		if (!typecheckPassed) {
			this.logger.debug('\u2717 Typecheck failed');
			if (execute) this.doRevert();
			return this.buildResult({
				success: false,
				failedStep: 'typecheck',
				changedFiles,
				changedMethods,
				ruleViolations,
				typecheckPassed: false,
				action: execute ? 'revert' : 'dry-run',
				durationMs: performance.now() - startTime,
			});
		}
		this.logger.debug('\u2713 Typecheck passed');

		// Find affected tests
		const affectedTests = this.findAffectedTests(changedFiles, changedMethods);
		this.logger.debug(`\nAffected tests: ${affectedTests.length}`);
		this.logger.debugList(affectedTests);

		// No tests affected
		if (affectedTests.length === 0) {
			this.logger.debug('\nNo tests affected by changes');
			if (execute) {
				this.doCommit(options.commitMessage ?? 'TCR: No tests affected');
				return this.buildResult({
					success: true,
					changedFiles,
					changedMethods,
					ruleViolations,
					typecheckPassed,
					action: 'commit',
					durationMs: performance.now() - startTime,
				});
			}
			return this.buildResult({
				success: true,
				changedFiles,
				changedMethods,
				ruleViolations,
				typecheckPassed,
				action: 'dry-run',
				durationMs: performance.now() - startTime,
			});
		}

		// Run tests
		const testsPassed = this.runTests(affectedTests, testCommand);

		// Commit or revert based on test results
		const action = this.determineAction(execute, testsPassed, options.commitMessage);

		return this.buildResult({
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
		});
	}

	// --- Result Builder ---

	private buildResult(params: Partial<TcrResult>): TcrResult {
		return {
			success: params.success ?? false,
			failedStep: params.failedStep,
			changedFiles: params.changedFiles ?? [],
			changedMethods: params.changedMethods ?? [],
			affectedTests: params.affectedTests ?? [],
			testsRun: params.testsRun ?? [],
			testsPassed: params.testsPassed ?? false,
			ruleViolations: params.ruleViolations ?? 0,
			typecheckPassed: params.typecheckPassed ?? true,
			action: params.action ?? 'dry-run',
			durationMs: params.durationMs ?? 0,
			totalDiffLines: params.totalDiffLines,
			testCommand: params.testCommand,
		};
	}

	// --- Validation Methods ---

	private validateTestCommand(testCommand?: string): Partial<TcrResult> | null {
		try {
			resolveTestCommand(testCommand);
			return null;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.debug(`\n✗ Test command rejected: ${message}`);
			return {
				success: false,
				failedStep: 'test-command-rejected',
				action: 'dry-run',
			};
		}
	}

	private validateDiffSize(
		changedFiles: string[],
		maxDiffLines: number | undefined,
		targetBranch: string | undefined,
	): Partial<TcrResult> | null {
		if (!maxDiffLines || changedFiles.length === 0) return null;

		const totalDiffLines = gitGetTotalDiffLines(this.root, targetBranch);
		if (totalDiffLines > maxDiffLines) {
			this.logger.debug(
				`\n\u2717 Diff too large: ${totalDiffLines} lines exceeds max ${maxDiffLines}`,
			);
			return {
				success: false,
				failedStep: 'diff-too-large',
				changedFiles,
				totalDiffLines,
				action: 'dry-run',
			};
		}

		this.logger.debug(`Diff size: ${totalDiffLines} lines (max: ${maxDiffLines})`);
		return null;
	}

	private validateBaselineNotModified(changedFiles: string[]): Partial<TcrResult> | null {
		// Check git status directly for baseline file (not relying on changedFiles which filters by .ts)
		try {
			const status = execFileSync('git', ['status', '--porcelain'], {
				cwd: this.root,
				encoding: 'utf-8',
			});
			const hasBaselineChange = status
				.split('\n')
				.some((line) => line.includes('.janitor-baseline.json'));

			if (!hasBaselineChange) return null;
		} catch {
			// Fail closed — git failure blocks commit rather than silently passing
			this.logger.debug('\n[warning] Could not check baseline status (git failed)');
			return {
				success: false,
				failedStep: 'baseline-modified',
				changedFiles,
				action: 'dry-run',
			};
		}

		this.logger.debug('\n✗ Cannot commit baseline changes via TCR');
		this.logger.debug('  Baseline updates must be done manually:');
		this.logger.debug('    git checkout .janitor-baseline.json');
		this.logger.debug('    # Fix the actual violations, then:');
		this.logger.debug('    pnpm janitor baseline && git add .janitor-baseline.json');

		return {
			success: false,
			failedStep: 'baseline-modified',
			changedFiles,
			action: 'dry-run',
		};
	}

	// --- Action Helpers ---

	private determineAction(
		execute: boolean,
		testsPassed: boolean,
		commitMessage?: string,
	): 'commit' | 'revert' | 'dry-run' {
		if (!execute) return 'dry-run';

		if (testsPassed) {
			this.doCommit(commitMessage ?? 'TCR: Tests passed');
			return 'commit';
		}

		this.doRevert();
		return 'revert';
	}

	private doCommit(message: string): void {
		if (gitCommit(message, this.root)) {
			this.logger.info(`\n\u2713 Committed: ${message}`);
		} else {
			this.logger.error('Failed to commit');
		}
	}

	private doRevert(): void {
		if (gitRevert(this.root)) {
			this.logger.info('\n\u2717 Reverted changes');
		} else {
			this.logger.error('Failed to revert');
		}
	}

	// --- Method Analysis ---

	private extractChangedMethods(changedFiles: string[], baseRef: string): MethodChange[] {
		const changedMethods: MethodChange[] = [];
		for (const file of changedFiles) {
			if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) {
				const diff = diffFileMethods(file, baseRef);
				changedMethods.push(...diff.changedMethods);
			}
		}
		return changedMethods;
	}

	private logChangedMethods(changedMethods: MethodChange[]): void {
		if (changedMethods.length === 0) return;
		this.logger.debug(`\nChanged methods: ${changedMethods.length}`);
		for (const change of changedMethods) {
			const symbol =
				change.changeType === 'added' ? '+' : change.changeType === 'removed' ? '-' : '~';
			this.logger.debug(`  ${symbol} ${change.className}.${change.methodName}`);
		}
	}

	private runRules(changedFiles: string[]): number {
		const runner = this.createRuleRunner();
		const { project } = createProject(this.root);

		const tsFiles = changedFiles
			.filter((f) => f.endsWith('.ts'))
			.map((f) => path.relative(this.root, f));

		if (tsFiles.length === 0) return 0;

		const report = runner.run(project, this.root, { files: tsFiles });
		return this.countNewViolations(report);
	}

	private createRuleRunner(): RuleRunner {
		const runner = new RuleRunner();
		runner.registerRule(new BoundaryProtectionRule());
		runner.registerRule(new ScopeLockdownRule());
		runner.registerRule(new SelectorPurityRule());
		runner.registerRule(new NoPageInFlowRule());
		runner.registerRule(new ApiPurityRule());
		runner.registerRule(new DeadCodeRule());
		runner.registerRule(new DeduplicationRule());
		runner.registerRule(new TestDataHygieneRule());
		return runner;
	}

	private countNewViolations(report: ReturnType<RuleRunner['run']>): number {
		const baseline = loadBaseline(this.root);

		if (!baseline) {
			this.logViolationsWithoutBaseline(report);
			return report.summary.totalViolations;
		}

		return this.countFilteredViolations(report, baseline);
	}

	private logViolationsWithoutBaseline(report: ReturnType<RuleRunner['run']>): void {
		if (report.summary.totalViolations === 0) return;

		this.logger.debug('\nViolations in changed files:');
		for (const result of report.results) {
			if (result.violations.length > 0) {
				this.logger.debug(`  ${result.rule}: ${result.violations.length}`);
			}
		}
	}

	private countFilteredViolations(
		report: ReturnType<RuleRunner['run']>,
		baseline: NonNullable<ReturnType<typeof loadBaseline>>,
	): number {
		let filteredCount = 0;

		for (const result of report.results) {
			const newViolations = filterNewViolations(result.violations, baseline, this.root);
			filteredCount += newViolations.length;

			if (newViolations.length > 0) {
				this.logger.debug(
					`\n${result.rule}: ${newViolations.length} new (${result.violations.length} total)`,
				);
				for (const v of newViolations) {
					this.logger.debug(`  ${path.relative(this.root, v.file)}:${v.line} - ${v.message}`);
				}
			}
		}

		const baselinedCount = report.summary.totalViolations - filteredCount;
		this.logger.debug(`\nBaseline: ${baselinedCount} known violations filtered`);

		return filteredCount;
	}

	private runTypecheck(): boolean {
		try {
			const stdio = this.logger.isVerbose() ? 'inherit' : 'pipe';
			execFileSync('pnpm', ['typecheck'], { cwd: this.root, stdio });
			return true;
		} catch {
			return false;
		}
	}

	private getChangedFiles(targetBranch?: string): string[] {
		return gitGetChangedFiles({ targetBranch, scopeDir: this.root, extensions: ['.ts'] });
	}

	private findAffectedTests(changedFiles: string[], changedMethods: MethodChange[]): string[] {
		const affectedTests = new Set<string>();

		const changedTestFiles = this.getChangedTestFiles(changedFiles);
		const methodIndex = this.getMethodUsageIndex();

		// Find tests using modified/removed methods
		this.addTestsUsingMethods(
			changedMethods.filter((m) => m.changeType !== 'added'),
			methodIndex,
			affectedTests,
		);

		// Find tests using newly added methods
		this.addTestsUsingNewMethods(
			changedMethods.filter((m) => m.changeType === 'added'),
			changedTestFiles,
			affectedTests,
		);

		// Include directly changed test files
		for (const testFile of changedTestFiles) {
			affectedTests.add(testFile);
		}

		return Array.from(affectedTests).sort((a, b) => a.localeCompare(b));
	}

	private getChangedTestFiles(changedFiles: string[]): string[] {
		return changedFiles
			.filter((f) => f.endsWith('.spec.ts'))
			.map((f) => path.relative(this.root, f));
	}

	private getMethodUsageIndex(): MethodUsageIndex {
		if (!this.methodUsageIndex) {
			const analyzer = new MethodUsageAnalyzer(this.project);
			this.methodUsageIndex = analyzer.buildIndex();
		}
		return this.methodUsageIndex;
	}

	private addTestsUsingMethods(
		methods: MethodChange[],
		methodIndex: MethodUsageIndex,
		affectedTests: Set<string>,
	): void {
		for (const change of methods) {
			const key = `${change.className}.${change.methodName}`;
			const usages = methodIndex.methods[key] ?? [];
			for (const usage of usages) {
				affectedTests.add(usage.testFile);
			}
		}
	}

	private addTestsUsingNewMethods(
		addedMethods: MethodChange[],
		changedTestFiles: string[],
		affectedTests: Set<string>,
	): void {
		if (addedMethods.length === 0 || changedTestFiles.length === 0) return;

		for (const testFile of changedTestFiles) {
			const fullPath = path.join(this.root, testFile);
			const sourceFile = this.project.getSourceFile(fullPath);
			if (!sourceFile) continue;

			const content = sourceFile.getFullText();
			for (const method of addedMethods) {
				const methodPattern = new RegExp(`\\.${method.methodName}\\s*\\(`);
				if (methodPattern.test(content)) {
					affectedTests.add(testFile);
					break;
				}
			}
		}
	}

	private runTests(testFiles: string[], testCommand?: string): boolean {
		this.logger.debug(`\nRunning ${testFiles.length} test file(s)...`);

		try {
			const cmd = buildTestCommand(testFiles, testCommand);
			this.logger.debug(`Command: ${cmd.bin} ${cmd.args.join(' ')}`);

			const stdio = this.logger.isVerbose() ? 'inherit' : 'pipe';
			execFileSync(cmd.bin, cmd.args, { cwd: this.root, stdio });
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
	if (result.failedStep === 'baseline-modified') {
		console.log('  Baseline: ✗ Modified (baseline updates must be done manually)');
	}
	if (result.failedStep === 'test-command-rejected') {
		console.log('  Test command: ✗ Rejected (not in allowlist)');
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
