#!/usr/bin/env tsx
/**
 * Janitor runner for n8n Playwright tests
 *
 * This wraps the @n8n/playwright-janitor with n8n-specific configuration.
 *
 * Usage:
 *   pnpm janitor              # Run all rules
 *   pnpm janitor inventory    # Show codebase structure
 *   pnpm janitor impact       # Show impact of changes
 *   pnpm janitor tcr          # TCR workflow
 *   pnpm janitor --help       # Show help
 */

import {
	runAnalysis,
	toConsole,
	toJSON,
	printFixResults,
	TcrExecutor,
	formatTcrResultConsole,
	formatTcrResultJSON,
	InventoryAnalyzer,
	formatInventoryJSON,
	ImpactAnalyzer,
	formatImpactConsole,
	formatImpactJSON,
	formatTestList,
	createProject,
	setConfig,
	type RunOptions,
} from '@n8n/playwright-janitor';
import { execSync } from 'child_process';
import config from '../janitor.config';

// Initialize config immediately so all analyzers can use getRootDir()
setConfig(config);

type Command = 'analyze' | 'tcr' | 'inventory' | 'impact';

interface CliOptions {
	command: Command;
	json: boolean;
	verbose: boolean;
	rule?: string;
	files?: string[];
	fix: boolean;
	write: boolean;
	help: boolean;
	// TCR-specific options
	execute: boolean;
	message?: string;
	baseRef?: string;
	skipRules: boolean;
	skipTypecheck: boolean;
	// Impact-specific options
	testList: boolean;
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
		}
	}

	const options: CliOptions = {
		command,
		json: false,
		verbose: false,
		rule: undefined,
		files: [],
		fix: false,
		write: false,
		help: false,
		execute: false,
		message: undefined,
		baseRef: undefined,
		skipRules: false,
		skipTypecheck: false,
		testList: false,
	};

	for (let i = startIdx; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--help' || arg === '-h') {
			options.help = true;
		} else if (arg === '--json') {
			options.json = true;
		} else if (arg === '--verbose' || arg === '-v') {
			options.verbose = true;
		} else if (arg === '--fix') {
			options.fix = true;
		} else if (arg === '--write') {
			options.write = true;
		} else if (arg === '--execute' || arg === '-x') {
			options.execute = true;
		} else if (arg === '--skip-rules') {
			options.skipRules = true;
		} else if (arg === '--skip-typecheck') {
			options.skipTypecheck = true;
		} else if (arg === '--test-list') {
			options.testList = true;
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
		}
	}

	return options;
}

function showHelp(): void {
	console.log(`
Playwright Janitor - Static analysis for n8n Playwright tests

Usage:
  pnpm janitor [command] [options]

Commands:
  (default)          Run static analysis rules
  inventory          Show codebase inventory (pages, components, flows, tests)
  impact             Analyze impact of file changes (which tests to run)
  tcr                Run TCR (Test && Commit || Revert) workflow

Analysis Options:
  --rule=<id>        Run a specific rule
  --file=<path>      Analyze a specific file
  --files=<p1,p2>    Analyze multiple files (comma-separated)
  --json             Output as JSON
  --verbose, -v      Detailed output with suggestions
  --fix              Preview fixes (dry run)
  --fix --write      Apply fixes to disk
  --help, -h         Show this help

Examples:
  pnpm janitor                         # Run all rules
  pnpm janitor --rule=dead-code        # Run specific rule
  pnpm janitor inventory               # Show codebase structure
  pnpm janitor impact --file=pages/X   # Show what tests are affected
  pnpm janitor --fix --write           # Apply auto-fixes

For command-specific help:
  pnpm janitor inventory --help
  pnpm janitor impact --help
  pnpm janitor tcr --help
`);
}

function showInventoryHelp(): void {
	console.log(`
Inventory - Show codebase structure

Usage:
  pnpm janitor inventory [options]

Shows a complete inventory of:
  - Page objects and their methods
  - Components and their methods
  - Flows/Composables and their methods
  - Test files and test cases

Options:
  --help, -h         Show this help

Examples:
  pnpm janitor inventory               # JSON output
`);
}

function showImpactHelp(): void {
	console.log(`
Impact - Analyze which tests are affected by file changes

Usage:
  pnpm janitor impact [options]

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
  pnpm janitor impact                           # Impact of git changes
  pnpm janitor impact --file=pages/CanvasPage.ts
  pnpm janitor impact --test-list | xargs npx playwright test
`);
}

function showTcrHelp(): void {
	console.log(`
TCR (Test && Commit || Revert) - AI-friendly atomic change workflow

Usage:
  pnpm janitor tcr [options]

How it works:
  1. Detect changed files (git status)
  2. Run janitor rules on changed files
  3. Run typecheck
  4. Analyze which methods changed (AST diff)
  5. Find tests affected by those changes
  6. Run ONLY the affected tests
  7. If all pass → commit; if any fail → revert

Options:
  --execute, -x      Actually commit/revert (default: dry run)
  --message=<msg>    Custom commit message
  --base=<ref>       Git ref to compare against (default: HEAD)
  --skip-rules       Skip janitor rules check
  --skip-typecheck   Skip typecheck
  --json             Output as JSON
  --verbose, -v      Detailed output
  --help, -h         Show this help

Examples:
  pnpm janitor tcr                     # Dry run - see what would happen
  pnpm janitor tcr --execute           # Run and commit/revert
  pnpm janitor tcr -x -m="Fix login"   # Execute with custom message

AI-Assisted Loop:
  1. Run 'pnpm janitor --json' to get violations
  2. Fix ONE violation
  3. Run 'pnpm janitor tcr --execute'
  4. If committed, repeat from step 1
  5. If reverted, try a different approach
`);
}

function runInventory(options: CliOptions): void {
	if (options.help) {
		showInventoryHelp();
		return;
	}

	const { project } = createProject(config.rootDir);
	const analyzer = new InventoryAnalyzer(project);
	const report = analyzer.generate();

	console.log(formatInventoryJSON(report));
}

function runImpact(options: CliOptions): void {
	if (options.help) {
		showImpactHelp();
		return;
	}

	const { project } = createProject(config.rootDir);

	// Determine changed files
	let changedFiles = options.files || [];

	if (changedFiles.length === 0) {
		// Use git status to find changed files
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

	const analyzer = new ImpactAnalyzer(project);
	const result = analyzer.analyze(changedFiles);

	if (options.json) {
		console.log(formatImpactJSON(result));
	} else if (options.testList) {
		console.log(formatTestList(result));
	} else {
		formatImpactConsole(result, options.verbose);
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
	});

	if (options.json) {
		console.log(formatTcrResultJSON(result));
	} else {
		formatTcrResultConsole(result, options.verbose);
	}

	if (!result.success && options.execute) {
		process.exit(1);
	}
}

function runAnalyze(options: CliOptions): void {
	if (options.help) {
		showHelp();
		return;
	}

	const runOptions: RunOptions = {};

	if (options.files && options.files.length > 0) {
		runOptions.files = options.files;
	}

	if (options.fix) {
		runOptions.fix = true;
		runOptions.write = options.write;
	}

	// Run analysis with n8n config
	const report = runAnalysis(config, runOptions);

	// Output
	if (options.json) {
		console.log(toJSON(report));
	} else {
		toConsole(report, options.verbose);

		if (options.fix) {
			printFixResults(report, options.write);
		}
	}

	// Exit with error if violations found
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
			runInventory(options);
			break;
		case 'impact':
			runImpact(options);
			break;
		default:
			runAnalyze(options);
	}
}

main();
