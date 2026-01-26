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

import * as path from 'path';
import * as fs from 'fs';
import { setConfig, defineConfig, type JanitorConfig } from './config.js';
import { createProject } from './core/project-loader.js';
import { RuleRunner } from './core/rule-runner.js';
import { toJSON, toConsole, printFixResults } from './core/reporter.js';
import { TcrExecutor, formatTcrResultConsole, formatTcrResultJSON } from './core/tcr-executor.js';
import {
	InventoryAnalyzer,
	formatInventoryConsole,
	formatInventoryJSON,
	formatInventoryMarkdown,
	formatListConsole,
	formatDescribeConsole,
	formatTestDataConsole,
} from './core/inventory-analyzer.js';
import {
	ImpactAnalyzer,
	formatImpactConsole,
	formatImpactJSON,
	formatTestList,
} from './core/impact-analyzer.js';
import {
	MethodUsageAnalyzer,
	formatMethodImpactConsole,
	formatMethodImpactJSON,
	formatMethodImpactTestList,
	formatMethodUsageIndexConsole,
	formatMethodUsageIndexJSON,
} from './core/method-usage-analyzer.js';
import { BoundaryProtectionRule } from './rules/boundary-protection.rule.js';
import { ScopeLockdownRule } from './rules/scope-lockdown.rule.js';
import { SelectorPurityRule } from './rules/selector-purity.rule.js';
import { DeadCodeRule } from './rules/dead-code.rule.js';
import { ApiPurityRule } from './rules/api-purity.rule.js';
import { NoPageInFlowRule } from './rules/no-page-in-flow.rule.js';
import { DeduplicationRule } from './rules/deduplication.rule.js';
import { TestDataHygieneRule } from './rules/test-data-hygiene.rule.js';
import type { RunOptions } from './types.js';

type Command = 'analyze' | 'tcr' | 'inventory' | 'impact' | 'method-impact';

interface CliOptions {
	command: Command;
	config?: string;
	rule?: string;
	files?: string[];
	json: boolean;
	markdown: boolean;
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
	// Impact-specific options
	testList: boolean;
	// Method-impact specific options
	method?: string;
	methodIndex: boolean;
	// Inventory-specific options
	listPages: boolean;
	listComponents: boolean;
	listFlows: boolean;
	listServices: boolean;
	listComposables: boolean;
	describe?: string;
	showTestData: boolean;
	// Rule-specific options
	allowInExpect: boolean;
	// Extended TCR options
	targetBranch?: string;
	maxDiffLines?: number;
	testCommand?: string;
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
		markdown: false,
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
		testList: false,
		method: undefined,
		methodIndex: false,
		listPages: false,
		listComponents: false,
		listFlows: false,
		listServices: false,
		listComposables: false,
		describe: undefined,
		showTestData: false,
		allowInExpect: false,
		targetBranch: undefined,
		maxDiffLines: undefined,
		testCommand: undefined,
	};

	for (let i = startIdx; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--help' || arg === '-h') {
			options.help = true;
		} else if (arg === '--json') {
			options.json = true;
		} else if (arg === '--markdown' || arg === '--md') {
			options.markdown = true;
		} else if (arg === '--verbose' || arg === '-v') {
			options.verbose = true;
		} else if (arg === '--fix') {
			options.fix = true;
		} else if (arg === '--write') {
			options.write = true;
		} else if (arg === '--list' || arg === '-l') {
			options.list = true;
		} else if (arg === '--execute' || arg === '-x') {
			options.execute = true;
		} else if (arg === '--skip-rules') {
			options.skipRules = true;
		} else if (arg === '--skip-typecheck') {
			options.skipTypecheck = true;
		} else if (arg === '--test-list') {
			options.testList = true;
		} else if (arg.startsWith('--config=')) {
			options.config = arg.slice(9);
		} else if (arg.startsWith('--rule=')) {
			options.rule = arg.slice(7);
		} else if (arg.startsWith('--file=')) {
			options.files?.push(arg.slice(7));
		} else if (arg.startsWith('--files=')) {
			options.files?.push(...arg.slice(8).split(','));
		} else if (arg.startsWith('--message=') || arg.startsWith('-m=')) {
			options.message = arg.includes('=') ? arg.split('=').slice(1).join('=') : undefined;
		} else if (arg.startsWith('--base=')) {
			options.baseRef = arg.slice(7);
		} else if (arg.startsWith('--method=')) {
			options.method = arg.slice(9);
		} else if (arg === '--index') {
			options.methodIndex = true;
		} else if (arg === '--list-pages') {
			options.listPages = true;
		} else if (arg === '--list-components') {
			options.listComponents = true;
		} else if (arg === '--list-flows') {
			options.listFlows = true;
		} else if (arg.startsWith('--describe=')) {
			options.describe = arg.slice(11);
		} else if (arg === '--test-data') {
			options.showTestData = true;
		} else if (arg === '--allow-in-expect') {
			options.allowInExpect = true;
		} else if (arg === '--list-services') {
			options.listServices = true;
		} else if (arg === '--list-composables') {
			options.listComposables = true;
		} else if (arg.startsWith('--target-branch=')) {
			options.targetBranch = arg.slice(16);
		} else if (arg.startsWith('--max-diff-lines=')) {
			options.maxDiffLines = parseInt(arg.slice(17), 10);
		} else if (arg.startsWith('--test-command=')) {
			options.testCommand = arg.slice(15);
		}
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
Inventory - Show codebase structure

