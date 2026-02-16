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

export type {
	Severity,
	BuiltInRuleId,
	RuleId,
	RuleSettings,
	RuleSettingsMap,
	RuleConfig,
	RunOptions,
	Violation,
	FixData,
	MethodFixData,
	PropertyFixData,
	ClassFixData,
	EditFixData,
	FixAction,
	FixResult,
	RuleResult,
	ReportSummary,
	JanitorReport,
	Rule,
	RuleInfo,
	FilePatterns,
	FacadeConfig,
} from './types.js';

export { isMethodFix, isPropertyFix, isClassFix, isEditFix } from './types.js';

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

export { RuleRunner } from './core/rule-runner.js';
export { FacadeResolver, extractTypeName, type FacadeMapping } from './core/facade-resolver.js';
export {
	createProject,
	createInMemoryProject,
	getSourceFiles,
	getRelativePath,
	type ProjectContext,
} from './core/project-loader.js';
export { toJSON, toConsole, printFixResults } from './core/reporter.js';

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
	DuplicateLogicRule,
	NoDirectPageInstantiationRule,
} from './rules/index.js';

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

export {
	TcrExecutor,
	formatTcrResultConsole,
	formatTcrResultJSON,
	type TcrOptions,
	type TcrResult,
} from './core/tcr-executor.js';

export {
	resolveTestCommand,
	buildTestCommand,
	type ResolvedCommand,
} from './utils/test-command.js';

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
	formatInventoryJSON,
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
	type FacadeInfo,
	type FacadePropertyInfo,
	type InventoryReport,
} from './core/inventory-analyzer.js';

export {
	generateBaseline,
	saveBaseline,
	loadBaseline,
	hasBaseline,
	filterNewViolations,
	filterReportByBaseline,
	formatBaselineInfo,
	getBaselinePath,
	type BaselineEntry,
	type BaselineFile,
} from './core/baseline.js';

import { setConfig, type JanitorConfig } from './config.js';
import { createProject } from './core/project-loader.js';
import { RuleRunner } from './core/rule-runner.js';
import { ApiPurityRule } from './rules/api-purity.rule.js';
import { BoundaryProtectionRule } from './rules/boundary-protection.rule.js';
import { DeadCodeRule } from './rules/dead-code.rule.js';
import { DeduplicationRule } from './rules/deduplication.rule.js';
import { DuplicateLogicRule } from './rules/duplicate-logic.rule.js';
import { NoDirectPageInstantiationRule } from './rules/no-direct-page-instantiation.rule.js';
import { NoPageInFlowRule } from './rules/no-page-in-flow.rule.js';
import { ScopeLockdownRule } from './rules/scope-lockdown.rule.js';
import { SelectorPurityRule } from './rules/selector-purity.rule.js';
import { TestDataHygieneRule } from './rules/test-data-hygiene.rule.js';
import type { JanitorReport, RunOptions } from './types.js';

export function createDefaultRunner(): RuleRunner {
	const runner = new RuleRunner();
	runner.registerRule(new BoundaryProtectionRule());
	runner.registerRule(new ScopeLockdownRule());
	runner.registerRule(new SelectorPurityRule());
	runner.registerRule(new NoPageInFlowRule());
	runner.registerRule(new ApiPurityRule());
	runner.registerRule(new DeadCodeRule());
	runner.registerRule(new DeduplicationRule());
	runner.registerRule(new TestDataHygieneRule());
	runner.registerRule(new DuplicateLogicRule());
	runner.registerRule(new NoDirectPageInstantiationRule());
	return runner;
}

export function runAnalysis(config: JanitorConfig, options?: RunOptions): JanitorReport {
	setConfig(config);
	const { project, root } = createProject(config.rootDir);
	const runner = createDefaultRunner();
	return runner.run(project, root, options);
}
