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

import * as fs from 'fs';
import * as path from 'path';

import { setConfig, defineConfig, type JanitorConfig } from './config.js';
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

type Command = 'analyze' | 'tcr' | 'inventory' | 'impact' | 'method-impact';

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
	skipRules: boolean;
	skipTypecheck: boolean;
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
		skipRules: false,
		skipTypecheck: false,
		targetBranch: undefined,
		maxDiffLines: undefined,
		testCommand: undefined,
		testList: false,
		method: undefined,
		methodIndex: false,
		allowInExpect: false,
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
		else if (arg === '--skip-rules') options.skipRules = true;
		else if (arg === '--skip-typecheck') options.skipTypecheck = true;
		else if (arg === '--test-list') options.testList = true;
		else if (arg === '--index') options.methodIndex = true;
		else if (arg === '--allow-in-expect') options.allowInExpect = true;
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
  inventory          Show codebase inventory (pages, components, flows, tests)
  impact             Analyze impact of file changes (which tests to run)
  method-impact      Find tests that use a specific method (e.g., CanvasPage.addNode)
  tcr                Run TCR (Test && Commit || Revert) workflow

Analysis Options:
  --config=<path>    Path to janitor.config.ts (default: ./janitor.config.ts)
  --rule=<id>        Run a specific rule
  --file=<path>      Analyze a specific file
  --files=<p1,p2>    Analyze multiple files (comma-separated)
  --json             Output as JSON
  --verbose, -v      Detailed output with suggestions
  --fix              Preview fixes (dry run)
  --fix --write      Apply fixes to disk
  --list, -l         List available rules
  --allow-in-expect  Skip selector-purity violations inside expect()
  --help, -h         Show this help

Examples:
  playwright-janitor                         # Run all rules
  playwright-janitor --rule=dead-code        # Run specific rule
  playwright-janitor inventory               # Show codebase structure
  playwright-janitor impact --file=pages/X   # Show what tests are affected
  playwright-janitor --fix --write           # Apply auto-fixes

For command-specific help:
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
  --skip-rules            Skip janitor rules
  --skip-typecheck        Skip typecheck
  --json, --verbose

Example: playwright-janitor tcr --execute -m="Fix bug"
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

	// Try to find config file
	const configLocations = configPath
		? [configPath]
		: ['janitor.config.ts', 'janitor.config.js', '.janitorrc.ts', '.janitorrc.js'];

	for (const location of configLocations) {
		const fullPath = path.isAbsolute(location) ? location : path.join(cwd, location);

		if (fs.existsSync(fullPath)) {
			try {
				// Dynamic import for config file
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
	console.warn('No janitor.config.ts found, using minimal defaults');
	return defineConfig({ rootDir: cwd });
}

async function runInventory(options: CliOptions): Promise<void> {
	if (options.help) {
		showInventoryHelp();
		return;
	}

	const config = await loadConfig(options.config);
	setConfig(config);
	const { project } = createProject(config.rootDir);
	const analyzer = new InventoryAnalyzer(project);
	const report = analyzer.generate();
	console.log(formatInventoryJSON(report));
}

async function runImpact(options: CliOptions): Promise<void> {
	if (options.help) {
		showImpactHelp();
		return;
	}

	// Load configuration
	const config = await loadConfig(options.config);
	setConfig(config);

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

async function runMethodImpact(options: CliOptions): Promise<void> {
	if (options.help) {
		showMethodImpactHelp();
		return;
	}

	// Load configuration
	const config = await loadConfig(options.config);
	setConfig(config);

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
	if (options.help) {
		showTcrHelp();
		return;
	}

	const tcr = new TcrExecutor();

	const result = tcr.run({
		execute: options.execute,
		commitMessage: options.message,
		baseRef: options.baseRef,
		verbose: options.verbose,
		skipRules: options.skipRules,
		skipTypecheck: options.skipTypecheck,
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

async function runAnalyze(options: CliOptions): Promise<void> {
	if (options.help) {
		showHelp();
		return;
	}

	const runner = createRunner();

	if (options.list) {
		console.log('\nAvailable rules:\n');
		for (const ruleId of runner.getRegisteredRules()) {
			const fixable = runner.isRuleFixable(ruleId) ? ' [fixable]' : '';
			console.log(`  - ${ruleId}${fixable}`);
		}
		console.log('');
		return;
	}

	// Load configuration
	const config = await loadConfig(options.config);
	setConfig(config);

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
	const report = options.rule
		? runner.runRule(project, root, options.rule, runOptions)
		: runner.run(project, root, runOptions);

	if (!report) {
		console.error('Failed to generate report');
		process.exit(1);
	}

	// Output results
	if (options.json) {
		console.log(toJSON(report));
	} else {
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

async function main(): Promise<void> {
	const options = parseArgs();

	switch (options.command) {
		case 'tcr':
			runTcr(options);
			break;
		case 'inventory':
			await runInventory(options);
			break;
		case 'impact':
			await runImpact(options);
			break;
		case 'method-impact':
			await runMethodImpact(options);
			break;
		default:
			await runAnalyze(options);
	}
}

main().catch((error) => {
	console.error('Error:', error);
	process.exit(1);
});
