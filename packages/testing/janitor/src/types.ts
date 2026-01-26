/**
 * Core Types for @n8n/playwright-janitor
 *
 * This module exports all public types for the janitor.
 * Custom rule authors should import types from the main package entry point.
 */

// Re-export ts-morph types that custom rule authors commonly need
export type {
	Project,
	SourceFile,
	CallExpression,
	ClassDeclaration,
	MethodDeclaration,
	PropertyDeclaration,
	Node,
} from 'ts-morph';
export { SyntaxKind } from 'ts-morph';

// ============================================================================
// Severity & Rule Identification
// ============================================================================

/**
 * Severity level for violations.
 * - `error`: Must be fixed, blocks CI
 * - `warning`: Should be fixed, doesn't block CI
 * - `info`: Informational, typically for suggestions
 */
export type Severity = 'error' | 'warning' | 'info';

/**
 * Built-in rule identifiers.
 * Use these when configuring rules to get type safety.
 */
export type BuiltInRuleId =
	| 'boundary-protection'
	| 'scope-lockdown'
	| 'selector-purity'
	| 'no-page-in-flow'
	| 'api-purity'
	| 'dead-code'
	| 'deduplication'
	| 'test-data-hygiene';

/**
 * Rule identifier - can be a built-in rule or a custom rule ID
 */
export type RuleId = BuiltInRuleId | (string & {});

// ============================================================================
// Rule Configuration
// ============================================================================

/**
 * Configuration for an individual rule
 */
export interface RuleSettings {
	/** Set to false to disable the rule entirely */
	enabled?: boolean;
	/** Override the default severity ('off' also disables the rule) */
	severity?: Severity | 'off';
	/** Patterns to allow (matching text won't be flagged) */
	allowPatterns?: RegExp[];
}

/**
 * Rule-specific runtime options (passed during analysis)
 */
export interface RuleConfig {
	/** selector-purity: Skip violations inside expect() calls */
	allowInExpect?: boolean;
	/** scope-lockdown: Method name indicating a standalone page (default: 'goto') */
	navigationMethod?: string;
}

/**
 * Map of rule IDs to their settings
 */
export type RuleSettingsMap = {
	[K in RuleId]?: RuleSettings;
};

// ============================================================================
// Run Options
// ============================================================================

/**
 * Options for running the janitor
 */
export interface RunOptions {
	/** Target specific files instead of using rule globs */
	files?: string[];
	/** Rule-specific configuration */
	ruleConfig?: Record<string, RuleConfig>;
	/** Run in fix mode (apply auto-fixes) */
	fix?: boolean;
	/** Actually write fixes to disk (requires fix=true) */
	write?: boolean;
}

// ============================================================================
// Violations
// ============================================================================

/**
 * A single violation found by a rule
 */
export interface Violation {
	/** Absolute path to the file containing the violation */
	file: string;
	/** Line number (1-indexed) */
	line: number;
	/** Column number (0-indexed from start of line) */
	column: number;
	/** ID of the rule that found this violation */
	rule: string;
	/** Human-readable description of the violation */
	message: string;
	/** Severity level */
	severity: Severity;
	/** Optional suggestion for how to fix */
	suggestion?: string;
	/** Whether this violation can be auto-fixed */
	fixable?: boolean;
	/** Metadata for applying the fix (rule-specific) */
	fixData?: FixData;
}

// ============================================================================
// Fix Data (Discriminated Union)
// ============================================================================

/**
 * Fix data for removing a class method
 */
export interface MethodFixData {
	type: 'method';
	className: string;
	memberName: string;
}

/**
 * Fix data for removing a class property
 */
export interface PropertyFixData {
	type: 'property';
	className: string;
	memberName: string;
}

/**
 * Fix data for removing an entire class
 */
export interface ClassFixData {
	type: 'class';
	className: string;
}

/**
 * Fix data for a text replacement
 */
export interface EditFixData {
	type: 'edit';
	replacement: string;
}

/**
 * Discriminated union for fix metadata.
 * The `type` field determines which fix operation to apply.
 */
export type FixData = MethodFixData | PropertyFixData | ClassFixData | EditFixData;

/**
 * Type guard for method fix data
 */
export function isMethodFix(data: FixData): data is MethodFixData {
	return data.type === 'method';
}

/**
 * Type guard for property fix data
 */
export function isPropertyFix(data: FixData): data is PropertyFixData {
	return data.type === 'property';
}

/**
 * Type guard for class fix data
 */
export function isClassFix(data: FixData): data is ClassFixData {
	return data.type === 'class';
}

/**
 * Type guard for edit fix data
 */
export function isEditFix(data: FixData): data is EditFixData {
	return data.type === 'edit';
}

// ============================================================================
// Fix Results
// ============================================================================

