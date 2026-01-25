#!/usr/bin/env tsx
/**
 * Janitor - Static Analysis & Inventory Tool for Playwright Test Architecture
 *
 * Static Analysis:
 *   npx tsx scripts/janitor              # Run all rules, console output
 *   npx tsx scripts/janitor --json       # JSON output for LLM
 *   npx tsx scripts/janitor --rule=X     # Run single rule
 *   npx tsx scripts/janitor --verbose    # Detailed output
 *   npx tsx scripts/janitor --list       # List available rules
 *   npx tsx scripts/janitor --file=X     # Analyze specific file
 *   npx tsx scripts/janitor --files=X,Y  # Analyze multiple files
 *   npx tsx scripts/janitor --allow-in-expect  # Skip selector-purity violations inside expect()
 *
 * Impact Analysis (facade-aware):
 *   npx tsx scripts/janitor --impact=file1.ts,file2.ts  # Find affected tests
 *   npx tsx scripts/janitor --impact=file.ts --json     # JSON output
 *   npx tsx scripts/janitor --impact=file.ts --tests    # Just test file list
 *   npx tsx scripts/janitor --facade=X,Y                # Override facade files
 *
 * Inventory (codebase discovery for AI/devs):
 *   npx tsx scripts/janitor --inventory            # Full codebase inventory
 *   npx tsx scripts/janitor --inventory --json     # JSON for AI consumption
 *   npx tsx scripts/janitor --list-pages           # List all page objects
 *   npx tsx scripts/janitor --list-services        # List all services
 *   npx tsx scripts/janitor --list-components      # List all components
 *   npx tsx scripts/janitor --describe=ClassName   # Detailed info about a class
 *
 * Facade files (default: n8nPage.ts, base.ts) are aggregators that import many files.
 * When impact analysis reaches a facade, it switches from import-tracing to
 * property-access search for accurate results.
 */

import { createProject } from './core/project-loader';
import { RuleRunner } from './core/rule-runner';
import { toJSON, toConsole } from './core/reporter';
import {
	ImpactAnalyzer,
	formatImpactConsole,
	formatImpactJSON,
	formatTestList,
} from './core/impact-analyzer';
import {
	InventoryAnalyzer,
	formatInventoryConsole,
	formatInventoryJSON,
	formatDescribeConsole,
	formatListConsole,
} from './core/inventory-analyzer';
import type { RunOptions } from './core/types';

// Import rules
import { BoundaryProtectionRule } from './rules/boundary-protection.rule';
import { ScopeLockdownRule } from './rules/scope-lockdown.rule';
import { SelectorPurityRule } from './rules/selector-purity.rule';
import { DeduplicationRule } from './rules/deduplication.rule';

interface CliOptions {
	json: boolean;
	verbose: boolean;
	rule?: string;
	exclude?: string[];
	list: boolean;
	files?: string[];
	allowInExpect: boolean;
	impact?: string[];
	testsOnly: boolean;
	facades?: string[];
	// Inventory options
	inventory: boolean;
	listPages: boolean;
	listServices: boolean;
	listComponents: boolean;
	describe?: string;
}

function parseArgs(): CliOptions {
	const args = process.argv.slice(2);

	const options: CliOptions = {
		json: false,
		verbose: false,
		rule: undefined,
		exclude: [],
		list: false,
		files: [],
		allowInExpect: false,
		impact: undefined,
		testsOnly: false,
		facades: undefined, // Uses default if not specified
		// Inventory
		inventory: false,
		listPages: false,
		listServices: false,
		listComponents: false,
		describe: undefined,
	};

	for (const arg of args) {
		if (arg === '--json') {
			options.json = true;
		} else if (arg === '--verbose' || arg === '-v') {
			options.verbose = true;
		} else if (arg === '--list' || arg === '-l') {
			options.list = true;
		} else if (arg === '--allow-in-expect') {
			options.allowInExpect = true;
		} else if (arg === '--tests' || arg === '--tests-only') {
			options.testsOnly = true;
		} else if (arg.startsWith('--rule=')) {
			options.rule = arg.slice(7);
		} else if (arg.startsWith('--exclude=')) {
			options.exclude?.push(arg.slice(10));
		} else if (arg.startsWith('--file=')) {
			options.files?.push(arg.slice(7));
		} else if (arg.startsWith('--files=')) {
			const fileList = arg.slice(8).split(',');
			options.files?.push(...fileList);
		} else if (arg.startsWith('--impact=')) {
			const impactFiles = arg.slice(9).split(',');
			options.impact = impactFiles;
		} else if (arg.startsWith('--facade=')) {
			const facadeFiles = arg.slice(9).split(',');
			options.facades = options.facades ?? [];
			options.facades.push(...facadeFiles);
		} else if (arg === '--inventory') {
			options.inventory = true;
		} else if (arg === '--list-pages') {
			options.listPages = true;
		} else if (arg === '--list-services') {
			options.listServices = true;
		} else if (arg === '--list-components') {
			options.listComponents = true;
		} else if (arg.startsWith('--describe=')) {
			options.describe = arg.slice(11);
		}
	}

	return options;
}

