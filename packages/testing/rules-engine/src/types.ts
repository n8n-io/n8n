export type Severity = 'error' | 'warning' | 'info';

export interface RuleSettings {
	enabled?: boolean;
	severity?: Severity | 'off';
	options?: Record<string, unknown>;
}

export type RuleSettingsMap = Record<string, RuleSettings | undefined>;

export interface FixData {
	type: string;
	[key: string]: unknown;
}

export interface Violation {
	file: string;
	line: number;
	column: number;
	rule: string;
	message: string;
	severity: Severity;
	suggestion?: string;
	fixable?: boolean;
	fixData?: FixData;
}

export type FixAction = string;

export interface FixResult {
	file: string;
	action: FixAction;
	target?: string;
	applied: boolean;
}

export interface RuleResult {
	rule: string;
	violations: Violation[];
	filesAnalyzed: number;
	executionTimeMs: number;
	fixable?: boolean;
	fixes?: FixResult[];
}

export interface ReportSummary {
	totalViolations: number;
	byRule: Record<string, number>;
	bySeverity: Record<Severity, number>;
	filesAnalyzed: number;
}

export interface Report {
	timestamp: string;
	projectRoot: string;
	rules: {
		enabled: string[];
		disabled: string[];
	};
	results: RuleResult[];
	summary: ReportSummary;
}

export interface RuleInfo {
	id: string;
	name: string;
	description: string;
	severity: Severity;
	enabled: boolean;
	fixable?: boolean;
}
