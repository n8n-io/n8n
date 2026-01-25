#!/usr/bin/env tsx
/**
 * Janitor - Static Analysis Tool for Playwright Test Architecture
 *
 * Usage:
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
	console.log('');
	console.log('Examples:');
	console.log('  npx tsx scripts/janitor --impact=pages/CanvasPage.ts');
	console.log('  npx tsx scripts/janitor --impact=pages/CanvasPage.ts --json');
	console.log(
		'  npx tsx scripts/janitor --impact=pages/CanvasPage.ts --tests | xargs playwright test',
	);
	console.log('');
	console.log('Facade-aware analysis:');
	console.log('  When tracing through facade files (aggregators like n8nPage.ts),');
	console.log('  the analyzer switches from import-tracing to property-access search.');
	console.log('  This gives accurate results for component changes.');
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