function createRunner(): RuleRunner {
	const runner = new RuleRunner();

	// Register all rules
	runner.registerRule(new BoundaryProtectionRule());
	runner.registerRule(new ScopeLockdownRule());
	runner.registerRule(new SelectorPurityRule());
	runner.registerRule(new DeduplicationRule());

	return runner;
}

function listRules(runner: RuleRunner): void {
	console.log('\nAvailable rules:\n');

	const rules = runner.getRegisteredRules();
	for (const ruleId of rules) {
		console.log(`  - ${ruleId}`);
	}

	console.log('\nStatic Analysis Options:');
	console.log('  --rule=<rule-id>     Run a specific rule');
	console.log('  --file=<path>        Analyze a specific file');
	console.log('  --files=<p1,p2>      Analyze multiple files (comma-separated)');
	console.log('  --allow-in-expect    Skip selector-purity violations in expect() calls');
	console.log('  --json               Output as JSON');
	console.log('  --verbose            Show detailed output with suggestions');

	console.log('\nImpact Analysis:');
	console.log('  --impact=<files>     Find tests affected by changed files');
	console.log('  --tests              Output only test file paths (for piping)');
	console.log('  --facade=<files>     Override facade files (default: n8nPage.ts, base.ts)');

	console.log('\nInventory (codebase discovery):');
	console.log('  --inventory          Full codebase inventory (pages, services, fixtures, etc.)');
	console.log('  --list-pages         List all page objects');
	console.log('  --list-services      List all API services');
	console.log('  --list-components    List all components');
	console.log('  --describe=<Class>   Detailed info about a specific class');

	console.log('\nExamples:');
	console.log('  # Static analysis');
	console.log('  npx tsx scripts/janitor --file=pages/NewPage.ts');
	console.log('');
	console.log('  # Impact analysis');
	console.log('  npx tsx scripts/janitor --impact=pages/CanvasPage.ts');
	console.log(
		'  npx tsx scripts/janitor --impact=pages/CanvasPage.ts --tests | xargs playwright test',
	);
	console.log('');
	console.log('  # Inventory for AI');
	console.log('  npx tsx scripts/janitor --inventory --json > .playwright-inventory.json');
	console.log('  npx tsx scripts/janitor --describe=CanvasPage');
	console.log('  npx tsx scripts/janitor --list-pages --json');
	console.log('');
}

async function main() {
	const options = parseArgs();

	// Initialize ts-morph project
	const { project, root } = createProject();

	// Handle impact analysis mode
	if (options.impact && options.impact.length > 0) {
		const analyzer = new ImpactAnalyzer(project, {
			facades: options.facades, // Uses default if undefined
		});
		const result = analyzer.analyze(options.impact);

		if (options.testsOnly) {
			// Just output test file list (for piping to playwright)
			console.log(formatTestList(result));
		} else if (options.json) {
			console.log(formatImpactJSON(result));
		} else {
			formatImpactConsole(result, options.verbose);
		}

		// Exit with code 0 - impact analysis is informational
		return;
	}

	// Handle inventory mode
	if (
		options.inventory ||
		options.listPages ||
		options.listServices ||
		options.listComponents ||
		options.describe
	) {
		const inventoryAnalyzer = new InventoryAnalyzer(project);

		// Describe a specific class
		if (options.describe) {
			const info = inventoryAnalyzer.describe(options.describe);
			if (!info) {
				console.error(`Class not found: ${options.describe}`);
				process.exit(1);
			}
			if (options.json) {
				console.log(JSON.stringify(info, null, 2));
			} else {
				formatDescribeConsole(info);
			}
			return;
		}

		// Full inventory
		const inventory = inventoryAnalyzer.analyze();

		// List specific categories
		if (options.listPages) {
			if (options.json) {
				console.log(JSON.stringify(inventory.pages, null, 2));
			} else {
				formatListConsole(inventory.pages, 'Pages');
			}
			return;
		}

		if (options.listServices) {
			if (options.json) {
				console.log(JSON.stringify(inventory.services, null, 2));
			} else {
				formatListConsole(inventory.services, 'Services');
			}
			return;
		}

		if (options.listComponents) {
			if (options.json) {
				console.log(JSON.stringify(inventory.components, null, 2));
			} else {
				formatListConsole(inventory.components, 'Components');
			}
			return;
		}

		// Full inventory output
		if (options.json) {
			console.log(formatInventoryJSON(inventory));
		} else {
			formatInventoryConsole(inventory, options.verbose);
		}
		return;
	}

	const runner = createRunner();

	if (options.list) {
		listRules(runner);
		return;
	}

	// Configure rules
	if (options.rule) {
		const registeredRules = runner.getRegisteredRules();
		if (!registeredRules.includes(options.rule)) {
			console.error(`Unknown rule: ${options.rule}`);
			console.error(`Available rules: ${registeredRules.join(', ')}`);
			process.exit(1);
		}
	}

	if (options.exclude && options.exclude.length > 0) {
		for (const ruleId of options.exclude) {
			runner.disableRule(ruleId);
		}
	}

	// Build run options
	const runOptions: RunOptions = {};

	if (options.files && options.files.length > 0) {
		runOptions.files = options.files;
	}

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
	}

	// Exit with error code if violations found
	if (report.summary.totalViolations > 0) {
		process.exit(1);
	}
}

main().catch((error) => {
	console.error('Error:', error);
	process.exit(1);
});