Usage:
  playwright-janitor inventory [options]

Shows a complete inventory of:
  - Page objects and their methods
  - Components and their methods
  - Flows/Composables and their methods
  - Test files and test cases
  - Test data files

Options:
  --json               Output as JSON
  --markdown, --md     Output as Markdown
  --verbose, -v        Include method signatures
  --list-pages         List only page objects
  --list-components    List only components
  --list-flows         List only flows/composables
  --list-services      List only services
  --list-composables   List only composables (alias for --list-flows)
  --describe=<Class>   Show detailed info about a class
  --test-data          Show test data files
  --help, -h           Show this help

Examples:
  playwright-janitor inventory                        # Console summary
  playwright-janitor inventory --json                 # JSON for AI parsing
  playwright-janitor inventory --md                   # Markdown documentation
  playwright-janitor inventory --list-pages           # List all pages
  playwright-janitor inventory --list-services        # List all services
  playwright-janitor inventory --describe=CanvasPage  # Detailed class info
  playwright-janitor inventory --test-data            # Show test data files
`);
}

function showImpactHelp(): void {
	console.log(`
Impact - Analyze which tests are affected by file changes

Usage:
  playwright-janitor impact [options]

Given changed files, determines which tests need to run.
If no files specified, uses git status to find changed files.

Options:
  --file=<path>      Specify a changed file
  --files=<p1,p2>    Specify multiple changed files
  --json             Output as JSON
  --test-list        Output just test file paths (for piping to playwright)
  --verbose, -v      Show dependency graph
  --help, -h         Show this help

Examples:
  playwright-janitor impact                           # Impact of git changes
  playwright-janitor impact --file=pages/CanvasPage.ts
  playwright-janitor impact --test-list | xargs npx playwright test
`);
}

function showMethodImpactHelp(): void {
	console.log(`
Method Impact - Find tests that use a specific method

Usage:
  playwright-janitor method-impact [options]

Finds all tests that call a specific page object method.
Uses the fixture pattern (n8n.canvas.addNode) to map property
access to actual page object classes.

Options:
  --method=<Class.method>  Method to analyze (e.g., CanvasPage.addNode)
  --index                  Build complete method usage index
  --json                   Output as JSON
  --test-list              Output just test file paths (for piping to playwright)
  --verbose, -v            Show line-by-line usages
  --help, -h               Show this help

Examples:
  playwright-janitor method-impact --method=CanvasPage.addNode
  playwright-janitor method-impact --method=WorkflowsPage.create --test-list
  playwright-janitor method-impact --method=CanvasPage.addNode --verbose
  playwright-janitor method-impact --index                    # Full usage index
  playwright-janitor method-impact --index --json             # JSON for CI
`);
}

function showTcrHelp(): void {
	console.log(`
TCR (Test && Commit || Revert) - AI-friendly atomic change workflow

Usage:
  playwright-janitor tcr [options]

