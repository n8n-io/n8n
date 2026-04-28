import * as path from 'node:path';
import type { Project, SourceFile } from 'ts-morph';

import type { BaseRule } from '../rules/base-rule.js';
import type {
	JanitorReport,
	RuleResult,
	Severity,
	RunOptions,
	RuleConfig,
	RuleInfo,
} from '../types.js';
import { getSourceFiles } from './project-loader.js';
import { getConfig } from '../config.js';

export class RuleRunner {
	private rules: Map<string, BaseRule> = new Map();
	private enabledRules: Set<string> = new Set();
	private ruleConfigs: Map<string, RuleConfig> = new Map();

	/**
	 * Register a rule with the runner
	 */
	registerRule(rule: BaseRule): void {
		this.rules.set(rule.id, rule);
		this.enabledRules.add(rule.id);
	}

	/**
	 * Enable a specific rule
	 */
	enableRule(ruleId: string): void {
		if (this.rules.has(ruleId)) {
			this.enabledRules.add(ruleId);
		}
	}

	/**
	 * Disable a specific rule
	 */
	disableRule(ruleId: string): void {
		this.enabledRules.delete(ruleId);
	}

	/**
	 * Enable only specific rules (disable all others)
	 */
	enableOnly(ruleIds: string[]): void {
		this.enabledRules.clear();
		for (const id of ruleIds) {
			if (this.rules.has(id)) {
				this.enabledRules.add(id);
			}
		}
	}

	/**
	 * Get all registered rule IDs
	 */
	getRegisteredRules(): string[] {
		return Array.from(this.rules.keys());
	}

	/**
	 * Check if a rule is fixable
	 */
	isRuleFixable(ruleId: string): boolean {
		return this.rules.get(ruleId)?.fixable ?? false;
	}

	/**
	 * Get enabled rule IDs
	 */
	getEnabledRules(): string[] {
		return Array.from(this.enabledRules);
	}

	/**
	 * Get disabled rule IDs
	 */
	getDisabledRules(): string[] {
		return Array.from(this.rules.keys()).filter((id) => !this.enabledRules.has(id));
	}

	/**
	 * Get detailed information about all registered rules
	 */
	getRuleDetails(): RuleInfo[] {
		return Array.from(this.rules.values()).map((rule) => ({
			id: rule.id,
			name: rule.name,
			description: rule.description,
			severity: rule.severity,
			fixable: rule.fixable,
			enabled: this.enabledRules.has(rule.id),
			targetGlobs: rule.getTargetGlobs(),
		}));
	}

	/**
	 * Get detailed information about a specific rule
	 */
	getRuleInfo(ruleId: string): RuleInfo | undefined {
		const rule = this.rules.get(ruleId);
		if (!rule) return undefined;

		return {
			id: rule.id,
			name: rule.name,
			description: rule.description,
			severity: rule.severity,
			fixable: rule.fixable,
			enabled: this.enabledRules.has(rule.id),
			targetGlobs: rule.getTargetGlobs(),
		};
	}

	/**
	 * Configure a specific rule
	 */
	configureRule(ruleId: string, config: RuleConfig): void {
		this.ruleConfigs.set(ruleId, config);
		const rule = this.rules.get(ruleId);
		if (rule) {
			rule.configure(config);
		}
	}

	/**
	 * Get files for a rule, optionally filtered by specific file paths
	 */
	private getFilesForRule(project: Project, rule: BaseRule, targetFiles?: string[]): SourceFile[] {
		const root = getConfig().rootDir;

		if (targetFiles && targetFiles.length > 0) {
			// Filter to only the specified files that match rule's globs
			const ruleGlobs = rule.getTargetGlobs();
			const allRuleFiles = getSourceFiles(project, ruleGlobs);
			const allRuleFilePaths = new Set(allRuleFiles.map((f) => f.getFilePath()));

			// Resolve target files to absolute paths and filter
			return targetFiles
				.map((f) => {
					const absolutePath = path.isAbsolute(f) ? f : path.join(root, f);
					return project.getSourceFile(absolutePath);
				})
				.filter((f): f is SourceFile => f !== undefined && allRuleFilePaths.has(f.getFilePath()));
		}

		return getSourceFiles(project, rule.getTargetGlobs());
	}

	/**
	 * Run all enabled rules and return results
	 */
	run(project: Project, projectRoot: string, options?: RunOptions): JanitorReport {
		const results: RuleResult[] = [];
		const allFilesAnalyzed = new Set<string>();

		// Apply rule configurations from options
		if (options?.ruleConfig) {
			for (const [ruleId, config] of Object.entries(options.ruleConfig)) {
				this.configureRule(ruleId, config);
			}
		}

		for (const ruleId of this.enabledRules) {
			const rule = this.rules.get(ruleId);
			if (!rule) continue;

			// Get files for this rule (optionally filtered)
			const files = this.getFilesForRule(project, rule, options?.files);

			// Track all files analyzed
			for (const file of files) {
				allFilesAnalyzed.add(file.getFilePath());
			}

			// Execute the rule
			const result = rule.execute(project, files);

			// Apply fixes if in fix mode and rule supports it
			if (options?.fix && rule.fixable) {
				const fixableViolations = result.violations.filter((v) => v.fixable);
				if (fixableViolations.length > 0) {
					result.fixes = rule.fix(project, fixableViolations, options.write ?? false);
				}
			}

			results.push(result);
		}

		// Build summary
		const summary = this.buildSummary(results, allFilesAnalyzed.size);

		return {
			timestamp: new Date().toISOString(),
			projectRoot,
			rules: {
				enabled: this.getEnabledRules(),
				disabled: this.getDisabledRules(),
			},
			results,
			summary,
		};
	}

	/**
	 * Run a specific rule by ID
	 */
	runRule(
		project: Project,
		projectRoot: string,
		ruleId: string,
		options?: RunOptions,
	): JanitorReport | null {
		const rule = this.rules.get(ruleId);
		if (!rule) {
			return null;
		}

		// Apply rule configuration from options
		if (options?.ruleConfig?.[ruleId]) {
			rule.configure(options.ruleConfig[ruleId]);
		}

		const files = this.getFilesForRule(project, rule, options?.files);
		const result = rule.execute(project, files);

		// Apply fixes if in fix mode and rule supports it
		if (options?.fix && rule.fixable) {
			const fixableViolations = result.violations.filter((v) => v.fixable);
			if (fixableViolations.length > 0) {
				result.fixes = rule.fix(project, fixableViolations, options.write ?? false);
			}
		}

		const summary = this.buildSummary([result], files.length);

		return {
			timestamp: new Date().toISOString(),
			projectRoot,
			rules: {
				enabled: [ruleId],
				disabled: this.getRegisteredRules().filter((id) => id !== ruleId),
			},
			results: [result],
			summary,
		};
	}

	private buildSummary(results: RuleResult[], filesAnalyzed: number): JanitorReport['summary'] {
		const byRule: Record<string, number> = {};
		const bySeverity: Record<Severity, number> = {
			error: 0,
			warning: 0,
			info: 0,
		};

		let totalViolations = 0;

		for (const result of results) {
			byRule[result.rule] = result.violations.length;
			totalViolations += result.violations.length;

			for (const violation of result.violations) {
				bySeverity[violation.severity]++;
			}
		}

		return {
			totalViolations,
			byRule,
			bySeverity,
			filesAnalyzed,
		};
	}
}
