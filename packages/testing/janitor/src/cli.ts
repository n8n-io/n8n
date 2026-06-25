#!/usr/bin/env node
/**
 * Janitor CLI
 *
 * Usage:
 *   janitor                                # Run all rules
 *   janitor inventory                      # Show codebase inventory
 *   janitor impact                         # Show impact of changes
 *   janitor tcr                            # TCR workflow
 *   janitor affected-packages              # List workspace packages affected by changed files
 *   janitor scope                          # Compute per-package jest/vitest scope list
 *   janitor --help                         # Show help
 *
 * The `affected-packages` and `scope` subcommands are workspace-wide utilities
 * for CI test scoping — they do not require a janitor.config.js and can be
 * invoked from any package via `pnpm exec janitor ...`.
 */

import {
	encodeImpactMap,
	buildImpactMap,
	distributeShards,
	selectTests,
	changedRuntimeDepsFromManifests,
} from '@n8n/test-impact';
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
	showDiscoverHelp,
	showOrchestrateHelp,
	showAffectedPackagesHelp,
	showScopeHelp,
	showTestScopedHelp,
} from './cli/index.js';
import { setConfig, getConfig, defineConfig, type JanitorConfig } from './config.js';
import { affectedPackages, findWorkspaceRoot } from './core/affected-packages-analyzer.js';
import {
	generateBaseline,
	saveBaseline,
	loadBaseline,
	filterReportByBaseline,
	formatBaselineInfo,
	getBaselinePath,
} from './core/baseline.js';
import { extractDiffs } from './core/extract-diffs.js';
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
import { readLockfileImporters } from './core/read-lockfile-importers.js';
import { readManifestDiffs } from './core/read-manifest-diffs.js';
import { toJSON, toConsole } from './core/reporter.js';
import { filterToFailedSpecs } from './core/retry-filter.js';
import { computeScope, formatScope } from './core/scope-analyzer.js';
import { TcrExecutor, formatTcrResultConsole, formatTcrResultJSON } from './core/tcr-executor.js';
import { TestDiscoveryAnalyzer } from './core/test-discovery-analyzer.js';
import { runTestScoped } from './core/test-scoped-runner.js';
import { createDefaultRunner } from './index.js';
import type { RunOptions } from './types.js';
import { resolveInputPaths } from './utils/paths.js';

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
	} else {
		changedFiles = resolveInputPaths(changedFiles);
	}

	if (changedFiles.length === 0) {
		console.log('No changed files detected.');
		return;
	}

	const baseRef = options.baseRef ?? 'HEAD';
	const diffs = extractDiffs(changedFiles, baseRef);
	const analyzer = new ImpactAnalyzer(project);
	const result = analyzer.analyze(changedFiles, { diffs });

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
	const root = config.rootDir;

	// Build run options
	const runOptions: RunOptions = {};

	if (options.files && options.files.length > 0) {
		runOptions.files = options.files;
	}

	// Pass rule-specific config
	if (options.allowInExpect) {
		runOptions.ruleConfig = {
			'selector-purity': { allowInExpect: true },
		};
	}

	// Run analysis
	let report = options.rule
		? runner.runRule(options.rule, { rootDir: root }, runOptions)
		: runner.run({ rootDir: root }, runOptions);

	if (!report) {
		console.error('Failed to generate report');
		process.exit(1);
	}

	// Auto-filter by baseline if present (unless --ignore-baseline)
	const baseline = loadBaseline(config.rootDir);
	let baselineFiltered = false;
	const originalViolations = report.summary.totalViolations;

	if (baseline && !options.ignoreBaseline) {
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
	}

	// Exit with error code if violations found
	if (report.summary.totalViolations > 0) {
		process.exit(1);
	}
}

