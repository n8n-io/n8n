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

import {
	parseArgs,
	type CliOptions,
	showHelp,
	showBaselineHelp,
	showImpactHelp,
	showInventoryHelp,
	showMethodImpactHelp,
	showRulesHelp,
	showTcrHelp,
} from './cli/index.js';
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
import {
	InventoryAnalyzer,
	formatInventoryJSON,
	formatInventorySummaryJSON,
	formatInventoryCategoryJSON,
	toSummary,
	toCategory,
	filterByFile,
	type InventoryCategory,
} from './core/inventory-analyzer.js';
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
import { TcrExecutor, formatTcrResultConsole, formatTcrResultJSON } from './core/tcr-executor.js';
import { createDefaultRunner } from './index.js';
import type { RunOptions } from './types.js';

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

const VALID_CATEGORIES: InventoryCategory[] = [
	'pages',
	'components',
	'composables',
	'services',
	'fixtures',
	'helpers',
	'factories',
	'testData',
];

function runInventory(options: CliOptions): void {
	const config = getConfig();
	const { project } = createProject(config.rootDir);
	const analyzer = new InventoryAnalyzer(project);
	const report = analyzer.generate();

	// Summary mode - minimal output for AI
	if (options.summary) {
		console.log(formatInventorySummaryJSON(toSummary(report)));
		return;
	}

	// Category filter - single category with method names only
	if (options.category) {
		if (!VALID_CATEGORIES.includes(options.category as InventoryCategory)) {
			console.error(`Invalid category: ${options.category}`);
			console.error(`Valid categories: ${VALID_CATEGORIES.join(', ')}`);
			process.exit(1);
		}
		console.log(
			formatInventoryCategoryJSON(toCategory(report, options.category as InventoryCategory)),
		);
		return;
	}

	// File filter - detailed info for single file
	if (options.files && options.files.length === 1) {
		const result = filterByFile(report, options.files[0]);
		if (result) {
			console.log(JSON.stringify(result, null, 2));
		} else {
			console.error(`File not found in inventory: ${options.files[0]}`);
			process.exit(1);
		}
		return;
	}

	// Default: full inventory
	console.log(formatInventoryJSON(report));
}

async function runImpact(options: CliOptions): Promise<void> {
	const config = getConfig();

	// Create project
	const { project } = createProject(config.rootDir);

	// Determine changed files
	let changedFiles = options.files ?? [];

	if (changedFiles.length === 0) {
		// Use git status to find changed files
		const { getChangedFiles } = await import('./utils/git-operations.js');
		changedFiles = getChangedFiles({
			scopeDir: config.rootDir,
			extensions: ['.ts'],
		});
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
	const runner = createDefaultRunner();

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
	const runner = createDefaultRunner();
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

function runRules(options: CliOptions): void {
	const runner = createDefaultRunner();
	const rules = runner.getRuleDetails();

	if (options.json) {
		console.log(JSON.stringify(rules, null, 2));
	} else {
		console.log('\nAvailable Rules\n' + '='.repeat(50) + '\n');

		for (const rule of rules) {
			const fixable = rule.fixable ? ' [fixable]' : '';
			const enabled = rule.enabled ? '' : ' (disabled)';
			const severity = rule.severity.toUpperCase();

			console.log(`${rule.id}${fixable}${enabled}`);
			console.log(`  Name: ${rule.name}`);
			console.log(`  Severity: ${severity}`);
			console.log(`  ${rule.description}`);

			if (options.verbose) {
				console.log(`  Targets: ${rule.targetGlobs.join(', ')}`);
			}

			console.log('');
		}

		console.log(`Total: ${rules.length} rules (${rules.filter((r) => r.enabled).length} enabled)`);
	}
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
			case 'rules':
				showRulesHelp();
				break;
			default:
				showHelp();
		}
		return;
	}

	if (options.list) {
		const runner = createDefaultRunner();
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
			runInventory(options);
			break;
		case 'impact':
			await runImpact(options);
			break;
		case 'method-impact':
			runMethodImpact(options);
			break;
		case 'rules':
			runRules(options);
			break;
		default:
			runAnalyze(options);
	}
}

main().catch((error) => {
	console.error('Error:', error);
	process.exit(1);
});
