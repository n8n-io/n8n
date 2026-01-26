/**
 * TCR (Test && Commit || Revert) Executor
 *
 * Orchestrates the full TCR workflow:
 * 0. Check diff size against target branch (default: master, max: 300 lines)
 * 1. Static analysis (janitor rules) - checks ALL changed files
 * 2. Type checking
 * 3. AST diff to find changed methods in target file
 * 4. Find affected tests
 * 5. Run tests
 * 6. Commit or stash
 * 7. Show post-commit diff status
 *
 * Why this works for AI-driven changes:
 * - Can't introduce bad patterns (janitor rules check ALL changed files)
 * - Can't add unused methods (dead-code rule blocks)
 * - Can't break existing functionality (tests block)
 * - Can't accumulate too many changes (diff size limit)
 * - Forces atomic, working commits
 */

import { execSync, spawnSync } from 'child_process';
import { Project } from 'ts-morph';
import { RuleRunner } from './rule-runner';
import { diffFileMethods } from './ast-diff-analyzer';
import { MethodUsageAnalyzer } from './method-usage-analyzer';

export interface TcrOptions {
	file: string;
	message: string;
	dryRun?: boolean;
	verbose?: boolean;
	n8nUrl?: string;
	targetBranch?: string;
	maxDiffLines?: number;
	warnDiffLines?: number;
}

export interface DiffStats {
	added: number;
	deleted: number;
	total: number;
}

export interface TcrResult {
	success: boolean;
	step: 'diff-size' | 'rules' | 'typecheck' | 'analysis' | 'tests' | 'commit';
	message: string;
	details?: {
		violations?: number;
		changedMethods?: string[];
		affectedTests?: string[];
		testsPassed?: number;
		testsFailed?: number;
		diffStats?: DiffStats;
	};
}

// Colors for terminal output
const colors = {
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	cyan: '\x1b[36m',
	magenta: '\x1b[35m',
	reset: '\x1b[0m',
};

function log(color: keyof typeof colors, message: string): void {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step: number, total: number, message: string): void {
	console.log(`\nStep ${step}/${total}: ${message}`);
}

/**
 * Get diff stats against a target branch
 * Returns lines added, deleted, and total
 */
