import type { BaseRule } from './base-rule.js';
import type { Report, RuleResult, Severity, RuleInfo, RuleSettingsMap } from './types.js';

export interface RunOptions {
	fix?: boolean;
}

export class RuleRunner<TContext = unknown> {
	private rules: Map<string, BaseRule<TContext>> = new Map();
	private enabledRules: Set<string> = new Set();

	registerRule(rule: BaseRule<TContext>): void {
		this.rules.set(rule.id, rule);
		this.enabledRules.add(rule.id);
	}

	applySettings(settings: RuleSettingsMap): void {
		for (const [ruleId, ruleSettings] of Object.entries(settings)) {
			const rule = this.rules.get(ruleId);
			if (rule && ruleSettings) {
				rule.configure(ruleSettings);
				if (ruleSettings.enabled === false || ruleSettings.severity === 'off') {
					this.enabledRules.delete(ruleId);
				}
			}
		}
	}

	enableOnly(ruleIds: string[]): void {
		this.enabledRules.clear();
		for (const id of ruleIds) {
			if (this.rules.has(id)) {
				this.enabledRules.add(id);
			}
		}
	}

	getEnabledRules(): string[] {
		return Array.from(this.enabledRules);
	}

	getDisabledRules(): string[] {
		return Array.from(this.rules.keys()).filter((id) => !this.enabledRules.has(id));
	}

	getRuleDetails(): RuleInfo[] {
		return Array.from(this.rules.values()).map((rule) => ({
			id: rule.id,
			name: rule.name,
			description: rule.description,
			severity: rule.severity,
			enabled: this.enabledRules.has(rule.id),
			fixable: rule.fixable,
		}));
	}

	isRuleFixable(ruleId: string): boolean {
		return this.rules.get(ruleId)?.fixable ?? false;
	}

	async run(context: TContext, projectRoot: string, options?: RunOptions): Promise<Report> {
		const results: RuleResult[] = [];

		for (const ruleId of this.enabledRules) {
			const rule = this.rules.get(ruleId);
			if (!rule) continue;

			const result = await rule.execute(context);
			this.applyFixes(rule, result, context, options);
			results.push(result);
		}

		return {
			timestamp: new Date().toISOString(),
			projectRoot,
			rules: {
				enabled: this.getEnabledRules(),
				disabled: this.getDisabledRules(),
			},
			results,
			summary: this.buildSummary(results),
		};
	}

	async runRule(
		ruleId: string,
		context: TContext,
		projectRoot: string,
		options?: RunOptions,
	): Promise<Report | null> {
		const rule = this.rules.get(ruleId);
		if (!rule) return null;

		const result = await rule.execute(context);
		this.applyFixes(rule, result, context, options);

		return {
			timestamp: new Date().toISOString(),
			projectRoot,
			rules: {
				enabled: [ruleId],
				disabled: Array.from(this.rules.keys()).filter((id) => id !== ruleId),
			},
			results: [result],
			summary: this.buildSummary([result]),
		};
	}

	private applyFixes(
		rule: BaseRule<TContext>,
		result: RuleResult,
		context: TContext,
		options?: RunOptions,
	): void {
		if (options?.fix && rule.fixable) {
			const fixable = result.violations.filter((v) => v.fixable);
			if (fixable.length > 0) {
				result.fixes = rule.fix(context, fixable);
			}
		}
	}

	private buildSummary(results: RuleResult[]): Report['summary'] {
		const byRule: Record<string, number> = {};
		const bySeverity: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
		let totalViolations = 0;
		let filesAnalyzed = 0;

		for (const result of results) {
			byRule[result.rule] = result.violations.length;
			totalViolations += result.violations.length;
			filesAnalyzed += result.filesAnalyzed;

			for (const violation of result.violations) {
				bySeverity[violation.severity]++;
			}
		}

		return { totalViolations, byRule, bySeverity, filesAnalyzed };
	}
}
