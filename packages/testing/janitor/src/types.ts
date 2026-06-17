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

export type {
	Severity,
	Violation,
	RuleResult,
	ReportSummary,
	FixData,
} from '@n8n/rules-engine';
export type { Report as JanitorReport } from '@n8n/rules-engine';

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

export type RuleId = string;

export interface RuleSettings {
	enabled?: boolean;
	severity?: 'error' | 'warning' | 'info' | 'off';
	allowPatterns?: RegExp[];
	allowInExpect?: boolean;
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
}

// Janitor-specific fix data narrowing

export interface MethodFixData {
	type: 'method';
	className: string;
	memberName: string;
	[key: string]: unknown;
}

export interface PropertyFixData {
	type: 'property';
	className: string;
	memberName: string;
	[key: string]: unknown;
}

export interface ClassFixData {
	type: 'class';
	className: string;
	[key: string]: unknown;
}

export interface EditFixData {
	type: 'edit';
	replacement: string;
	[key: string]: unknown;
}

export type JanitorFixData = MethodFixData | PropertyFixData | ClassFixData | EditFixData;

export function isMethodFix(data: { type: string }): data is MethodFixData {
	return data.type === 'method';
}

export function isPropertyFix(data: { type: string }): data is PropertyFixData {
	return data.type === 'property';
}

export function isClassFix(data: { type: string }): data is ClassFixData {
	return data.type === 'class';
}

export function isEditFix(data: { type: string }): data is EditFixData {
	return data.type === 'edit';
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
	severity: 'error' | 'warning' | 'info';
	fixable: boolean;
	enabled: boolean;
	targetGlobs: string[];
}
