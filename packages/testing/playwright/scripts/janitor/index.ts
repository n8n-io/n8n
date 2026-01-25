#!/usr/bin/env tsx
/**
 * Janitor - Static Analysis, Inventory & Dead Code Tool for Playwright Test Architecture
 *
 * Static Analysis:
 *   npx tsx scripts/janitor/index.ts              # Run all rules, console output
 *   npx tsx scripts/janitor/index.ts --json       # JSON output for LLM
 *   npx tsx scripts/janitor/index.ts --rule=X     # Run single rule
 *   npx tsx scripts/janitor/index.ts --verbose    # Detailed output
 *   npx tsx scripts/janitor/index.ts --list       # List available rules
 *   npx tsx scripts/janitor/index.ts --file=X     # Analyze specific file
 *   npx tsx scripts/janitor/index.ts --files=X,Y  # Analyze multiple files
 *   npx tsx scripts/janitor/index.ts --allow-in-expect  # Skip selector-purity violations inside expect()
 *
 * Dead Code Removal:
 *   npx tsx scripts/janitor/index.ts --rule=dead-code           # Find unused code
 *   npx tsx scripts/janitor/index.ts --rule=dead-code --fix     # Preview removals
 *   npx tsx scripts/janitor/index.ts --rule=dead-code --fix --write  # Apply removals
 *
 * File-Level Impact Analysis (facade-aware):
 *   npx tsx scripts/janitor/index.ts --impact=file1.ts,file2.ts  # Find affected tests
 *   npx tsx scripts/janitor/index.ts --impact=file.ts --json     # JSON output
 *   npx tsx scripts/janitor/index.ts --impact=file.ts --tests    # Just test file list
 *   npx tsx scripts/janitor/index.ts --facade=X,Y                # Override facade files
 *
 * Method-Level Impact Analysis (fixture-aware):
 *   npx tsx scripts/janitor/index.ts --method-impact=CanvasPage.addNode    # Find tests using method
 *   npx tsx scripts/janitor/index.ts --method-impact=X.Y --tests           # Just test file list
 *   npx tsx scripts/janitor/index.ts --method-impact=X.Y --verbose         # Show line-by-line usages
 *   npx tsx scripts/janitor/index.ts --method-index                        # Build full usage index
 *   npx tsx scripts/janitor/index.ts --method-index --json                 # JSON for CI integration
 *
 * Inventory (codebase discovery for AI/devs):
 *   npx tsx scripts/janitor/index.ts --inventory            # Full codebase inventory
 *   npx tsx scripts/janitor/index.ts --inventory --json     # JSON for AI consumption
 *   npx tsx scripts/janitor/index.ts --list-pages           # List all page objects
 *   npx tsx scripts/janitor/index.ts --list-services        # List all services
 *   npx tsx scripts/janitor/index.ts --list-components      # List all components
 *   npx tsx scripts/janitor/index.ts --list-composables     # List all composables
 *   npx tsx scripts/janitor/index.ts --describe=ClassName   # Detailed info about a class
 *
 * Facade files (default: n8nPage.ts, base.ts) are aggregators that import many files.
 * When impact analysis reaches a facade, it switches from import-tracing to
 * property-access search for accurate results.
 *
 * Method-level impact understands the fixture pattern (n8n.canvas.addNode()) and
 * maps property access to actual page object classes for precise test selection.
 */

import { createProject } from './core/project-loader';
import { RuleRunner } from './core/rule-runner';
import { toJSON, toConsole, printFixResults } from './core/reporter';
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
	formatTestDataConsole,
} from './core/inventory-analyzer';
import {
	MethodUsageAnalyzer,
	formatMethodImpactConsole,
	formatMethodImpactJSON,
	formatMethodImpactTestList,
	formatMethodUsageIndexConsole,
	formatMethodUsageIndexJSON,
} from './core/method-usage-analyzer';
import type { RunOptions } from './core/types';