How it works:
  1. Detect changed files (git status)
  2. Run janitor rules on changed files
  3. Run typecheck
  4. Analyze which methods changed (AST diff)
  5. Find tests affected by those changes
  6. Run ONLY the affected tests
  7. If all pass → commit; if any fail → revert

Options:
  --execute, -x           Actually commit/revert (default: dry run)
  --message=<msg>         Custom commit message
  --base=<ref>            Git ref to compare against (default: HEAD)
  --target-branch=<name>  Branch to diff against (default: working dir)
  --max-diff-lines=<n>    Skip if total diff exceeds N lines
  --test-command=<cmd>    Command to run tests (test files appended)
  --skip-rules            Skip janitor rules check
  --skip-typecheck        Skip typecheck
  --json                  Output as JSON
  --verbose, -v           Detailed output
  --help, -h              Show this help

Examples:
  playwright-janitor tcr                              # Dry run
  playwright-janitor tcr --execute                    # Run and commit/revert
  playwright-janitor tcr -x -m="Fix login"            # Execute with message
  playwright-janitor tcr --target-branch=main         # Diff against main branch
  playwright-janitor tcr --test-command="pnpm test"   # Custom test command

AI-Assisted Loop:
  1. Run 'playwright-janitor --json' to get violations
  2. Fix ONE violation
  3. Run 'playwright-janitor tcr --execute'
  4. If committed, repeat from step 1
  5. If reverted, try a different approach
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
				const configModule = await import(fullPath);
				const config = configModule.default || configModule;

				// Ensure rootDir is set
				if (!config.rootDir) {
					config.rootDir = path.dirname(fullPath);
				}

				return config as JanitorConfig;
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

	// Load configuration
	const config = await loadConfig(options.config);
	setConfig(config);

	// Create project
	const { project } = createProject(config.rootDir);

	// Generate inventory
	const analyzer = new InventoryAnalyzer(project);

	// Handle --describe option
	if (options.describe) {
		const classInfo = analyzer.describe(options.describe);
		if (classInfo) {
			if (options.json) {
				console.log(JSON.stringify(classInfo, null, 2));
			} else {
				formatDescribeConsole(classInfo);
			}
		} else {
			console.error(`Class not found: ${options.describe}`);
			process.exit(1);
		}
		return;
	}

	// Handle --list-* options
	if (options.listPages) {
		const items = analyzer.listCategory('pages');
		if (options.json) {
			console.log(JSON.stringify(items, null, 2));
		} else {
			formatListConsole(items, 'Pages');
		}
		return;
	}

	if (options.listComponents) {
		const items = analyzer.listCategory('components');
		if (options.json) {
			console.log(JSON.stringify(items, null, 2));
		} else {
			formatListConsole(items, 'Components');
		}
		return;
	}

	if (options.listFlows) {
		const items = analyzer.listCategory('composables');
		if (options.json) {
			console.log(JSON.stringify(items, null, 2));
		} else {
			formatListConsole(items, 'Flows');
		}
		return;
	}

	if (options.listServices) {
		const items = analyzer.listCategory('services');
		if (options.json) {
			console.log(JSON.stringify(items, null, 2));
		} else {
			formatListConsole(items, 'Services');
		}
		return;
	}

	if (options.listComposables) {
		const items = analyzer.listCategory('composables');
		if (options.json) {
			console.log(JSON.stringify(items, null, 2));
		} else {
			formatListConsole(items, 'Composables');
		}
		return;
	}

	// Handle --test-data option
	if (options.showTestData) {
		const report = analyzer.generate();
		if (options.json) {
			console.log(JSON.stringify(report.testData, null, 2));
		} else {
			formatTestDataConsole(report.testData);
		}
		return;
	}

	// Full inventory
	const report = analyzer.generate();

	// Output
	if (options.json) {
		console.log(formatInventoryJSON(report));
	} else if (options.markdown) {
		console.log(formatInventoryMarkdown(report));
	} else {
		formatInventoryConsole(report, options.verbose);
	}
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
	let changedFiles = options.files || [];

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

async function runTcr(options: CliOptions): Promise<void> {
	if (options.help) {
		showTcrHelp();
		return;
	}

	const tcr = new TcrExecutor();

	const result = await tcr.run({
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
			await runTcr(options);
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