function runBaseline(options: CliOptions): void {
	const config = getConfig();

	const runner = createDefaultRunner();

	// Run full analysis (no file filter, no baseline filter)
	const report = runner.run({ rootDir: config.rootDir }, {});

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

function runDiscover(): void {
	const config = getConfig();
	const { project } = createProject(config.rootDir);
	const analyzer = new TestDiscoveryAnalyzer(project);
	const report = analyzer.discover();

	console.log(JSON.stringify(report, null, 2));
}

const DEFAULT_FILTER_SHARD_URL = 'https://internal.users.n8n.cloud/webhook/failed-specs';
const DEFAULT_FILTER_SHARD_TIMEOUT_MS = 10_000;

async function readStdinLines(): Promise<string[]> {
	if (process.stdin.isTTY) return [];
	let raw = '';
	for await (const chunk of process.stdin) raw += String(chunk);
	return raw
		.split(/\s+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

async function runFilterShard(options: CliOptions): Promise<void> {
	const candidates = await readStdinLines();
	const emit = (specs: string[]) => {
		for (const s of specs) console.log(s);
	};

	if (candidates.length === 0) return;

	const attempt = Number(process.env.GITHUB_RUN_ATTEMPT ?? '1');
	if (!Number.isFinite(attempt) || attempt <= 1) {
		emit(candidates);
		return;
	}

	const firstNonEmpty = (...vals: Array<string | undefined>) =>
		vals.find((v) => typeof v === 'string' && v.trim().length > 0);
	const url =
		firstNonEmpty(options.url, process.env.JANITOR_FILTER_SHARD_URL) ?? DEFAULT_FILTER_SHARD_URL;
	const runId = process.env.GITHUB_RUN_ID;
	if (!runId) {
		console.error('filter-shard: missing GITHUB_RUN_ID, running full shard');
		emit(candidates);
		return;
	}

	try {
		const response = await filterToFailedSpecs({
			url,
			runId,
			previousAttempt: String(attempt - 1),
			candidates,
			timeoutMs: DEFAULT_FILTER_SHARD_TIMEOUT_MS,
		});
		if (response.fallback) {
			console.error(
				`filter-shard: fallback (${response.fallbackReason ?? 'unknown'}), running ${candidates.length}/${candidates.length} specs`,
			);
			emit(candidates);
			return;
		}
		console.error(
			`filter-shard: attempt ${attempt}, running ${response.intersection.length}/${candidates.length} specs from previous-attempt failures`,
		);
		emit(response.intersection);
	} catch (error) {
		console.error(
			`filter-shard: coordinator call failed (${(error as Error).message}), running full shard`,
		);
		emit(candidates);
	}
}

async function runDistribute(options: CliOptions): Promise<void> {
	const config = getConfig();

	if (!options.shards || options.shards < 1) {
		console.error('Error: --shards=<N> is required (N >= 1)');
		process.exit(1);
	}

	const { project } = createProject(config.rootDir);
	const discoveryAnalyzer = new TestDiscoveryAnalyzer(project);
	const report = discoveryAnalyzer.discover();

	let specs = config.orchestration.specFilter
		? report.specs.filter((s) => s.path.startsWith(config.orchestration.specFilter!))
		: report.specs;

	if (options.impact) {
		let changedFiles = options.files ?? [];

		if (changedFiles.length === 0) {
			const { getChangedFiles } = await import('./utils/git-operations.js');
			changedFiles = getChangedFiles({
				scopeDir: config.rootDir,
				extensions: ['.ts'],
				targetBranch: options.baseRef,
			});
		} else {
			changedFiles = resolveInputPaths(changedFiles);
		}

		if (changedFiles.length === 0) {
			console.error('Impact: No changed files detected. Returning empty orchestration.');
			specs = [];
		} else {
			const baseRef = options.baseRef ?? 'HEAD';
			const diffs = extractDiffs(changedFiles, baseRef);
			const impactAnalyzer = new ImpactAnalyzer(project);
			const impactResult = impactAnalyzer.analyze(changedFiles, { diffs });
			const affectedSet = new Set(impactResult.affectedTests);
			const totalBefore = specs.length;
			specs = specs.filter((s) => affectedSet.has(s.path));
			console.error(
				`Impact: ${specs.length}/${totalBefore} specs affected by ${changedFiles.length} changed files`,
			);
		}
	}

	// Composable allowlist filter. distribute-tests.mjs pre-computes the union
	// of AST + V8 selection and writes it here; distributeShards then balances shards
	// against that subset instead of the full discovered set.
	if (options.includeSpecsFile) {
		const includeRaw = fs.readFileSync(options.includeSpecsFile, 'utf-8');
		const include = new Set(
			includeRaw
				.split(/[\n,]+/)
				.map((s) => s.trim())
				.filter(Boolean),
		);
		const totalBefore = specs.length;
		specs = specs.filter((s) => include.has(s.path));
		console.error(
			`Include: ${specs.length}/${totalBefore} specs after applying allowlist (${include.size} entries)`,
		);
	}

	const metrics: Record<string, number> = {};
	if (config.orchestration.metricsPath) {
		const metricsPath = path.isAbsolute(config.orchestration.metricsPath)
			? config.orchestration.metricsPath
			: path.resolve(config.rootDir, config.orchestration.metricsPath);

		if (fs.existsSync(metricsPath)) {
			try {
				const raw = JSON.parse(fs.readFileSync(metricsPath, 'utf-8')) as {
					specs?: Record<string, { avgDuration?: number }>;
				};
				if (raw.specs) {
					for (const [specPath, data] of Object.entries(raw.specs)) {
						if (data.avgDuration) {
							metrics[specPath] = data.avgDuration;
						}
					}
				}
			} catch (error) {
				console.error(`Warning: Failed to parse metrics file ${metricsPath}: ${String(error)}`);
			}
		} else {
			console.error(`Warning: Metrics file not found: ${metricsPath}`);
		}
	}

	const result = distributeShards(specs, options.shards, metrics, config.orchestration);

	if (options.shardIndex !== undefined) {
		if (Number.isNaN(options.shardIndex) || options.shardIndex < 0) {
			console.error('Error: --shard-index must be >= 0');
			process.exit(1);
		}
		const shard = result.shards[options.shardIndex];
		if (shard) {
			console.log(shard.specs.join('\n'));
		}
		return;
	}

	console.log(JSON.stringify(result, null, 2));
}

/**
 * Read CHANGED_FILES from --changed-files flag or env. Returns null when
 * neither is set — callers treat that as "no signal, run everything" so local
 * dev (`pnpm test:changed` with no env) doesn't silently skip tests.
 */
function readChangedFiles(options: CliOptions): string[] | null {
	const flag = options.changedFiles;
	const env = process.env.CHANGED_FILES;
	if (flag === undefined && env === undefined) return null;
	const raw = flag ?? env ?? '';
	const files = raw
		.split(/[\n,]+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
	// An empty value is "no signal", not "nothing changed". ci-filter emits an
	// empty list on huge change sets (too large to pass through env/argv); a [] return
	// would SKIP every package — a false green — so collapse it to null (run full).
	return files.length > 0 ? files : null;
}

function runAffectedPackages(options: CliOptions): void {
	const result = affectedPackages({
		rootDir: findWorkspaceRoot(process.cwd()),
		changedFiles: readChangedFiles(options),
	});
	console.log(result.join('\n'));
}

function runTestScopedCmd(options: CliOptions): void {
	if (!options.runner) {
		console.error('Error: --runner=jest|vitest is required');
		process.exit(1);
	}
	const packageDir = options.packageDir ?? process.cwd();
	const changedFiles = readChangedFiles(options);
	const exitCode = runTestScoped({
		runner: options.runner,
		packageDir,
		rootDir: findWorkspaceRoot(process.cwd()),
		changedFiles,
		passthroughArgs: options.passthroughArgs,
		jestVariant: options.jestVariant,
	});
	process.exit(exitCode);
}

function runScope(options: CliOptions): void {
	if (!options.runner) {
		console.error('Error: --runner=jest|vitest is required');
		process.exit(1);
	}

	const result = computeScope({
		runner: options.runner,
		packageDir: options.packageDir ?? process.cwd(),
		changedFiles: readChangedFiles(options),
		rootDir: findWorkspaceRoot(process.cwd()),
		jestVariant: options.jestVariant,
	});
	console.log(formatScope(result));
}

function findLcovFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of fs.readdirSync(dir)) {
		const p = path.join(dir, entry);
		if (fs.statSync(p).isDirectory()) out.push(...findLcovFiles(p));
		else if (entry.endsWith('.lcov') || entry === 'lcov.info') out.push(p);
	}
	return out;
}

/** merge-coverage: per-spec lcovs (under --inputs-dir) → unified lcov + impact map. */
function runMergeCoverage(options: CliOptions): void {
	if (!options.inputsDir || !options.outLcov || !options.outMap) {
		console.error('Error: --inputs-dir, --out-lcov, and --out-map are required');
		process.exit(1);
	}
	const files = fs.existsSync(options.inputsDir) ? findLcovFiles(options.inputsDir) : [];
	// spec attribution comes from each lcov's TN:; the path is only a fallback.
	const inputs = files.map((f) => ({ text: fs.readFileSync(f, 'utf8'), spec: f }));
	const result = buildImpactMap(inputs);
	fs.writeFileSync(options.outLcov, result.lcov);
	// Interned on-disk form — spec paths once, referenced by index (~10x smaller).
	fs.writeFileSync(options.outMap, JSON.stringify(encodeImpactMap(result.impactMap)));
	console.error(
		`merge-coverage: ${files.length} lcov(s) → ${result.stats.files} files, ` +
			`${result.stats.mapEntries} map entries, ${result.stats.specs} specs`,
	);
}

/** select: changed files + impact map → spec list (JSON). I/O wrapper
 *  around {@link selectTests}, where the fail-open safety contract lives. */
function runSelect(options: CliOptions): void {
	const changedFiles = readChangedFiles(options) ?? [];
	// With a base ref, read each changed package.json before/after so the
	// devDependency-only classifier can drop a devDep-only lockfile change.
	// No base (local dev) → omit manifests → conservative (keep lockfile broad).
	const manifests = options.baseRef ? readManifestDiffs(changedFiles, options.baseRef) : undefined;
	// Only parse the (large) lockfile when a RUNTIME dependency actually changed —
	// the only case the dep-graph selector (389) acts on. A devDep-only manifest
	// change would parse it for nothing.
	const lockfileImporters =
		manifests && changedRuntimeDepsFromManifests(manifests).length > 0
			? readLockfileImporters()
			: undefined;
	const result = selectTests({
		changedFiles,
		mapFile: options.mapFile,
		allSpecsFile: options.allSpecsFile,
		manifests,
		lockfileImporters,
	});
	console.log(JSON.stringify(result));
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
			case 'discover':
				showDiscoverHelp();
				break;
			case 'distribute':
				showOrchestrateHelp();
				break;
			case 'affected-packages':
				showAffectedPackagesHelp();
				break;
			case 'scope':
				showScopeHelp();
				break;
			case 'test-scoped':
				showTestScopedHelp();
				break;
			default:
				showHelp();
		}
		return;
	}

	// Workspace-wide CI utilities: no config file required.
	if (options.command === 'affected-packages') {
		runAffectedPackages(options);
		return;
	}
	if (options.command === 'scope') {
		runScope(options);
		return;
	}
	if (options.command === 'test-scoped') {
		runTestScopedCmd(options);
		return;
	}
	if (options.command === 'merge-coverage') {
		runMergeCoverage(options);
		return;
	}
	if (options.command === 'select') {
		runSelect(options);
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
		case 'discover':
			runDiscover();
			break;
		case 'distribute':
			await runDistribute(options);
			break;
		case 'filter-shard':
			await runFilterShard(options);
			break;
		default:
			runAnalyze(options);
	}
}

main().catch((error) => {
	console.error('Error:', error);
	process.exit(1);
});