import { BoundaryProtectionRule } from './rules/boundary-protection.rule';
import { ScopeLockdownRule } from './rules/scope-lockdown.rule';
import { SelectorPurityRule } from './rules/selector-purity.rule';
import { DeduplicationRule } from './rules/deduplication.rule';
import { NoPageInComposableRule } from './rules/no-page-in-composable.rule';
import { DeadCodeRule } from './rules/dead-code.rule';
import { ApiPurityRule } from './rules/api-purity.rule';

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
	fix: boolean;
	write: boolean;
	inventory: boolean;
	listPages: boolean;
	listServices: boolean;
	listComponents: boolean;
	listComposables: boolean;
	listTestData: boolean;
	describe?: string;
	methodImpact?: string;
	methodIndex: boolean;
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
		facades: undefined,
		fix: false,
		write: false,
		inventory: false,
		listPages: false,
		listServices: false,
		listComponents: false,
		listComposables: false,
		listTestData: false,
		describe: undefined,
		methodImpact: undefined,
		methodIndex: false,
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
		} else if (arg === '--fix') {
			options.fix = true;
		} else if (arg === '--write') {
			options.write = true;
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
		} else if (arg === '--list-composables') {
			options.listComposables = true;
		} else if (arg === '--list-test-data') {
			options.listTestData = true;
		} else if (arg.startsWith('--describe=')) {
			options.describe = arg.slice(11);
		} else if (arg.startsWith('--method-impact=')) {
			options.methodImpact = arg.slice(16);
		} else if (arg === '--method-index') {
			options.methodIndex = true;
		}
	}

	return options;
}

function createRunner(): RuleRunner {
	const runner = new RuleRunner();

	runner.registerRule(new BoundaryProtectionRule());
	runner.registerRule(new ScopeLockdownRule());
	runner.registerRule(new SelectorPurityRule());
	runner.registerRule(new DeduplicationRule());
	runner.registerRule(new NoPageInComposableRule());
	runner.registerRule(new DeadCodeRule());
	runner.registerRule(new ApiPurityRule());

	return runner;
}

function listRules(runner: RuleRunner): void {
	console.log('\nAvailable rules:\n');

	const rules = runner.getRegisteredRules();
	for (const ruleId of rules) {
		const fixable = ruleId === 'dead-code' ? ' [fixable]' : '';
		console.log(`  - ${ruleId}${fixable}`);
	}

	console.log('\nStatic Analysis Options:');
	console.log('  --rule=<rule-id>     Run a specific rule');
	console.log('  --file=<path>        Analyze a specific file');
	console.log('  --files=<p1,p2>      Analyze multiple files (comma-separated)');
	console.log('  --allow-in-expect    Skip selector-purity violations in expect() calls');
	console.log('  --json               Output as JSON');
	console.log('  --verbose            Show detailed output with suggestions');

	console.log('\nAuto-Fix Options:');
	console.log('  --fix                Preview fixes for fixable rules (dry run)');
	console.log('  --fix --write        Apply fixes to disk');

	console.log('\nImpact Analysis:');
	console.log('  --impact=<files>     Find tests affected by changed files');
	console.log('  --tests              Output only test file paths (for piping)');
	console.log('  --facade=<files>     Override facade files (default: n8nPage.ts, base.ts)');

	console.log('\nInventory (codebase discovery):');
	console.log('  --inventory          Full codebase inventory (pages, services, fixtures, etc.)');
	console.log('  --list-pages         List all page objects');
	console.log('  --list-services      List all API services');
	console.log('  --list-components    List all components');
	console.log('  --list-composables   List all composables');
	console.log('  --list-test-data     List all test data files (workflows, expectations, etc.)');
	console.log('  --describe=<Class>   Detailed info about a specific class');

	console.log('\nMethod-Level Impact (fixture-aware):');
	console.log('  --method-impact=Class.method   Find tests that call a specific method');
	console.log('  --method-index                 Build complete method usage index');
	console.log('  --tests                        Output only test file paths (for piping)');

	console.log('\nExamples:');
	console.log('  # Static analysis');
	console.log('  npx tsx scripts/janitor/index.ts --file=pages/NewPage.ts');
	console.log('');
	console.log('  # Dead code removal');
	console.log('  npx tsx scripts/janitor/index.ts --rule=dead-code              # Find unused');
	console.log('  npx tsx scripts/janitor/index.ts --rule=dead-code --fix        # Preview');
	console.log('  npx tsx scripts/janitor/index.ts --rule=dead-code --fix --write  # Remove');
	console.log('');
	console.log('  # File-level impact analysis');
	console.log('  npx tsx scripts/janitor/index.ts --impact=pages/CanvasPage.ts');
	console.log(
		'  npx tsx scripts/janitor/index.ts --impact=pages/CanvasPage.ts --tests | xargs playwright test',
	);
	console.log('');
	console.log('  # Method-level impact analysis');
	console.log('  npx tsx scripts/janitor/index.ts --method-impact=CanvasPage.addNode');
	console.log('  npx tsx scripts/janitor/index.ts --method-impact=WorkflowsPage.addFolder --tests');
	console.log('  npx tsx scripts/janitor/index.ts --method-index --json');
	console.log('');
	console.log('  # Inventory for AI');
	console.log('  npx tsx scripts/janitor/index.ts --inventory --json > .playwright-inventory.json');
	console.log('  npx tsx scripts/janitor/index.ts --describe=CanvasPage');
	console.log('  npx tsx scripts/janitor/index.ts --list-pages --json');
	console.log('');
}

