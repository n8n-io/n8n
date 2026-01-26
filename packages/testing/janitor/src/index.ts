/**
 * @n8n/playwright-janitor
 *
 * Static analysis and architecture enforcement for Playwright test suites.
 *
 * @example
 * ```typescript
 * import { defineConfig, runAnalysis, createDefaultRunner } from '@n8n/playwright-janitor';
 *
 * const config = defineConfig({
 *   rootDir: __dirname,
 *   fixtureObjectName: 'app',
 *   facade: {
 *     file: 'pages/AppPage.ts',
 *     className: 'AppPage',
 *   },
 * });
 *
 * const report = runAnalysis(config);
 * ```
 */

// ============================================================================
// Configuration
// ============================================================================

export {
	defineConfig,
	getConfig,
	setConfig,
	hasConfig,
	resetConfig,
	defaultConfig,
	type JanitorConfig,
	type DefineConfigInput,
} from './config.js';

// ============================================================================
// Types - Core
// ============================================================================

export type {
	// Severity & identification
	Severity,
	BuiltInRuleId,
	RuleId,
	// Rule configuration
	RuleSettings,
	RuleSettingsMap,
	RuleConfig,
	// Run options
	RunOptions,
	// Violations
	Violation,
	// Fix data (discriminated union)
	FixData,
	MethodFixData,
	PropertyFixData,
	ClassFixData,
	EditFixData,
	// Fix results
	FixAction,
	FixResult,
	// Report
	RuleResult,
	ReportSummary,
	JanitorReport,
	// Rule interface
	Rule,
	// Pattern types
	FilePatterns,
	FacadeConfig,
} from './types.js';

// Type guards for FixData
export { isMethodFix, isPropertyFix, isClassFix, isEditFix } from './types.js';

// ============================================================================
// Types - ts-morph re-exports (for custom rule authors)
// ============================================================================

export type {
	Project,
	SourceFile,
	CallExpression,
	ClassDeclaration,
	MethodDeclaration,
	PropertyDeclaration,
	Node,
} from './types.js';

export { SyntaxKind } from './types.js';

// ============================================================================
// Core
// ============================================================================

export { RuleRunner } from './core/rule-runner.js';
export {
	createProject,
	createInMemoryProject,
	getSourceFiles,
	getRelativePath,
	type ProjectContext,
} from './core/project-loader.js';
export { toJSON, toConsole, printFixResults } from './core/reporter.js';

// ============================================================================
// Rules
// ============================================================================

export {
	BaseRule,
	BoundaryProtectionRule,
	ScopeLockdownRule,
	SelectorPurityRule,
	DeadCodeRule,
	ApiPurityRule,
	NoPageInFlowRule,
	DeduplicationRule,
	TestDataHygieneRule,
} from './rules/index.js';

// ============================================================================
// Utils - AST Helpers
// ============================================================================

export {
	LOCATOR_METHODS,
	PAGE_LEVEL_METHODS,
	hasContainerMember,
	getCallExpressions,
	isLocatorCall,
	isUnscopedPageCall,
	isPageLevelMethod,
	getMethodName,
	getImportPaths,
	isPageImport,
	getTestIdArgument,
	truncateText,
} from './utils/ast-helpers.js';

// ============================================================================
// Utils - Path Helpers
// ============================================================================

export {
	getRootDir,
	resolvePath,
	getRelativePath as getRelativePathFromRoot,
	findFilesRecursive,
	matchesPatterns,
	isExcludedPage,
	isPageFile,
	isComponentFile,
	isFlowFile,
	isTestFile,
} from './utils/paths.js';

// ============================================================================
// TCR (Test && Commit || Revert)
// ============================================================================

export {
	TcrExecutor,
	formatTcrResultConsole,
	formatTcrResultJSON,
	type TcrOptions,
	type TcrResult,
} from './core/tcr-executor.js';

export {
	diffFileMethods,
	formatDiffConsole,
	formatDiffJSON,
	type MethodChange,
	type FileDiffResult,
} from './core/ast-diff-analyzer.js';

export {
	MethodUsageAnalyzer,
	formatMethodImpactConsole,
	formatMethodImpactJSON,
	formatMethodImpactTestList,
	formatMethodUsageIndexConsole,
	formatMethodUsageIndexJSON,
	type MethodUsage,
	type MethodUsageIndex,
	type MethodImpactResult,
} from './core/method-usage-analyzer.js';

export {
	ImpactAnalyzer,
	formatImpactConsole,
	formatImpactJSON,
	formatTestList,
	type ImpactResult,
} from './core/impact-analyzer.js';

export {
	InventoryAnalyzer,
	formatInventoryConsole,
	formatInventoryJSON,
	formatInventoryMarkdown,
	formatListConsole,
	formatDescribeConsole,
	formatTestDataConsole,
	type MethodInfo,
	type ParameterInfo,
	type PropertyInfo,
	type PageInfo,
	type ComponentInfo,
	type ComposableInfo,
	type ServiceInfo,
	type ServiceMethodInfo,
	type FixtureInfo,
	type HelperInfo,
	type FactoryInfo,
	type TestDataInfo,
	type InventoryReport,
} from './core/inventory-analyzer.js';

// ============================================================================
// High-level API
// ============================================================================

import { setConfig, type JanitorConfig } from './config.js';
import { createProject } from './core/project-loader.js';
import { RuleRunner } from './core/rule-runner.js';
import { BoundaryProtectionRule } from './rules/boundary-protection.rule.js';
import { ScopeLockdownRule } from './rules/scope-lockdown.rule.js';
import { SelectorPurityRule } from './rules/selector-purity.rule.js';
import { DeadCodeRule } from './rules/dead-code.rule.js';
import { ApiPurityRule } from './rules/api-purity.rule.js';
import { NoPageInFlowRule } from './rules/no-page-in-flow.rule.js';
import { DeduplicationRule } from './rules/deduplication.rule.js';
import { TestDataHygieneRule } from './rules/test-data-hygiene.rule.js';
import type { JanitorReport, RunOptions } from './types.js';

/**
 * Create a rule runner with all default rules registered.
 *
 * @example
 * ```typescript
 * const runner = createDefaultRunner();
 * runner.disableRule('dead-code');
 * const report = runner.run(project, rootDir);
 * ```
 */
export function createDefaultRunner(): RuleRunner {
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

/**
 * Run analysis with the given configuration.
 * This is the simplest way to run the janitor.
 *
 * @example
 * ```typescript
 * import { runAnalysis, toConsole } from '@n8n/playwright-janitor';
 * import config from './janitor.config.js';
 *
 * const report = runAnalysis(config);
 * toConsole(report);
 *
 * if (report.summary.totalViolations > 0) {
 *   process.exit(1);
 * }
 * ```
 */
export function runAnalysis(config: JanitorConfig, options?: RunOptions): JanitorReport {
	// Set the global config
	setConfig(config);

	// Create project and runner
	const { project, root } = createProject(config.rootDir);
	const runner = createDefaultRunner();

	// Run analysis
	return runner.run(project, root, options);
}
