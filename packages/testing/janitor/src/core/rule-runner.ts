import { performance } from 'node:perf_hooks';

import type {
	JanitorReport,
	RuleResult,
	Severity,
	RunOptions,
	RuleConfig,
	RuleInfo,
	Violation,
} from '../types.js';

/** Context passed to every rule. Rules self-build their scoped project from `rootDir`. */
export interface JanitorRunContext {
	rootDir: string;
	/** Repo-relative changed files, when scoping a run (e.g. TCR). */
	changedFiles?: string[];
}

/** The rule surface the runner depends on — satisfied by `AstRule` subclasses + `getTargetGlobs`. */
export interface RunnableRule {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly severity: Severity;
	readonly fixable: boolean;
	getTargetGlobs(): string[];
	analyze(context: JanitorRunContext): Violation[];
	configure(settings: { options?: Record<string, unknown> }): void;
}

export class RuleRunner {
	private rules: Map<string, RunnableRule> = new Map();
	private enabledRules: Set<string> = new Set();

	registerRule(rule: RunnableRule): void {
		this.rules.set(rule.id, rule);
		this.enabledRules.add(rule.id);
	}

	enableRule(ruleId: string): void {
		if (this.rules.has(ruleId)) this.enabledRules.add(ruleId);
	}

	disableRule(ruleId: string): void {
		this.enabledRules.delete(ruleId);
	}

	enableOnly(ruleIds: string[]): void {
		this.enabledRules.clear();
		for (const id of ruleIds) {
			if (this.rules.has(id)) this.enabledRules.add(id);
		}
	}

	getRegisteredRules(): string[] {
		return Array.from(this.rules.keys());
	}

	isRuleFixable(ruleId: string): boolean {
		return this.rules.get(ruleId)?.fixable ?? false;
	}

	getEnabledRules(): string[] {
		return Array.from(this.enabledRules);
	}

	getDisabledRules(): string[] {
		return Array.from(this.rules.keys()).filter((id) => !this.enabledRules.has(id));
	}

	getRuleDetails(): RuleInfo[] {
		return Array.from(this.rules.values()).map((rule) => this.toRuleInfo(rule));
	}

	getRuleInfo(ruleId: string): RuleInfo | undefined {
		const rule = this.rules.get(ruleId);
		return rule ? this.toRuleInfo(rule) : undefined;
	}

	configureRule(ruleId: string, config: RuleConfig): void {
		this.rules.get(ruleId)?.configure({ options: { ...config } });
	}

	run(context: JanitorRunContext, options?: RunOptions): JanitorReport {
		if (options?.ruleConfig) {
			for (const [ruleId, config] of Object.entries(options.ruleConfig)) {
				this.configureRule(ruleId, config);
			}
		}

		const runContext: JanitorRunContext = { ...context, changedFiles: options?.files };
		const results: RuleResult[] = [];
		for (const ruleId of this.enabledRules) {
			const rule = this.rules.get(ruleId);
			if (rule) results.push(this.execute(rule, runContext));
		}

		return this.buildReport(context.rootDir, results);
	}

	runRule(ruleId: string, context: JanitorRunContext, options?: RunOptions): JanitorReport | null {
		const rule = this.rules.get(ruleId);
		if (!rule) return null;

		if (options?.ruleConfig?.[ruleId]) this.configureRule(ruleId, options.ruleConfig[ruleId]);

		const runContext: JanitorRunContext = { ...context, changedFiles: options?.files };
		return this.buildReport(context.rootDir, [this.execute(rule, runContext)]);
	}

	private execute(rule: RunnableRule, context: JanitorRunContext): RuleResult {
		const start = performance.now();
		const violations = rule.analyze(context);
		const executionTimeMs = Math.round((performance.now() - start) * 100) / 100;

		return {
			rule: rule.id,
			violations,
			filesAnalyzed: 0,
			executionTimeMs,
			fixable: rule.fixable,
		};
	}

	private toRuleInfo(rule: RunnableRule): RuleInfo {
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

	private buildReport(projectRoot: string, results: RuleResult[]): JanitorReport {
		const byRule: Record<string, number> = {};
		const bySeverity: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
		let totalViolations = 0;

		for (const result of results) {
			byRule[result.rule] = result.violations.length;
			totalViolations += result.violations.length;
			for (const violation of result.violations) bySeverity[violation.severity]++;
		}

		return {
			timestamp: new Date().toISOString(),
			projectRoot,
			rules: { enabled: this.getEnabledRules(), disabled: this.getDisabledRules() },
			results,
			summary: { totalViolations, byRule, bySeverity, filesAnalyzed: 0 },
		};
	}
}
