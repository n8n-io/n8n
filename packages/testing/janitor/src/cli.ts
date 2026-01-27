#!/usr/bin/env node
/**
 * Playwright Janitor CLI
 *
 * Usage:
 *   playwright-janitor                    # Run all rules
 *   playwright-janitor inventory          # Show codebase inventory
 *   playwright-janitor impact             # Show impact of changes
 *   playwright-janitor tcr                # TCR workflow
 *   playwright-janitor --help             # Show help
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { setConfig, getConfig, defineConfig, type JanitorConfig } from './config.js';
import {
	generateBaseline,
	saveBaseline,
	loadBaseline,
	filterReportByBaseline,
	formatBaselineInfo,
	getBaselinePath,
} from './core/baseline.js';
import {
	ImpactAnalyzer,
	formatImpactConsole,
	formatImpactJSON,
	formatTestList,
} from './core/impact-analyzer.js';
import { InventoryAnalyzer, formatInventoryJSON } from './core/inventory-analyzer.js';
import {
	MethodUsageAnalyzer,
	formatMethodImpactConsole,
	formatMethodImpactJSON,
	formatMethodImpactTestList,
	formatMethodUsageIndexConsole,
	formatMethodUsageIndexJSON,
} from './core/method-usage-analyzer.js';
import { createProject } from './core/project-loader.js';
import { toJSON, toConsole, printFixResults } from './core/reporter.js';
import { RuleRunner } from './core/rule-runner.js';
import { TcrExecutor, formatTcrResultConsole, formatTcrResultJSON } from './core/tcr-executor.js';
import { ApiPurityRule } from './rules/api-purity.rule.js';
import { BoundaryProtectionRule } from './rules/boundary-protection.rule.js';
import { DeadCodeRule } from './rules/dead-code.rule.js';
import { DeduplicationRule } from './rules/deduplication.rule.js';
import { NoPageInFlowRule } from './rules/no-page-in-flow.rule.js';
import { ScopeLockdownRule } from './rules/scope-lockdown.rule.js';
import { SelectorPurityRule } from './rules/selector-purity.rule.js';
import { TestDataHygieneRule } from './rules/test-data-hygiene.rule.js';
import type { RunOptions } from './types.js';

type Command = 'analyze' | 'tcr' | 'inventory' | 'impact' | 'method-impact' | 'baseline';

interface CliOptions {
	command: Command;
	config?: string;
	rule?: string;
	files?: string[];
	json: boolean;
	verbose: boolean;
	fix: boolean;
	write: boolean;
	help: boolean;
	list: boolean;
	// TCR-specific options
	execute: boolean;
	message?: string;
	baseRef?: string;
	targetBranch?: string;
	maxDiffLines?: number;
	testCommand?: string;
	// Impact-specific options
	testList: boolean;
	// Method-impact specific options
	method?: string;
	methodIndex: boolean;
	// Rule-specific options
	allowInExpect: boolean;
	// Baseline options
	ignoreBaseline: boolean;
}

function parseArgs(): CliOptions {
	const args = process.argv.slice(2);

	// Check for subcommand
	let command: Command = 'analyze';
	let startIdx = 0;

	if (args[0] && !args[0].startsWith('-')) {
		if (args[0] === 'tcr') {
			command = 'tcr';
			startIdx = 1;
		} else if (args[0] === 'inventory') {
			command = 'inventory';
			startIdx = 1;
		} else if (args[0] === 'impact') {
			command = 'impact';
			startIdx = 1;
		} else if (args[0] === 'method-impact') {
			command = 'method-impact';
			startIdx = 1;
		} else if (args[0] === 'baseline') {
			command = 'baseline';
			startIdx = 1;
		}
	}

	const options: CliOptions = {
		command,
		config: undefined,
		rule: undefined,
		files: [],
		json: false,
		verbose: false,
		fix: false,
		write: false,
		help: false,
		list: false,
		execute: false,
		message: undefined,
		baseRef: undefined,
		targetBranch: undefined,
		maxDiffLines: undefined,
		testCommand: undefined,
		testList: false,
		method: undefined,
		methodIndex: false,
		allowInExpect: false,
		ignoreBaseline: false,
	};

	for (let i = startIdx; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--help' || arg === '-h') options.help = true;
		else if (arg === '--json') options.json = true;
		else if (arg === '--verbose' || arg === '-v') options.verbose = true;
		else if (arg === '--fix') options.fix = true;
		else if (arg === '--write') options.write = true;
		else if (arg === '--list' || arg === '-l') options.list = true;
		else if (arg === '--execute' || arg === '-x') options.execute = true;
		else if (arg === '--test-list') options.testList = true;
		else if (arg === '--index') options.methodIndex = true;
		else if (arg === '--allow-in-expect') options.allowInExpect = true;
		else if (arg === '--ignore-baseline') options.ignoreBaseline = true;
		else if (arg.startsWith('--config=')) options.config = arg.slice(9);
		else if (arg.startsWith('--rule=')) options.rule = arg.slice(7);
		else if (arg.startsWith('--file=')) options.files?.push(arg.slice(7));
		else if (arg.startsWith('--files=')) options.files?.push(...arg.slice(8).split(','));
		else if (arg.startsWith('--message=') || arg.startsWith('-m='))
			options.message = arg.split('=').slice(1).join('=');
		else if (arg.startsWith('--base=')) options.baseRef = arg.slice(7);
		else if (arg.startsWith('--method=')) options.method = arg.slice(9);
		else if (arg.startsWith('--target-branch=')) options.targetBranch = arg.slice(16);
		else if (arg.startsWith('--max-diff-lines='))
			options.maxDiffLines = parseInt(arg.slice(17), 10);
		else if (arg.startsWith('--test-command=')) options.testCommand = arg.slice(15);
	}

	return options;
}

function showHelp(): void {
	console.log(`
Playwright Janitor - Static analysis for Playwright test architecture

Usage:
  playwright-janitor [command] [options]

Commands:
  (default)          Run static analysis rules
  baseline           Create/update baseline of known violations
  inventory          Show codebase inventory (pages, components, flows, tests)
  impact             Analyze impact of file changes (which tests to run)
  method-impact      Find tests that use a specific method (e.g., CanvasPage.addNode)
  tcr                Run TCR (Test && Commit || Revert) workflow

Analysis Options:
  --config=<path>    Path to janitor.config.js (default: ./janitor.config.js)
  --rule=<id>        Run a specific rule
  --file=<path>      Analyze a specific file
  --files=<p1,p2>    Analyze multiple files (comma-separated)
  --json             Output as JSON
  --verbose, -v      Detailed output with suggestions
  --fix              Preview fixes (dry run)
  --fix --write      Apply fixes to disk
  --list, -l         List available rules
  --allow-in-expect  Skip selector-purity violations inside expect()
  --ignore-baseline  Show all violations, ignoring .janitor-baseline.json
  --help, -h         Show this help

Examples:
  playwright-janitor                         # Run all rules
  playwright-janitor --rule=dead-code        # Run specific rule
  playwright-janitor inventory               # Show codebase structure
  playwright-janitor impact --file=pages/X   # Show what tests are affected
  playwright-janitor --fix --write           # Apply auto-fixes

For command-specific help:
  playwright-janitor baseline --help
  playwright-janitor inventory --help
  playwright-janitor impact --help
  playwright-janitor method-impact --help
  playwright-janitor tcr --help
`);
}

function showInventoryHelp(): void {
	console.log(`
Inventory - Generate JSON inventory of codebase structure

Usage: playwright-janitor inventory

Outputs JSON containing: pages, components, composables, services,
fixtures, helpers, factories, and test data files.

Example: playwright-janitor inventory > inventory.json
`);
}

function showImpactHelp(): void {
	console.log(`
Impact - Find affected tests for changed files

Options: --file=<path>, --files=<p1,p2>, --json, --test-list, --verbose
Example: playwright-janitor impact --test-list | xargs npx playwright test
`);
}

function showMethodImpactHelp(): void {
	console.log(`
Method Impact - Find tests using a specific method

Options: --method=<Class.method>, --index, --json, --test-list, --verbose
Example: playwright-janitor method-impact --method=CanvasPage.addNode
`);
}

function showTcrHelp(): void {
	console.log(`
TCR - Test && Commit || Revert workflow

Options:
  --execute, -x           Actually commit/revert (default: dry run)
  --message=<msg>         Commit message
  --target-branch=<name>  Branch to diff against
  --max-diff-lines=<n>    Skip if diff exceeds N lines
  --test-command=<cmd>    Test command (files appended)
  --json, --verbose

Example: playwright-janitor tcr --execute -m="Fix bug"
`);
}

function showBaselineHelp(): void {
	console.log(`
Baseline - Snapshot current violations for incremental cleanup

Creates .janitor-baseline.json with all current violations. When this file
exists, janitor and TCR only fail on NEW violations not in the baseline.

Usage:
  playwright-janitor baseline              # Create/update baseline
  playwright-janitor baseline --verbose    # Show what's being baselined

Workflow:
  1. Run 'janitor baseline' to snapshot current state
  2. Commit .janitor-baseline.json
  3. Now TCR only fails on new violations
  4. As you fix violations, re-run 'janitor baseline' to update

Example:
  playwright-janitor baseline && git add .janitor-baseline.json
`);
}

function createRunner(): RuleRunner {
	const runner = new RuleRunner();

	// Architecture rules
	runner.registerRule(new BoundaryProtectionRule());
	runner.registerRule(new ScopeLockdownRule());
	runner.registerRule(new SelectorPurityRule());
	runner.registerRule(new NoPageInFlowRule());
	runner.registerRule(new ApiPurityRule());

	// Code quality rules
	runner.registerRule(new DeadCodeRule());
	runner.registerRule(new DeduplicationRule());
	runner.registerRule(new TestDataHygieneRule());

	return runner;
}

async function loadConfig(configPath?: string): Promise<JanitorConfig> {
	const cwd = process.cwd();

	// Try to find config file (JS files only - TS requires a runtime like tsx)
	const configLocations = configPath
		? [configPath]
		: ['janitor.config.js', 'janitor.config.mjs', '.janitorrc.js'];

	for (const location of configLocations) {
		const fullPath = path.isAbsolute(location) ? location : path.join(cwd, location);

		if (fs.existsSync(fullPath)) {
			try {
				const configModule = (await import(fullPath)) as {
					default?: JanitorConfig;
				} & JanitorConfig;
				const config: JanitorConfig = configModule.default ?? configModule;

				// Ensure rootDir is set
				config.rootDir ??= path.dirname(fullPath);

				return config;
			} catch (error) {
				console.error(`Error loading config from ${fullPath}:`, error);
				process.exit(1);
			}
		}
	}

	// No config file found - create minimal config
	console.warn('No janitor.config.js found, using minimal defaults');
	return defineConfig({ rootDir: cwd });
}

function runInventory(): void {
	const config = getConfig();
	const { project } = createProject(config.rootDir);
	const analyzer = new InventoryAnalyzer(project);
	const report = analyzer.generate();
	console.log(formatInventoryJSON(report));
}

async function runImpact(options: CliOptions): Promise<void> {
	const config = getConfig();

	// Create project
	const { project } = createProject(config.rootDir);

	// Determine changed files
	const changedFiles = options.files ?? [];

	if (changedFiles.length === 0) {
		// Use git status to find changed files
		const { execSync } = await import('child_process');
		try {
			const status = execSync('git status --porcelain', {
				cwd: config.rootDir,
				encoding: 'utf-8',
			});

			for (const line of status.split('\n')) {
				if (!line.trim()) continue;
				const match = line.match(/^.{2}\s+(.+)$/);
				if (match) {
					const filePath = match[1];
					const actualPath = filePath.includes(' -> ') ? filePath.split(' -> ')[1] : filePath;
					if (actualPath.endsWith('.ts')) {
						changedFiles.push(actualPath);
					}
				}
			}
		} catch {
			console.error('Failed to get git status');
			process.exit(1);
		}
	}

	if (changedFiles.length === 0) {
		console.log('No changed files detected.');
		return;
	}

	// Analyze impact
	const analyzer = new ImpactAnalyzer(project);
	const result = analyzer.analyze(changedFiles);

	// Output
	if (options.json) {
		console.log(formatImpactJSON(result));
	} else if (options.testList) {
		console.log(formatTestList(result));
	} else {
		formatImpactConsole(result, options.verbose);
	}
}

function runMethodImpact(options: CliOptions): void {
	const config = getConfig();

	// Create project
	const { project } = createProject(config.rootDir);

	// Create analyzer
	const analyzer = new MethodUsageAnalyzer(project);

	// Build full index if requested
	if (options.methodIndex) {
		const index = analyzer.buildIndex();

		if (options.json) {
			console.log(formatMethodUsageIndexJSON(index));
		} else {
			formatMethodUsageIndexConsole(index);
		}
		return;
	}

	// Require --method for impact analysis
	if (!options.method) {
		console.error('Error: --method=ClassName.methodName is required');
		console.error('Example: --method=CanvasPage.addNode');
		console.error('\nOr use --index to build the full method usage index');
		process.exit(1);
	}

	try {
		const result = analyzer.getMethodImpact(options.method);

		if (options.testList) {
			console.log(formatMethodImpactTestList(result));
		} else if (options.json) {
			console.log(formatMethodImpactJSON(result));
		} else {
			formatMethodImpactConsole(result, options.verbose);
		}
	} catch (error) {
		console.error(`Error: ${(error as Error).message}`);
		process.exit(1);
	}
}

function runTcr(options: CliOptions): void {
	const tcr = new TcrExecutor();

	const result = tcr.run({
		execute: options.execute,
		commitMessage: options.message,
		baseRef: options.baseRef,
		verbose: options.verbose,
		targetBranch: options.targetBranch,
		maxDiffLines: options.maxDiffLines,
		testCommand: options.testCommand,
	});

	// Output
	if (options.json) {
		console.log(formatTcrResultJSON(result));
	} else {
		formatTcrResultConsole(result, options.verbose);
	}

	// Exit code based on result
	if (!result.success && options.execute) {
		process.exit(1);
	}
}

function runAnalyze(options: CliOptions): void {
	const config = getConfig();
	const runner = createRunner();

	// Create project
	const { project, root } = createProject(config.rootDir);

	// Build run options
	const runOptions: RunOptions = {};

	if (options.files && options.files.length > 0) {
		runOptions.files = options.files;
	}

	if (options.fix) {
		runOptions.fix = true;
		runOptions.write = options.write;
	}

	// Pass rule-specific config
	if (options.allowInExpect) {
		runOptions.ruleConfig = {
			'selector-purity': { allowInExpect: true },
		};
	}

	// Run analysis
	let report = options.rule
		? runner.runRule(project, root, options.rule, runOptions)
		: runner.run(project, root, runOptions);

	if (!report) {
		console.error('Failed to generate report');
		process.exit(1);
	}

	// Auto-filter by baseline if present (unless --ignore-baseline or --fix)
	const baseline = loadBaseline(config.rootDir);
	let baselineFiltered = false;
	const originalViolations = report.summary.totalViolations;

	if (baseline && !options.fix && !options.ignoreBaseline) {
		// Don't filter during fix mode or when baseline is ignored
		report = filterReportByBaseline(report, baseline, config.rootDir);
		baselineFiltered = true;
	}

	// Output results
	if (options.json) {
		console.log(toJSON(report));
	} else {
		if (baselineFiltered && options.verbose) {
			console.log(formatBaselineInfo(baseline!));
			console.log(
				`New violations: ${report.summary.totalViolations} (${originalViolations} total, ${originalViolations - report.summary.totalViolations} in baseline)\n`,
			);
		} else if (baselineFiltered && report.summary.totalViolations < originalViolations) {
			console.log(
				`Using baseline: ${originalViolations - report.summary.totalViolations} known violations filtered\n`,
			);
		}

		toConsole(report, options.verbose);

		if (options.fix) {
			printFixResults(report, options.write);
		}
	}

	// Exit with error code if violations found
	if (report.summary.totalViolations > 0 && !(options.fix && options.write)) {
		process.exit(1);
	}
}

function runBaseline(options: CliOptions): void {
	const config = getConfig();

	// Create runner and project
	const runner = createRunner();
	const { project, root } = createProject(config.rootDir);

	// Run full analysis (no file filter, no baseline filter)
	const report = runner.run(project, root, {});

	if (!report) {
		console.error('Failed to generate report');
		process.exit(1);
	}

	// Generate and save baseline
	const baseline = generateBaseline(report, config.rootDir);
	saveBaseline(baseline, config.rootDir);

	const baselinePath = getBaselinePath(config.rootDir);

	if (options.verbose) {
		console.log(`\nBaseline created: ${baselinePath}`);
		console.log(`Total violations: ${baseline.totalViolations}`);
		console.log(`Files with violations: ${Object.keys(baseline.violations).length}`);
		console.log('\nViolations by rule:');
		for (const result of report.results) {
			if (result.violations.length > 0) {
				console.log(`  ${result.rule}: ${result.violations.length}`);
			}
		}
	} else {
		console.log(`Baseline created: ${baselinePath} (${baseline.totalViolations} violations)`);
	}

	console.log('\nNext steps:');
	console.log('  git add .janitor-baseline.json');
	console.log('  git commit -m "chore: add janitor baseline"');
}

async function main(): Promise<void> {
	const options = parseArgs();

	// Handle help/list commands that don't need config
	if (options.help) {
		switch (options.command) {
			case 'tcr':
				showTcrHelp();
				break;
			case 'baseline':
				showBaselineHelp();
				break;
			case 'inventory':
				showInventoryHelp();
				break;
			case 'impact':
				showImpactHelp();
				break;
			case 'method-impact':
				showMethodImpactHelp();
				break;
			default:
				showHelp();
		}
		return;
	}

	if (options.list) {
		const runner = createRunner();
		console.log('\nAvailable rules:\n');
		for (const ruleId of runner.getRegisteredRules()) {
			const fixable = runner.isRuleFixable(ruleId) ? ' [fixable]' : '';
			console.log(`  - ${ruleId}${fixable}`);
		}
		console.log('');
		return;
	}

	// Load config once for all commands that need it
	const config = await loadConfig(options.config);
	setConfig(config);

	switch (options.command) {
		case 'tcr':
			runTcr(options);
			break;
		case 'baseline':
			runBaseline(options);
			break;
		case 'inventory':
			runInventory();
			break;
		case 'impact':
			await runImpact(options);
			break;
		case 'method-impact':
			runMethodImpact(options);
			break;
		default:
			runAnalyze(options);
	}
}

main().catch((error) => {
	console.error('Error:', error);
	process.exit(1);
});
