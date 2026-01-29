/**
 * Core Types for @n8n/playwright-janitor
 */

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

export type Severity = 'error' | 'warning' | 'info';

export type BuiltInRuleId =
	| 'boundary-protection'
	| 'scope-lockdown'
	| 'selector-purity'
	| 'no-page-in-flow'
	| 'api-purity'
	| 'dead-code'
	| 'deduplication'
	| 'test-data-hygiene'
	| 'duplicate-logic'
	| 'no-direct-page-instantiation';

// Allow any string for custom rules, while BuiltInRuleId provides type-safe hints for built-in rules
export type RuleId = string;

export interface RuleSettings {
	enabled?: boolean;
	severity?: Severity | 'off';
	allowPatterns?: RegExp[];
	allowInExpect?: boolean;
	/** Method names that indicate a standalone/top-level page (for scope-lockdown rule) */
	navigationMethods?: string[];
}

export interface RuleConfig {
	allowInExpect?: boolean;
	navigationMethod?: string;
}

export type RuleSettingsMap = {
	[K in RuleId]?: RuleSettings;
};

export interface RunOptions {
	files?: string[];
	ruleConfig?: Record<string, RuleConfig>;
	fix?: boolean;
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
	fixable?: boolean;
	fixData?: FixData;
}

export interface MethodFixData {
	type: 'method';
	className: string;
	memberName: string;
}

export interface PropertyFixData {
	type: 'property';
	className: string;
	memberName: string;
}

export interface ClassFixData {
	type: 'class';
	className: string;
}

export interface EditFixData {
	type: 'edit';
	replacement: string;
}

export type FixData = MethodFixData | PropertyFixData | ClassFixData | EditFixData;

export function isMethodFix(data: FixData): data is MethodFixData {
	return data.type === 'method';
}

export function isPropertyFix(data: FixData): data is PropertyFixData {
	return data.type === 'property';
}

export function isClassFix(data: FixData): data is ClassFixData {
	return data.type === 'class';
}

export function isEditFix(data: FixData): data is EditFixData {
	return data.type === 'edit';
}

export type FixAction = 'remove-method' | 'remove-property' | 'remove-file' | 'edit';

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

export interface JanitorReport {
	timestamp: string;
	projectRoot: string;
	rules: {
		enabled: string[];
		disabled: string[];
	};
	results: RuleResult[];
	summary: ReportSummary;
}

import type { Project, SourceFile } from 'ts-morph';

export interface Rule {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly severity: Severity;
	readonly fixable: boolean;

	getTargetGlobs(): string[];
	analyze(project: Project, files: SourceFile[]): Violation[];
	fix?(project: Project, violations: Violation[], write: boolean): FixResult[];
	isEnabled(): boolean;
	getEffectiveSeverity(): Severity;
	configure(config: RuleConfig): void;
	execute(project: Project, files: SourceFile[]): RuleResult;
}

export interface FilePatterns {
	pages: string[];
	components: string[];
	flows: string[];
	tests: string[];
	services: string[];
	fixtures: string[];
	helpers: string[];
	factories: string[];
	testData: string[];
}

export interface FacadeConfig {
	file: string;
	className: string;
	excludeTypes: string[];
}

export interface RuleInfo {
	id: string;
	name: string;
	description: string;
	severity: Severity;
	fixable: boolean;
	enabled: boolean;
	targetGlobs: string[];
}