function getDiffStats(targetBranch: string): DiffStats {
	let added = 0;
	let deleted = 0;

	try {
		// Get diff stats from target branch to HEAD (committed changes)
		const committedStats = execSync(`git diff --numstat ${targetBranch}...HEAD -- .`, {
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		for (const line of committedStats.trim().split('\n')) {
			if (!line) continue;
			const [add, del] = line.split('\t');
			// Skip binary files (shown as -)
			if (add !== '-' && del !== '-') {
				added += parseInt(add, 10) || 0;
				deleted += parseInt(del, 10) || 0;
			}
		}

		// Also include uncommitted changes
		const uncommittedStats = execSync('git diff --numstat HEAD -- .', {
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		for (const line of uncommittedStats.trim().split('\n')) {
			if (!line) continue;
			const [add, del] = line.split('\t');
			if (add !== '-' && del !== '-' && add) {
				added += parseInt(add, 10) || 0;
				deleted += parseInt(del, 10) || 0;
			}
		}
	} catch {
		// Git command failed, return zeros
	}

	return { added, deleted, total: added + deleted };
}

/**
 * Check if a git ref exists
 */
function gitRefExists(ref: string): boolean {
	try {
		execSync(`git rev-parse --verify ${ref}`, {
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * Show post-commit diff status against target branch
 */
function showPostCommitDiffStatus(
	targetBranch: string,
	maxDiffLines: number,
	warnDiffLines: number,
): void {
	if (!gitRefExists(targetBranch)) {
		return;
	}

	const stats = getDiffStats(targetBranch);

	console.log('');
	log('magenta', '═══ Branch Status ═══');
	console.log(
		`  Total diff vs ${targetBranch}: ${colors.cyan}+${stats.added} -${stats.deleted}${colors.reset} = ${colors.magenta}${stats.total} lines${colors.reset}`,
	);

	const remaining = maxDiffLines - stats.total;
	if (remaining > 0) {
		console.log(`  Remaining capacity: ${colors.green}${remaining} lines${colors.reset}`);
	} else {
		console.log(`  ${colors.red}Over limit by ${-remaining} lines${colors.reset}`);
	}

	const percentage = Math.round((stats.total * 100) / maxDiffLines);
	console.log(`  Progress: ${colors.cyan}[${percentage}% of limit]${colors.reset}`);

	if (stats.total > warnDiffLines) {
		console.log('');
		log('yellow', '  ⚠ Consider creating a PR soon - approaching diff limit');
	}
	log('magenta', '═════════════════════');
}

/**
 * Check if there are uncommitted changes
 */
function hasUncommittedChanges(): boolean {
	const result = execSync('git status --porcelain', { encoding: 'utf-8' });
	return result.trim().length > 0;
}

/**
 * Get all changed TypeScript files in the playwright directory
 */
function getAllChangedFiles(): string[] {
	try {
		// Get modified/staged files
		const changedFiles = execSync('git diff --name-only HEAD -- .', {
			encoding: 'utf-8',
		})
			.trim()
			.split('\n')
			.filter((f) => f.match(/\.(ts|tsx)$/));

		// Get untracked files
		const untrackedFiles = execSync('git ls-files --others --exclude-standard -- .', {
			encoding: 'utf-8',
		})
			.trim()
			.split('\n')
			.filter((f) => f.match(/\.(ts|tsx)$/));

		// Combine and dedupe
		const allFiles = [...new Set([...changedFiles, ...untrackedFiles])].filter((f) => f.length > 0);

		return allFiles;
	} catch {
		return [];
	}
}

/**
 * Stash changes with a message
 */
function stashChanges(file: string, reason: string): void {
	execSync(`git stash push -m "TCR failed: ${file} - ${reason}"`, {
		encoding: 'utf-8',
	});
}

/**
 * Commit changes
 */
function commitChanges(message: string): void {
	execSync('git add packages/testing/playwright/', { encoding: 'utf-8' });
	execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
		encoding: 'utf-8',
	});
}

/**
 * Run typecheck
 */
function runTypecheck(): { success: boolean; output: string } {
	const result = spawnSync('pnpm', ['typecheck'], {
		encoding: 'utf-8',
		cwd: process.cwd(),
		shell: true,
	});

	return {
		success: result.status === 0,
		output: result.stdout + result.stderr,
	};
}

/**
 * Run playwright tests
 */
function runTests(
	testFiles: string[],
	n8nUrl: string,
): { success: boolean; passed: number; failed: number; output: string } {
	const result = spawnSync(
		'npx',
		['playwright', 'test', '--project=e2e', '--reporter=line', ...testFiles],
		{
			encoding: 'utf-8',
			cwd: process.cwd(),
			shell: true,
			env: {
				...process.env,
				N8N_BASE_URL: n8nUrl,
			},
		},
	);

	// Parse output for pass/fail counts
	const output = result.stdout + result.stderr;
	const passedMatch = output.match(/(\d+) passed/);
	const failedMatch = output.match(/(\d+) failed/);

	return {
		success: result.status === 0,
		passed: passedMatch ? parseInt(passedMatch[1], 10) : 0,
		failed: failedMatch ? parseInt(failedMatch[1], 10) : 0,
		output,
	};
}

/**
 * Execute the full TCR workflow
 */
export async function executeTcr(
	project: Project,
	runner: RuleRunner,
	options: TcrOptions,
): Promise<TcrResult> {
	const {
		file,
		message,
		dryRun = false,
		verbose = false,
		n8nUrl = 'http://localhost:5680',
		targetBranch = 'master',
		maxDiffLines = 300,
		warnDiffLines = 250,
	} = options;

	const totalSteps = 5;

	console.log(`\n${'='.repeat(50)}`);
	console.log(`TCR: ${file}`);
	console.log(`Target: ${n8nUrl}`);
	console.log(`Branch limit: ${maxDiffLines} lines vs ${targetBranch}`);
	if (dryRun) {
		log('yellow', '(Dry run - no changes will be committed)');
	}
	console.log('='.repeat(50));

	// Check for uncommitted changes
	if (!hasUncommittedChanges()) {
		log('yellow', 'No changes to commit');
		return {
			success: true,
			step: 'commit',
			message: 'No changes to commit',
		};
	}

	// =========================================================================
	// STEP 0: Check Diff Size Against Target Branch
	// =========================================================================
	logStep(0, totalSteps, `Checking diff size against ${targetBranch}...`);

	if (!gitRefExists(targetBranch)) {
		log('yellow', `Warning: Target branch '${targetBranch}' not found, skipping diff size check`);
	} else {
		const diffStats = getDiffStats(targetBranch);
		console.log(
			`  Total diff: ${colors.cyan}+${diffStats.added} -${diffStats.deleted}${colors.reset} = ${colors.magenta}${diffStats.total} lines${colors.reset} (limit: ${maxDiffLines})`,
		);

		if (diffStats.total > maxDiffLines) {
			const errorDetails = [
				`The total changes on this branch compared to ${targetBranch} are too large.`,
				'',
				'Current diff stats:',
				`  Lines added:   +${diffStats.added}`,
				`  Lines deleted: -${diffStats.deleted}`,
				`  Total changes: ${diffStats.total} lines`,
				`  Maximum allowed: ${maxDiffLines} lines`,
				'',
				'Options:',
				'  1. Create a PR with current changes and start a new branch',
				`  2. Increase limit: --max-diff-lines=${maxDiffLines + 200}`,
				'  3. Split changes into smaller PRs',
			].join('\n');

			log('red', `✗ Diff size (${diffStats.total} lines) exceeds maximum (${maxDiffLines} lines)`);
			console.log('\n=== Failure Details (for iteration) ===');
			console.log(errorDetails);
			console.log('=======================================\n');

			return {
				success: false,
				step: 'diff-size',
				message: `Diff size (${diffStats.total} lines) exceeds maximum (${maxDiffLines} lines)`,
				details: { diffStats },
			};
		}

		if (diffStats.total > warnDiffLines) {
			log('yellow', `  ⚠ Approaching limit (${diffStats.total}/${maxDiffLines} lines)`);
		} else {
			log('green', '✓ Within limit');
		}
	}

	// =========================================================================
	// STEP 1: Static Analysis (Janitor Rules) - CHECK ALL CHANGED FILES
	// =========================================================================
	logStep(1, totalSteps, 'Checking janitor rules on all changed files...');

	// Get ALL changed TypeScript files, not just the target
	const allChangedFiles = getAllChangedFiles();

	if (allChangedFiles.length > 0) {
		console.log(`  Checking ${allChangedFiles.length} changed file(s):`);
		for (const f of allChangedFiles) {
			console.log(`    ${f}`);
		}

		const report = runner.run(project, process.cwd(), { files: allChangedFiles });

		if (report && report.summary.totalViolations > 0) {
			log('red', `✗ Found ${report.summary.totalViolations} violation(s)`);

			// Always show violations for AI iteration (not just verbose mode)
			console.log('\n=== Violations (for iteration) ===');
			const violationDetails: string[] = [];
			for (const result of report.results) {
				for (const violation of result.violations) {
					const detail = `${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`;
					console.log(`  ${detail}`);
					violationDetails.push(detail);
					if (violation.suggestion) {
						console.log(`    └─ Suggestion: ${violation.suggestion}`);
					}
				}
			}
			console.log('==================================\n');

			if (!dryRun) {
				stashChanges(file, 'Janitor violations found');
				log('yellow', "Changes preserved in stash. Use 'git stash pop' to restore.");
			}

			return {
				success: false,
				step: 'rules',
				message: `Janitor violations found:\n${violationDetails.join('\n')}`,
				details: { violations: report.summary.totalViolations },
			};
		}
	} else {
		log('yellow', '  No TypeScript files changed');
	}

	log('green', '✓ No violations in any changed files');

	// =========================================================================
	// STEP 2: Type Check
	// =========================================================================
	logStep(2, totalSteps, 'Running typecheck...');

	const typecheckResult = runTypecheck();

	if (!typecheckResult.success) {
		log('red', '✗ Type errors found');

		// Always show type errors for AI iteration
		console.log('\n=== Type Errors (for iteration) ===');
		const errorLines = typecheckResult.output
			.split('\n')
			.filter(
				(line) => line.includes('error TS') || line.includes('.ts(') || line.includes('.tsx('),
			);
		const errorOutput = errorLines.length > 0 ? errorLines.join('\n') : typecheckResult.output;
		console.log(errorOutput);
		console.log('===================================\n');

		if (!dryRun) {
			stashChanges(file, 'Type errors found');
			log('yellow', "Changes preserved in stash. Use 'git stash pop' to restore.");
		}

		return {
			success: false,
			step: 'typecheck',
			message: `Type errors found:\n${errorOutput}`,
		};
	}

	log('green', '✓ Types OK');

	// =========================================================================
	// STEP 3: Find Changed Methods & Affected Tests (AST Diff)
	// =========================================================================
	logStep(3, totalSteps, 'Analyzing changes with AST diff...');

	const diffResult = diffFileMethods(file, 'HEAD');
	const changedMethods = diffResult.changedMethods.map((c) => `${c.className}.${c.methodName}`);

	if (verbose || changedMethods.length > 0) {
		console.log(`  Changed methods: ${changedMethods.length}`);
		for (const method of changedMethods) {
			console.log(`    ~ ${method}`);
		}
	}

	// Find affected tests
	const methodAnalyzer = new MethodUsageAnalyzer(project);
	const affectedTests = new Set<string>();

	for (const change of diffResult.changedMethods) {
		const methodKey = `${change.className}.${change.methodName}`;
		try {
			const impact = methodAnalyzer.getMethodImpact(methodKey);
			for (const testFile of impact.affectedTestFiles) {
				affectedTests.add(testFile);
			}
		} catch {
			// Method not found in usage index
		}
	}

	const testFiles = [...affectedTests];

	if (testFiles.length === 0) {
		log('yellow', 'No tests affected by changes');
		console.log('\nThis could mean:');
		console.log('  1. Changed methods have no test coverage');
		console.log('  2. Only non-method changes (imports, types, etc.)');

		if (!dryRun) {
			log('green', 'Committing without test validation...');
			commitChanges(message);
			log('green', `✓ Committed: ${message}`);

			// Show post-commit diff status
			logStep(5, totalSteps, 'Checking branch status...');
			showPostCommitDiffStatus(targetBranch, maxDiffLines, warnDiffLines);
		} else {
			log('yellow', '(Dry run) Would commit without test validation');
		}

		return {
			success: true,
			step: 'commit',
			message: 'Committed without test validation',
			details: { changedMethods, affectedTests: [] },
		};
	}

	console.log(`  Affected tests: ${testFiles.length} file(s)`);
	for (const test of testFiles) {
		console.log(`    ${test}`);
	}

	// =========================================================================
	// STEP 4: Run Affected Tests
	// =========================================================================
	logStep(4, totalSteps, 'Running tests...');

	if (dryRun) {
		log('yellow', `(Dry run) Would run ${testFiles.length} test file(s)`);
		return {
			success: true,
			step: 'tests',
			message: 'Dry run completed',
			details: { changedMethods, affectedTests: testFiles },
		};
	}

	const testResult = runTests(testFiles, n8nUrl);

	if (verbose) {
		console.log(testResult.output);
	}

	if (!testResult.success) {
		log('red', `✗ Tests failed (${testResult.passed} passed, ${testResult.failed} failed)`);

		// Always show test failures for AI iteration
		console.log('\n=== Test Failures (for iteration) ===');
		// Extract failure details from playwright output
		const failureLines = testResult.output
			.split('\n')
			.filter(
				(line) =>
					line.includes('Error:') ||
					line.includes('expect(') ||
					line.includes('FAILED') ||
					line.includes('Timeout') ||
					line.includes('✘'),
			);
		const failureOutput =
			failureLines.length > 0
				? failureLines.slice(0, 50).join('\n')
				: testResult.output.slice(-2000);
		console.log(failureOutput);
		console.log('=====================================\n');

		if (!dryRun) {
			stashChanges(file, 'Tests failed');
			log('yellow', "Changes preserved in stash. Use 'git stash pop' to restore.");
		}

		return {
			success: false,
			step: 'tests',
			message: `Tests failed:\n${failureOutput}`,
			details: {
				changedMethods,
				affectedTests: testFiles,
				testsPassed: testResult.passed,
				testsFailed: testResult.failed,
			},
		};
	}

	log('green', `✓ Tests passed (${testResult.passed} passed)`);

	// =========================================================================
	// COMMIT
	// =========================================================================
	commitChanges(message);
	log('green', `✓ Committed: ${message}`);

	// =========================================================================
	// STEP 5: Post-Commit Status
	// =========================================================================
	logStep(5, totalSteps, 'Checking branch status...');
	showPostCommitDiffStatus(targetBranch, maxDiffLines, warnDiffLines);

	return {
		success: true,
		step: 'commit',
		message: 'Successfully committed',
		details: {
			changedMethods,
			affectedTests: testFiles,
			testsPassed: testResult.passed,
			testsFailed: 0,
		},
	};
}
