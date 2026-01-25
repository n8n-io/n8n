export type Severity = 'error' | 'warning' | 'info';

/**
 * Rule-specific configuration options
 */
export interface RuleConfig {
	/** selector-purity: Skip violations inside expect() calls */
	allowInExpect?: boolean;
	/** scope-lockdown: Method name indicating a standalone page (default: 'goto') */
	navigationMethod?: string;
}

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

export interface Violation {
	file: string;
	line: number;
	column: number;
	rule: string;
	message: string;
	severity: Severity;
	suggestion?: string;
	/** Whether this violation can be auto-fixed */
	fixable?: boolean;
	/** Metadata for applying the fix (rule-specific) */
	fixData?: Record<string, unknown>;
}

export interface FixResult {
	file: string;
	action: 'remove-method' | 'remove-property' | 'remove-file' | 'edit';
	target?: string;
	applied: boolean;
}

export interface RuleResult {
	rule: string;
	violations: Violation[];
	filesAnalyzed: number;
	executionTimeMs: number;
	/** Whether this rule supports auto-fixing */
	fixable?: boolean;
	/** Results of fix operations (only populated in fix mode) */
	fixes?: FixResult[];
}

export interface JanitorReport {
	timestamp: string;
	projectRoot: string;
	rules: { enabled: string[]; disabled: string[] };
	results: RuleResult[];
	summary: {
		totalViolations: number;
		byRule: Record<string, number>;
		bySeverity: Record<Severity, number>;
		filesAnalyzed: number;
	};
}
