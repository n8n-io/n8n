export type Severity = 'error' | 'warning' | 'info';

/**
 * Rule-specific configuration options
 */
export interface RuleConfig {
	/** selector-purity: Skip violations inside expect() calls */
	allowInExpect?: boolean;
}

/**
 * Options for running the janitor
 */
export interface RunOptions {
	/** Target specific files instead of using rule globs */
	files?: string[];
	/** Rule-specific configuration */
	ruleConfig?: Record<string, RuleConfig>;
}

export interface Violation {
	file: string;
	line: number;
	column: number;
	rule: string;
	message: string;
	severity: Severity;
	suggestion?: string;
}

export interface RuleResult {
	rule: string;
	violations: Violation[];
	filesAnalyzed: number;
	executionTimeMs: number;
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