async function main() {
	const options = parseArgs();

	// Initialize ts-morph project
	const { project, root } = createProject();

	// Handle impact analysis mode
	if (options.impact && options.impact.length > 0) {
		const analyzer = new ImpactAnalyzer(project, {
			facades: options.facades,
		});
		const result = analyzer.analyze(options.impact);

		if (options.testsOnly) {
			console.log(formatTestList(result));
		} else if (options.json) {
			console.log(formatImpactJSON(result));
		} else {
			formatImpactConsole(result, options.verbose);
		}

		return;
	}

	// Handle method-level impact analysis
	if (options.methodImpact || options.methodIndex) {
		const methodAnalyzer = new MethodUsageAnalyzer(project);

		if (options.methodImpact) {
			try {
				const result = methodAnalyzer.getMethodImpact(options.methodImpact);

				if (options.testsOnly) {
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
		} else if (options.methodIndex) {
			const index = methodAnalyzer.buildIndex();

			if (options.json) {
				console.log(formatMethodUsageIndexJSON(index));
			} else {
				formatMethodUsageIndexConsole(index);
			}
		}

		return;
	}

	// Handle inventory mode
	if (
		options.inventory ||
		options.listPages ||
		options.listServices ||
		options.listComponents ||
		options.listComposables ||
		options.listTestData ||
		options.describe
	) {
		const inventoryAnalyzer = new InventoryAnalyzer(project);

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

		const inventory = inventoryAnalyzer.analyze();

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

		if (options.listComposables) {
			if (options.json) {
				console.log(JSON.stringify(inventory.composables, null, 2));
			} else {
				formatListConsole(inventory.composables, 'Composables');
			}
			return;
		}

		if (options.listTestData) {
			if (options.json) {
				console.log(JSON.stringify(inventory.testData, null, 2));
			} else {
				formatTestDataConsole(inventory.testData);
			}
			return;
		}

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

	if (options.fix) {
		runOptions.fix = true;
		runOptions.write = options.write;
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

		// Show fix results if in fix mode
		if (options.fix) {
			printFixResults(report, options.write);
		}
	}

	// Exit with error code if violations found (but not in fix+write mode where we fixed them)
	if (report.summary.totalViolations > 0 && !(options.fix && options.write)) {
		process.exit(1);
	}
}

main().catch((error) => {
	console.error('Error:', error);
	process.exit(1);
});