/**
 * Action taken to fix a violation
 */
export type FixAction = 'remove-method' | 'remove-property' | 'remove-file' | 'edit';

/**
 * Result of applying a fix
 */
export interface FixResult {
	/** File that was modified */
	file: string;
	/** Type of fix action taken */
	action: FixAction;
	/** Target of the fix (method name, property name, etc.) */
	target?: string;
	/** Whether the fix was successfully applied */
	applied: boolean;
}

// ============================================================================
// Rule Results & Report
// ============================================================================

/**
 * Result from running a single rule
 */
export interface RuleResult {
	/** ID of the rule */
	rule: string;
	/** Violations found by this rule */
	violations: Violation[];
	/** Number of files analyzed by this rule */
	filesAnalyzed: number;
	/** Time taken to run the rule in milliseconds */
	executionTimeMs: number;
	/** Whether this rule supports auto-fixing */
	fixable?: boolean;
	/** Results of fix operations (only populated in fix mode) */
	fixes?: FixResult[];
}

/**
 * Summary statistics for a janitor run
 */
export interface ReportSummary {
	/** Total number of violations across all rules */
	totalViolations: number;
	/** Violation count by rule ID */
	byRule: Record<string, number>;
	/** Violation count by severity */
	bySeverity: Record<Severity, number>;
	/** Total unique files analyzed */
	filesAnalyzed: number;
}

/**
 * Complete report from a janitor run
 */
export interface JanitorReport {
	/** ISO timestamp of when the analysis was run */
	timestamp: string;
	/** Root directory that was analyzed */
	projectRoot: string;
	/** Which rules were enabled/disabled */
	rules: {
		enabled: string[];
		disabled: string[];
	};
	/** Results from each rule */
	results: RuleResult[];
	/** Summary statistics */
	summary: ReportSummary;
}

// ============================================================================
// Rule Interface (for custom rules)
// ============================================================================

import type { Project, SourceFile } from 'ts-morph';

/**
 * Interface that all rules must implement.
 * Extend BaseRule instead of implementing this directly.
 */
export interface Rule {
	/** Unique identifier for the rule (kebab-case) */
	readonly id: string;
	/** Human-readable name */
	readonly name: string;
	/** Description of what the rule checks */
	readonly description: string;
	/** Default severity */
	readonly severity: Severity;
	/** Whether this rule supports auto-fixing */
	readonly fixable: boolean;

	/**
	 * Get glob patterns for files this rule should analyze.
	 * Patterns are relative to the project root.
	 */
	getTargetGlobs(): string[];

	/**
	 * Analyze files and return violations.
	 * @param project - ts-morph Project for AST analysis
	 * @param files - Source files matching the target globs
	 */
	analyze(project: Project, files: SourceFile[]): Violation[];

	/**
	 * Apply fixes for violations (optional, only for fixable rules).
	 * @param project - ts-morph Project
	 * @param violations - Violations to fix
	 * @param write - Whether to write changes to disk
	 */
	fix?(project: Project, violations: Violation[], write: boolean): FixResult[];

	/**
	 * Check if this rule is enabled based on config
	 */
	isEnabled(): boolean;

	/**
	 * Get the effective severity (may be overridden by config)
	 */
	getEffectiveSeverity(): Severity;

	/**
	 * Configure the rule with options
	 */
	configure(config: RuleConfig): void;

	/**
	 * Execute the rule with timing instrumentation
	 */
	execute(project: Project, files: SourceFile[]): RuleResult;
}

// ============================================================================
// Pattern Types
// ============================================================================

/**
 * Glob patterns for different file categories in the test suite
 */
export interface FilePatterns {
	/** Page object files (e.g., 'pages/**\/*.ts') */
	pages: string[];
	/** Component files (e.g., 'pages/components/**\/*.ts') */
	components: string[];
	/** Flow/composable files (e.g., 'composables/**\/*.ts') */
	flows: string[];
	/** Test spec files (e.g., 'tests/**\/*.spec.ts') */
	tests: string[];
	/** API service files (e.g., 'services/**\/*.ts') */
	services: string[];
	/** Fixture files (e.g., 'fixtures/**\/*.ts') */
	fixtures: string[];
	/** Helper/utility files (e.g., 'helpers/**\/*.ts') */
	helpers: string[];
	/** Factory files (e.g., 'factories/**\/*.ts') */
	factories: string[];
	/** Static test data files (e.g., 'workflows/**\/*') */
	testData: string[];
}

/**
 * Configuration for the page object facade
 */
export interface FacadeConfig {
	/** Path to facade file relative to rootDir */
	file: string;
	/** Class name of the facade */
	className: string;
	/** Types to exclude from fixture type mapping */
	excludeTypes: string[];
}
